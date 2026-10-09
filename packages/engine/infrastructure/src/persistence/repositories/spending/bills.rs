use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::Bill;

use super::rows::{money_value, query_one, query_rows, Stamp};

pub fn list_bills(db: &dyn Database) -> Result<Vec<Bill>, EngineError> {
    let sql = r#"
        SELECT id, title, icon, amount_vnd, day_of_month, active
        FROM spending_bills
        WHERE deleted_at IS NULL
        ORDER BY day_of_month, created_at, rowid
    "#;
    query_rows(db, sql, &[], bill_from_row)
}

pub fn find_bill(db: &dyn Database, id: &str) -> Result<Option<Bill>, EngineError> {
    let sql = r#"
        SELECT id, title, icon, amount_vnd, day_of_month, active
        FROM spending_bills
        WHERE id = ? AND deleted_at IS NULL
    "#;
    query_one(db, sql, &[Value::from(id)], bill_from_row)
}

pub fn insert_bill(
    db: &dyn Database,
    bill: &Bill,
    created_at: i64,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_bills
            (id, title, icon, amount_vnd, day_of_month, active, created_at,
             updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(bill.id.as_str()),
        Value::from(bill.title.as_str()),
        Value::from(bill.icon.as_str()),
        money_value(bill.amount_vnd),
        Value::from(bill.day_of_month),
        Value::from(bill.active),
        Value::from(created_at),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_bill(db: &dyn Database, bill: &Bill, stamp: &Stamp) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_bills
        SET title = ?, icon = ?, amount_vnd = ?, day_of_month = ?, active = ?,
            updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(bill.title.as_str()),
        Value::from(bill.icon.as_str()),
        money_value(bill.amount_vnd),
        Value::from(bill.day_of_month),
        Value::from(bill.active),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(bill.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

fn bill_from_row(row: &Row) -> Result<Bill, EngineError> {
    Ok(Bill {
        id: row.text("id")?,
        title: row.text("title")?,
        icon: row.text("icon")?,
        amount_vnd: Money(row.int("amount_vnd")?),
        day_of_month: row.int("day_of_month")?,
        active: row.bool("active")?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    fn stamp() -> Stamp {
        Stamp { updated_at: 9, field_updated_at: "{}".to_string() }
    }

    fn bill(id: &str, day: i64) -> Bill {
        Bill {
            id: id.into(),
            title: "Internet FPT".into(),
            icon: "lightning".into(),
            amount_vnd: Money(230_000),
            day_of_month: day,
            active: true,
        }
    }

    #[test]
    fn insert_then_find_round_trips_every_field() {
        let db = migrated_memory_db();
        let paused = Bill { active: false, ..bill("b1", 15) };
        insert_bill(&db, &paused, 1, &stamp()).unwrap();
        assert_eq!(find_bill(&db, "b1").unwrap(), Some(paused));
    }

    #[test]
    fn list_orders_by_day_of_month_and_hides_deleted_bills() {
        let db = migrated_memory_db();
        insert_bill(&db, &bill("late", 18), 1, &stamp()).unwrap();
        insert_bill(&db, &bill("early", 12), 2, &stamp()).unwrap();
        insert_bill(&db, &bill("gone", 1), 3, &stamp()).unwrap();
        db.execute("UPDATE spending_bills SET deleted_at = 1 WHERE id = 'gone'", &[]).unwrap();
        let ids: Vec<String> = list_bills(&db).unwrap().into_iter().map(|bill| bill.id).collect();
        assert_eq!(ids, vec!["early", "late"]);
        assert_eq!(find_bill(&db, "gone").unwrap(), None);
    }

    #[test]
    fn update_rewrites_the_editable_columns() {
        let db = migrated_memory_db();
        insert_bill(&db, &bill("b1", 15), 1, &stamp()).unwrap();
        let edited =
            Bill { title: "Mới".into(), amount_vnd: Money(5), active: false, ..bill("b1", 3) };
        update_bill(&db, &edited, &stamp()).unwrap();
        assert_eq!(find_bill(&db, "b1").unwrap(), Some(edited));
    }
}
