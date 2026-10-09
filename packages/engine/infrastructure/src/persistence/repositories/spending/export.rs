use alavo_domain::ports::{Database, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::csv_export::ExportRow;

use super::rows::query_rows;

pub fn export_rows_between(
    db: &dyn Database,
    from: &str,
    to: &str,
) -> Result<Vec<ExportRow>, EngineError> {
    let sql = r#"
        SELECT t.occurred_on, t.title, COALESCE(c.name, '') AS category_name,
               COALESCE(w.name, '') AS wallet_name, t.amount_vnd, t.note
        FROM spending_transactions t
        LEFT JOIN spending_categories c ON c.id = t.category_id
        LEFT JOIN spending_wallets w ON w.id = t.wallet_id
        WHERE t.deleted_at IS NULL AND t.occurred_on BETWEEN ? AND ?
        ORDER BY t.occurred_on, t.created_at, t.rowid
    "#;
    query_rows(db, sql, &[Value::from(from), Value::from(to)], |row| {
        Ok(ExportRow {
            occurred_on: row.text("occurred_on")?,
            title: row.text("title")?,
            category_name: row.text("category_name")?,
            wallet_name: row.text("wallet_name")?,
            amount: Money(row.int("amount_vnd")?),
            note: row.text("note")?,
        })
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    fn add(db: &dyn Database, id: &str, date: &str, title: &str, amount: i64) {
        let sql = r#"
            INSERT INTO spending_transactions
                (id, occurred_on, title, category_id, wallet_id, amount_vnd, note, created_at,
                 updated_at, deleted_at)
            VALUES (?, ?, ?, 'category-food', 'wallet-cash', ?, 'ghi chú', 1, 1, NULL)
        "#;
        let params = [Value::from(id), Value::from(date), Value::from(title), Value::from(amount)];
        db.execute(sql, &params).unwrap();
    }

    #[test]
    fn rows_are_oldest_first_with_category_and_wallet_names() {
        let db = migrated_memory_db();
        add(&db, "b", "2026-10-09", "Cà phê", -30_000);
        add(&db, "a", "2026-10-02", "Phở", -70_000);
        add(&db, "z", "2026-11-01", "Ngoài khoảng", -1);
        let rows = export_rows_between(&db, "2026-10-01", "2026-10-31").unwrap();
        let titles: Vec<_> = rows.iter().map(|row| row.title.as_str()).collect();
        assert_eq!(titles, vec!["Phở", "Cà phê"]);
        assert_eq!(rows[0].category_name, "Ăn uống");
        assert_eq!(rows[0].wallet_name, "Tiền mặt");
        assert_eq!(rows[0].amount, Money(-70_000));
    }

    #[test]
    fn deleted_rows_are_not_exported() {
        let db = migrated_memory_db();
        add(&db, "a", "2026-10-02", "Phở", -70_000);
        db.execute("UPDATE spending_transactions SET deleted_at = 9", &[]).unwrap();
        assert!(export_rows_between(&db, "2026-10-01", "2026-10-31").unwrap().is_empty());
    }
}
