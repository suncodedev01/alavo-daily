use std::collections::HashMap;

use alavo_domain::ports::{Database, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::statement::LedgerKey;

use super::rows::query_rows;

/// How many live transactions of `wallet_id` already match each (date, amount, title) key.
pub fn ledger_key_counts(
    db: &dyn Database,
    wallet_id: &str,
    from: &str,
    to: &str,
) -> Result<HashMap<LedgerKey, usize>, EngineError> {
    let sql = r#"
        SELECT occurred_on, amount_vnd, title, COUNT(*) AS row_count
        FROM spending_transactions
        WHERE wallet_id = ? AND deleted_at IS NULL AND occurred_on BETWEEN ? AND ?
        GROUP BY occurred_on, amount_vnd, title
    "#;
    let params = [Value::from(wallet_id), Value::from(from), Value::from(to)];
    let counted = query_rows(db, sql, &params, |row| {
        let key = LedgerKey {
            occurred_on: row.text("occurred_on")?,
            amount_vnd: row.int("amount_vnd")?,
            title: row.text("title")?,
        };
        Ok((key, row.int("row_count")?.max(0) as usize))
    })?;
    Ok(counted.into_iter().collect())
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    fn add(db: &dyn Database, id: &str, wallet: &str, date: &str, amount: i64) {
        let sql = r#"
            INSERT INTO spending_transactions
                (id, occurred_on, title, category_id, wallet_id, amount_vnd, created_at,
                 updated_at, deleted_at)
            VALUES (?, ?, 'Phở', 'category-food', ?, ?, 1, 1, NULL)
        "#;
        let params = [Value::from(id), Value::from(date), Value::from(wallet), Value::from(amount)];
        db.execute(sql, &params).unwrap();
    }

    fn key(date: &str, amount: i64) -> LedgerKey {
        LedgerKey { occurred_on: date.into(), amount_vnd: amount, title: "Phở".into() }
    }

    #[test]
    fn identical_rows_are_counted_and_other_wallets_dates_and_deleted_rows_are_not() {
        let db = migrated_memory_db();
        add(&db, "a", "wallet-cash", "2026-10-05", -70_000);
        add(&db, "b", "wallet-cash", "2026-10-05", -70_000);
        add(&db, "c", "other", "2026-10-05", -70_000);
        add(&db, "d", "wallet-cash", "2026-10-06", -70_000);
        add(&db, "e", "wallet-cash", "2026-10-05", -70_000);
        db.execute("UPDATE spending_transactions SET deleted_at = 1 WHERE id = 'e'", &[]).unwrap();
        let counts = ledger_key_counts(&db, "wallet-cash", "2026-10-01", "2026-10-05").unwrap();
        assert_eq!(counts.get(&key("2026-10-05", -70_000)), Some(&2));
        assert_eq!(counts.len(), 1);
    }
}
