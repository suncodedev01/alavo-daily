use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::Goal;

use super::rows::{money_value, query_one, query_rows, Stamp};

pub fn list_goals(db: &dyn Database) -> Result<Vec<Goal>, EngineError> {
    let sql = r#"
        SELECT id, name, icon, target_vnd, saved_vnd, due_on
        FROM spending_goals
        WHERE deleted_at IS NULL
        ORDER BY created_at, rowid
    "#;
    query_rows(db, sql, &[], goal_from_row)
}

pub fn find_goal(db: &dyn Database, id: &str) -> Result<Option<Goal>, EngineError> {
    let sql = r#"
        SELECT id, name, icon, target_vnd, saved_vnd, due_on
        FROM spending_goals
        WHERE id = ? AND deleted_at IS NULL
    "#;
    query_one(db, sql, &[Value::from(id)], goal_from_row)
}

pub fn insert_goal(
    db: &dyn Database,
    goal: &Goal,
    created_at: i64,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_goals
            (id, name, icon, target_vnd, saved_vnd, due_on, created_at,
             updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(goal.id.as_str()),
        Value::from(goal.name.as_str()),
        Value::from(goal.icon.as_str()),
        money_value(goal.target_vnd),
        money_value(goal.saved_vnd),
        Value::from(goal.due_on.as_deref()),
        Value::from(created_at),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_goal(db: &dyn Database, goal: &Goal, stamp: &Stamp) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_goals
        SET name = ?, icon = ?, target_vnd = ?, saved_vnd = ?, due_on = ?,
            updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(goal.name.as_str()),
        Value::from(goal.icon.as_str()),
        money_value(goal.target_vnd),
        money_value(goal.saved_vnd),
        Value::from(goal.due_on.as_deref()),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(goal.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

fn goal_from_row(row: &Row) -> Result<Goal, EngineError> {
    Ok(Goal {
        id: row.text("id")?,
        name: row.text("name")?,
        icon: row.text("icon")?,
        target_vnd: Money(row.int("target_vnd")?),
        saved_vnd: Money(row.int("saved_vnd")?),
        due_on: row.opt_text("due_on")?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    fn stamp() -> Stamp {
        Stamp { updated_at: 9, field_updated_at: "{}".to_string() }
    }

    fn goal(id: &str) -> Goal {
        Goal {
            id: id.into(),
            name: "Du lịch Đà Lạt".into(),
            icon: "calendar-blank".into(),
            target_vnd: Money(15_000_000),
            saved_vnd: Money(9_200_000),
            due_on: Some("2026-12-20".into()),
        }
    }

    #[test]
    fn insert_then_find_round_trips_every_field() {
        let db = migrated_memory_db();
        insert_goal(&db, &goal("g1"), 1, &stamp()).unwrap();
        assert_eq!(find_goal(&db, "g1").unwrap(), Some(goal("g1")));
    }

    #[test]
    fn list_keeps_creation_order_and_hides_deleted_goals() {
        let db = migrated_memory_db();
        insert_goal(&db, &goal("second"), 2, &stamp()).unwrap();
        insert_goal(&db, &goal("first"), 1, &stamp()).unwrap();
        insert_goal(&db, &goal("gone"), 3, &stamp()).unwrap();
        db.execute("UPDATE spending_goals SET deleted_at = 1 WHERE id = 'gone'", &[]).unwrap();
        let ids: Vec<String> = list_goals(&db).unwrap().into_iter().map(|goal| goal.id).collect();
        assert_eq!(ids, vec!["first", "second"]);
        assert_eq!(find_goal(&db, "gone").unwrap(), None);
    }

    #[test]
    fn update_rewrites_the_editable_columns_and_can_clear_the_date() {
        let db = migrated_memory_db();
        insert_goal(&db, &goal("g1"), 1, &stamp()).unwrap();
        let edited = Goal { saved_vnd: Money(1), due_on: None, name: "Mới".into(), ..goal("g1") };
        update_goal(&db, &edited, &stamp()).unwrap();
        assert_eq!(find_goal(&db, "g1").unwrap(), Some(edited));
    }
}
