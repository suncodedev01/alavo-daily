use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::PaymentMethod;

use super::rows::{query_one, query_rows, Stamp};

const METHOD_WITH_USAGE: &str = r#"
    SELECT p.id, p.name, p.icon, p.is_default, p.position,
           COUNT(t.id) AS transaction_count
    FROM spending_payment_methods p
    LEFT JOIN spending_transactions t ON t.payment_method_id = p.id AND t.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
"#;

pub fn list_payment_methods(db: &dyn Database) -> Result<Vec<PaymentMethod>, EngineError> {
    let sql = format!("{METHOD_WITH_USAGE} GROUP BY p.id ORDER BY p.position, p.rowid");
    query_rows(db, &sql, &[], method_from_row)
}

pub fn find_payment_method(
    db: &dyn Database,
    id: &str,
) -> Result<Option<PaymentMethod>, EngineError> {
    let sql = format!("{METHOD_WITH_USAGE} AND p.id = ? GROUP BY p.id");
    query_one(db, &sql, &[Value::from(id)], method_from_row)
}

pub fn insert_payment_method(
    db: &dyn Database,
    method: &PaymentMethod,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_payment_methods
            (id, name, icon, is_default, position, updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(method.id.as_str()),
        Value::from(method.name.as_str()),
        Value::from(method.icon.as_str()),
        Value::from(i64::from(method.is_default)),
        Value::from(method.position),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_payment_method(
    db: &dyn Database,
    method: &PaymentMethod,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_payment_methods
        SET name = ?, icon = ?, updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(method.name.as_str()),
        Value::from(method.icon.as_str()),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(method.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn transaction_ids_with_payment_method(
    db: &dyn Database,
    method_id: &str,
) -> Result<Vec<String>, EngineError> {
    let sql = r#"
        SELECT id
        FROM spending_transactions
        WHERE payment_method_id = ? AND deleted_at IS NULL
        ORDER BY rowid
    "#;
    query_rows(db, sql, &[Value::from(method_id)], |row| row.text("id"))
}

fn method_from_row(row: &Row) -> Result<PaymentMethod, EngineError> {
    Ok(PaymentMethod {
        id: row.text("id")?,
        name: row.text("name")?,
        icon: row.text("icon")?,
        is_default: row.int("is_default")? != 0,
        position: row.int("position")?,
        transaction_count: row.int("transaction_count")?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    fn stamp() -> Stamp {
        Stamp { updated_at: 9, field_updated_at: "{}".to_string() }
    }

    fn visa() -> PaymentMethod {
        PaymentMethod {
            id: "payment-visa".into(),
            name: "Thẻ Visa".into(),
            icon: "credit-card".into(),
            is_default: false,
            position: 4,
            transaction_count: 0,
        }
    }

    #[test]
    fn a_fresh_install_has_cash_as_default_then_bank_transfer_and_ewallet() {
        let db = migrated_memory_db();
        let methods = list_payment_methods(&db).unwrap();
        let summary: Vec<(&str, bool)> =
            methods.iter().map(|method| (method.name.as_str(), method.is_default)).collect();
        assert_eq!(summary, [("Tiền mặt", true), ("Chuyển khoản", false), ("Ví điện tử", false)]);
    }

    #[test]
    fn insert_then_update_round_trips_and_counts_start_at_zero() {
        let db = migrated_memory_db();
        insert_payment_method(&db, &visa(), &stamp()).unwrap();
        let renamed = PaymentMethod { name: "Visa".into(), icon: "bank".into(), ..visa() };
        update_payment_method(&db, &renamed, &stamp()).unwrap();
        let found = find_payment_method(&db, "payment-visa").unwrap().unwrap();
        assert_eq!((found.name.as_str(), found.icon.as_str(), found.transaction_count), ("Visa", "bank", 0));
    }

    #[test]
    fn the_usage_count_follows_the_transactions_that_use_the_method() {
        let db = migrated_memory_db();
        let insert = r#"
            INSERT INTO spending_transactions
                (id, occurred_on, title, category_id, wallet_id, amount_vnd, note,
                 payment_method_id, created_at, updated_at, field_updated_at)
            VALUES (?, '2026-10-06', 'Phở', 'category-food', 'wallet-cash', -70000, '', ?, 1, 1, '{}')
        "#;
        db.execute(insert, &[Value::from("t1"), Value::from("payment-cash")]).unwrap();
        db.execute(insert, &[Value::from("t2"), Value::from("payment-cash")]).unwrap();
        db.execute("UPDATE spending_transactions SET deleted_at = 5 WHERE id = 't2'", &[]).unwrap();
        let cash = find_payment_method(&db, "payment-cash").unwrap().unwrap();
        assert_eq!(cash.transaction_count, 1);
        assert_eq!(transaction_ids_with_payment_method(&db, "payment-cash").unwrap(), vec!["t1"]);
    }
}
