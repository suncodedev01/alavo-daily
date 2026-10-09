use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{Bill, Entity, SaveBill};
use alavo_infrastructure::persistence::repositories::spending::bills::{
    find_bill, insert_bill, list_bills, update_bill,
};

use crate::context::Ctx;
use crate::spending::writes::{delete_row, log_insert, log_update, stamp_insert, stamp_update};

pub fn list(ctx: &Ctx) -> Result<Vec<Bill>, EngineError> {
    list_bills(ctx.db)
}

pub fn save(ctx: &Ctx, input: SaveBill) -> Result<Bill, EngineError> {
    ctx.transaction(|| match input.id.clone() {
        None => insert(ctx, input),
        Some(id) => replace(ctx, &id, input),
    })
}

pub fn delete(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    ctx.transaction(|| delete_row(ctx, Entity::Bill, id))
}

fn insert(ctx: &Ctx, input: SaveBill) -> Result<Bill, EngineError> {
    let bill = input.into_bill(ctx.new_id(), true)?;
    let stamp = stamp_insert(ctx, Entity::Bill);
    insert_bill(ctx.db, &bill, ctx.now_ms(), &stamp)?;
    log_insert(ctx, Entity::Bill, &bill.id)?;
    Ok(bill)
}

fn replace(ctx: &Ctx, id: &str, input: SaveBill) -> Result<Bill, EngineError> {
    let current = find_bill(ctx.db, id)?.ok_or_else(|| EngineError::not_found("bill", id))?;
    let columns = input.changed_columns();
    let bill = input.into_bill(current.id, current.active)?;
    let stamp = stamp_update(ctx, Entity::Bill, &bill.id, &columns)?;
    update_bill(ctx.db, &bill, &stamp)?;
    log_update(ctx, Entity::Bill, &bill.id, &columns)?;
    Ok(bill)
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::error::ErrorCode;
    use alavo_domain::shared::money::Money;

    use crate::spending::test_support::Fixture;

    use super::*;

    fn internet() -> SaveBill {
        SaveBill {
            id: None,
            title: "Internet FPT".into(),
            icon: "lightning".into(),
            amount_vnd: Money(230_000),
            day_of_month: 15,
            active: None,
        }
    }

    #[test]
    fn save_without_an_id_inserts_an_active_bill_and_logs_it() {
        let fixture = Fixture::new();
        let bill = save(&fixture.ctx(), internet()).unwrap();
        assert!(bill.active);
        assert_eq!(list(&fixture.ctx()).unwrap(), vec![bill.clone()]);
        let events = fixture.events("bill");
        assert_eq!(events[0].action, "insert");
        assert_eq!(events[0].payload["day_of_month"], 15);
    }

    #[test]
    fn save_with_an_id_updates_that_bill_instead_of_adding_one() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let bill = save(&ctx, internet()).unwrap();
        let edit = SaveBill {
            id: Some(bill.id.clone()),
            amount_vnd: Money(250_000),
            day_of_month: 20,
            ..internet()
        };
        let updated = save(&ctx, edit).unwrap();
        assert_eq!((updated.amount_vnd, updated.day_of_month), (Money(250_000), 20));
        assert_eq!(list(&ctx).unwrap().len(), 1);
        let events = fixture.events("bill");
        assert_eq!(events[1].action, "update");
        assert_eq!(events[1].changed_fields, r#"["title","icon","amount_vnd","day_of_month"]"#);
    }

    #[test]
    fn an_update_keeps_the_active_flag_unless_it_is_given() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let bill = save(&ctx, SaveBill { active: Some(false), ..internet() }).unwrap();
        assert!(!bill.active);
        let kept = save(&ctx, SaveBill { id: Some(bill.id.clone()), ..internet() }).unwrap();
        assert!(!kept.active);
        let resumed =
            save(&ctx, SaveBill { id: Some(bill.id), active: Some(true), ..internet() }).unwrap();
        assert!(resumed.active);
        assert_eq!(fixture.events("bill")[2].changed_fields.matches("active").count(), 1);
    }

    #[test]
    fn day_of_month_accepts_1_through_31_only() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        for day in [1, 31] {
            assert!(save(&ctx, SaveBill { day_of_month: day, ..internet() }).is_ok());
        }
        for day in [0, 32, -1] {
            let result = save(&ctx, SaveBill { day_of_month: day, ..internet() });
            assert_eq!(result.unwrap_err().code, ErrorCode::Validation, "day {day}");
        }
        assert_eq!(list(&ctx).unwrap().len(), 2);
    }

    #[test]
    fn save_rejects_blank_text_and_non_positive_amounts() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let bad = [
            SaveBill { title: " ".into(), ..internet() },
            SaveBill { icon: "".into(), ..internet() },
            SaveBill { amount_vnd: Money(0), ..internet() },
        ];
        for input in bad {
            assert_eq!(save(&ctx, input).unwrap_err().code, ErrorCode::Validation);
        }
        assert!(fixture.events("bill").is_empty());
    }

    #[test]
    fn save_with_an_unknown_id_is_not_found() {
        let fixture = Fixture::new();
        let result = save(&fixture.ctx(), SaveBill { id: Some("nope".into()), ..internet() });
        assert_eq!(result.unwrap_err().code, ErrorCode::NotFound);
    }

    #[test]
    fn bills_list_by_day_of_month() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        save(&ctx, SaveBill { title: "late".into(), day_of_month: 18, ..internet() }).unwrap();
        save(&ctx, SaveBill { title: "early".into(), day_of_month: 12, ..internet() }).unwrap();
        let titles: Vec<String> = list(&ctx).unwrap().into_iter().map(|bill| bill.title).collect();
        assert_eq!(titles, vec!["early", "late"]);
    }

    #[test]
    fn delete_hides_the_bill_and_logs_a_delete_event() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let bill = save(&ctx, internet()).unwrap();
        delete(&ctx, &bill.id).unwrap();
        assert!(list(&ctx).unwrap().is_empty());
        assert_eq!(fixture.events("bill")[1].action, "delete");
        assert_eq!(delete(&ctx, &bill.id).unwrap_err().code, ErrorCode::NotFound);
        let resave = save(&ctx, SaveBill { id: Some(bill.id), ..internet() });
        assert_eq!(resave.unwrap_err().code, ErrorCode::NotFound);
    }
}
