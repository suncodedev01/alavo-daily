use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{ContributeGoal, Entity, Goal, NewGoal, UpdateGoal};
use alavo_infrastructure::persistence::repositories::spending::goals::{
    find_goal, insert_goal, list_goals, update_goal,
};

use crate::context::Ctx;
use crate::spending::writes::{delete_row, log_insert, log_update, stamp_insert, stamp_update};

const SAVED_COLUMN: &[&str] = &["saved_vnd"];

pub fn list(ctx: &Ctx) -> Result<Vec<Goal>, EngineError> {
    list_goals(ctx.db)
}

pub fn create(ctx: &Ctx, input: NewGoal) -> Result<Goal, EngineError> {
    ctx.transaction(|| {
        let goal = Goal::from_new(ctx.new_id(), input)?;
        let stamp = stamp_insert(ctx, Entity::Goal);
        insert_goal(ctx.db, &goal, ctx.now_ms(), &stamp)?;
        log_insert(ctx, Entity::Goal, &goal.id)?;
        Ok(goal)
    })
}

pub fn update(ctx: &Ctx, input: UpdateGoal) -> Result<Goal, EngineError> {
    ctx.transaction(|| {
        let current = require(ctx, &input.id)?;
        let columns = input.changed_columns();
        let goal = current.apply(input)?;
        save_changed(ctx, &goal, &columns)?;
        Ok(goal)
    })
}

pub fn contribute(ctx: &Ctx, input: ContributeGoal) -> Result<Goal, EngineError> {
    ctx.transaction(|| {
        let goal = require(ctx, &input.id)?.contribute(input.amount_vnd)?;
        save_changed(ctx, &goal, SAVED_COLUMN)?;
        Ok(goal)
    })
}

pub fn delete(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    ctx.transaction(|| delete_row(ctx, Entity::Goal, id))
}

fn require(ctx: &Ctx, id: &str) -> Result<Goal, EngineError> {
    find_goal(ctx.db, id)?.ok_or_else(|| EngineError::not_found("goal", id))
}

fn save_changed(ctx: &Ctx, goal: &Goal, columns: &[&str]) -> Result<(), EngineError> {
    let stamp = stamp_update(ctx, Entity::Goal, &goal.id, columns)?;
    update_goal(ctx.db, goal, &stamp)?;
    log_update(ctx, Entity::Goal, &goal.id, columns)
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::error::ErrorCode;
    use alavo_domain::shared::money::Money;

    use crate::spending::test_support::Fixture;

    use super::*;

    fn new_goal(name: &str, target: i64) -> NewGoal {
        NewGoal {
            name: name.into(),
            icon: "piggy-bank".into(),
            target_vnd: Money(target),
            saved_vnd: None,
            due_on: None,
        }
    }

    fn change(id: &str) -> UpdateGoal {
        UpdateGoal { id: id.into(), name: None, icon: None, target_vnd: None, due_on: None }
    }

    fn created(fixture: &Fixture) -> Goal {
        create(&fixture.ctx(), new_goal("Quỹ khẩn cấp", 60_000_000)).unwrap()
    }

    #[test]
    fn create_starts_empty_by_default_and_logs_an_insert() {
        let fixture = Fixture::new();
        let goal = created(&fixture);
        assert_eq!(goal.saved_vnd, Money(0));
        assert_eq!(goal.due_on, None);
        assert_eq!(list(&fixture.ctx()).unwrap(), vec![goal.clone()]);
        let events = fixture.events("goal");
        assert_eq!(events[0].action, "insert");
        assert_eq!(events[0].payload["target_vnd"], 60_000_000);
    }

    #[test]
    fn create_accepts_an_initial_saved_amount_and_a_due_date() {
        let fixture = Fixture::new();
        let input = NewGoal {
            saved_vnd: Some(Money(9_200_000)),
            due_on: Some("2026-12-20".into()),
            ..new_goal("Đà Lạt", 15_000_000)
        };
        let goal = create(&fixture.ctx(), input).unwrap();
        assert_eq!(goal.saved_vnd, Money(9_200_000));
        assert_eq!(goal.due_on.as_deref(), Some("2026-12-20"));
    }

    #[test]
    fn create_rejects_bad_input_without_writing() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let bad = [
            new_goal(" ", 1_000),
            new_goal("x", 0),
            NewGoal { saved_vnd: Some(Money(-1)), ..new_goal("x", 1_000) },
            NewGoal { due_on: Some("2026-02-30".into()), ..new_goal("x", 1_000) },
        ];
        for input in bad {
            assert_eq!(create(&ctx, input).unwrap_err().code, ErrorCode::Validation);
        }
        assert!(fixture.events("goal").is_empty());
        assert!(list(&ctx).unwrap().is_empty());
    }

    #[test]
    fn goals_list_in_creation_order() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        create(&ctx, new_goal("first", 1)).unwrap();
        fixture.advance(5);
        create(&ctx, new_goal("second", 1)).unwrap();
        let names: Vec<String> = list(&ctx).unwrap().into_iter().map(|goal| goal.name).collect();
        assert_eq!(names, vec!["first", "second"]);
    }

    #[test]
    fn update_changes_given_fields_and_can_clear_the_due_date() {
        let fixture = Fixture::new();
        let goal = created(&fixture);
        let ctx = fixture.ctx();
        let dated = UpdateGoal {
            name: Some("Quỹ dự phòng".into()),
            due_on: Some(Some("2027-01-31".into())),
            ..change(&goal.id)
        };
        let dated = update(&ctx, dated).unwrap();
        assert_eq!(
            (dated.name.as_str(), dated.due_on.as_deref()),
            ("Quỹ dự phòng", Some("2027-01-31"))
        );
        assert_eq!(dated.target_vnd, Money(60_000_000));
        let cleared = update(&ctx, UpdateGoal { due_on: Some(None), ..change(&goal.id) }).unwrap();
        assert_eq!(cleared.due_on, None);
        let events = fixture.events("goal");
        assert_eq!(events[1].changed_fields, r#"["name","due_on"]"#);
    }

    #[test]
    fn update_rejects_invalid_values_and_unknown_ids() {
        let fixture = Fixture::new();
        let goal = created(&fixture);
        let ctx = fixture.ctx();
        let zero_target = UpdateGoal { target_vnd: Some(Money(0)), ..change(&goal.id) };
        assert_eq!(update(&ctx, zero_target).unwrap_err().code, ErrorCode::Validation);
        assert_eq!(update(&ctx, change("nope")).unwrap_err().code, ErrorCode::NotFound);
    }

    #[test]
    fn contribute_adds_to_the_saved_amount_each_time() {
        let fixture = Fixture::new();
        let goal = created(&fixture);
        let ctx = fixture.ctx();
        let first =
            contribute(&ctx, ContributeGoal { id: goal.id.clone(), amount_vnd: Money(1_000_000) })
                .unwrap();
        assert_eq!(first.saved_vnd, Money(1_000_000));
        let second =
            contribute(&ctx, ContributeGoal { id: goal.id.clone(), amount_vnd: Money(500_000) })
                .unwrap();
        assert_eq!(second.saved_vnd, Money(1_500_000));
        assert_eq!(list(&ctx).unwrap()[0].saved_vnd, Money(1_500_000));
        let events = fixture.events("goal");
        assert_eq!(events[2].changed_fields, r#"["saved_vnd"]"#);
        assert_eq!(events[2].payload["saved_vnd"], 1_500_000);
    }

    #[test]
    fn contribute_rejects_zero_and_negative_amounts_and_unknown_goals() {
        let fixture = Fixture::new();
        let goal = created(&fixture);
        let ctx = fixture.ctx();
        for amount in [0, -100] {
            let input = ContributeGoal { id: goal.id.clone(), amount_vnd: Money(amount) };
            assert_eq!(contribute(&ctx, input).unwrap_err().code, ErrorCode::Validation);
        }
        let unknown = ContributeGoal { id: "nope".into(), amount_vnd: Money(5) };
        assert_eq!(contribute(&ctx, unknown).unwrap_err().code, ErrorCode::NotFound);
        assert_eq!(list(&ctx).unwrap()[0].saved_vnd, Money(0));
    }

    #[test]
    fn delete_hides_the_goal_and_logs_a_delete_event() {
        let fixture = Fixture::new();
        let goal = created(&fixture);
        let ctx = fixture.ctx();
        delete(&ctx, &goal.id).unwrap();
        assert!(list(&ctx).unwrap().is_empty());
        assert_eq!(fixture.events("goal")[1].action, "delete");
        assert_eq!(delete(&ctx, &goal.id).unwrap_err().code, ErrorCode::NotFound);
        let update_after = update(&ctx, change(&goal.id));
        assert_eq!(update_after.unwrap_err().code, ErrorCode::NotFound);
    }
}
