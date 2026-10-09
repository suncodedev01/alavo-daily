use std::collections::HashMap;

use alavo_domain::ports::{Database, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::MonthTotals;

use super::rows::{query_rows, query_total};

pub fn month_totals(db: &dyn Database, month: &str) -> Result<MonthTotals, EngineError> {
    let sql = r#"
        SELECT COALESCE(SUM(CASE WHEN amount_vnd > 0 THEN amount_vnd ELSE 0 END), 0) AS income,
               COALESCE(SUM(CASE WHEN amount_vnd < 0 THEN -amount_vnd ELSE 0 END), 0) AS expense,
               COUNT(*) AS row_count
        FROM spending_transactions
        WHERE deleted_at IS NULL AND substr(occurred_on, 1, 7) = ?
    "#;
    let rows = db.query(sql, &[Value::from(month)])?;
    let Some(row) = rows.first() else {
        return Ok(MonthTotals::default());
    };
    Ok(MonthTotals {
        income: Money(row.int("income")?),
        expense: Money(row.int("expense")?),
        count: row.int("row_count")?,
    })
}

pub fn category_spent(
    db: &dyn Database,
    category_id: &str,
    month: &str,
) -> Result<Money, EngineError> {
    let sql = r#"
        SELECT COALESCE(SUM(-amount_vnd), 0) AS total
        FROM spending_transactions
        WHERE deleted_at IS NULL
          AND category_id = ?
          AND amount_vnd < 0
          AND substr(occurred_on, 1, 7) = ?
    "#;
    query_total(db, sql, &[Value::from(category_id), Value::from(month)]).map(Money)
}

pub fn spent_by_category(
    db: &dyn Database,
    month: &str,
) -> Result<HashMap<String, Money>, EngineError> {
    let sql = r#"
        SELECT category_id, SUM(-amount_vnd) AS spent
        FROM spending_transactions
        WHERE deleted_at IS NULL AND amount_vnd < 0 AND substr(occurred_on, 1, 7) = ?
        GROUP BY category_id
    "#;
    let pairs = query_rows(db, sql, &[Value::from(month)], |row| {
        Ok((row.text("category_id")?, Money(row.int("spent")?)))
    })?;
    Ok(pairs.into_iter().collect())
}

pub fn daily_expense_totals(
    db: &dyn Database,
    month: &str,
) -> Result<Vec<(u32, Money)>, EngineError> {
    let sql = r#"
        SELECT CAST(substr(t.occurred_on, 9, 2) AS INTEGER) AS day, SUM(-t.amount_vnd) AS spent
        FROM spending_transactions t
        JOIN spending_categories c ON c.id = t.category_id
        WHERE t.deleted_at IS NULL
          AND t.amount_vnd < 0
          AND c.is_fixed = 0
          AND substr(t.occurred_on, 1, 7) = ?
        GROUP BY day
    "#;
    query_rows(db, sql, &[Value::from(month)], |row| {
        Ok((row.int("day")? as u32, Money(row.int("spent")?)))
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    fn add(db: &dyn Database, id: &str, date: &str, category: &str, amount: i64) {
        let sql = r#"
            INSERT INTO spending_transactions
                (id, occurred_on, title, category_id, wallet_id, amount_vnd, created_at,
                 updated_at, deleted_at)
            VALUES (?, ?, 't', ?, 'wallet-cash', ?, 1, 1, NULL)
        "#;
        let params =
            [Value::from(id), Value::from(date), Value::from(category), Value::from(amount)];
        db.execute(sql, &params).unwrap();
    }

    #[test]
    fn an_empty_month_has_zero_totals() {
        let db = migrated_memory_db();
        assert_eq!(month_totals(&db, "2026-10").unwrap(), MonthTotals::default());
    }

    #[test]
    fn totals_split_income_from_expense_and_stay_inside_the_month() {
        let db = migrated_memory_db();
        add(&db, "a", "2026-10-01", "category-food", -100);
        add(&db, "b", "2026-10-31", "category-income", 900);
        add(&db, "c", "2026-09-30", "category-food", -5_000);
        add(&db, "d", "2026-11-01", "category-food", -7_000);
        let totals = month_totals(&db, "2026-10").unwrap();
        assert_eq!((totals.income, totals.expense, totals.count), (Money(900), Money(100), 2));
    }

    #[test]
    fn deleted_transactions_are_not_counted() {
        let db = migrated_memory_db();
        add(&db, "a", "2026-10-01", "category-food", -100);
        db.execute("UPDATE spending_transactions SET deleted_at = 2", &[]).unwrap();
        assert_eq!(month_totals(&db, "2026-10").unwrap().count, 0);
        assert_eq!(category_spent(&db, "category-food", "2026-10").unwrap(), Money(0));
        assert!(spent_by_category(&db, "2026-10").unwrap().is_empty());
    }

    #[test]
    fn category_spent_counts_only_that_category_and_month() {
        let db = migrated_memory_db();
        add(&db, "a", "2026-10-01", "category-food", -100);
        add(&db, "b", "2026-10-02", "category-food", -50);
        add(&db, "c", "2026-10-02", "category-fun", -9);
        add(&db, "d", "2026-09-30", "category-food", -1_000);
        assert_eq!(category_spent(&db, "category-food", "2026-10").unwrap(), Money(150));
    }

    #[test]
    fn spent_by_category_groups_expenses_as_positive_numbers() {
        let db = migrated_memory_db();
        add(&db, "a", "2026-10-01", "category-food", -100);
        add(&db, "b", "2026-10-02", "category-food", -50);
        add(&db, "c", "2026-10-02", "category-income", 700);
        let spent = spent_by_category(&db, "2026-10").unwrap();
        assert_eq!(spent.get("category-food"), Some(&Money(150)));
        assert_eq!(spent.get("category-income"), None);
    }

    #[test]
    fn daily_totals_group_by_day_and_leave_out_fixed_categories() {
        let db = migrated_memory_db();
        add(&db, "a", "2026-10-05", "category-food", -100);
        add(&db, "b", "2026-10-05", "category-fun", -20);
        add(&db, "c", "2026-10-05", "category-home", -7_500);
        add(&db, "d", "2026-10-09", "category-food", -30);
        add(&db, "e", "2026-10-09", "category-income", 5_000);
        let mut totals = daily_expense_totals(&db, "2026-10").unwrap();
        totals.sort();
        assert_eq!(totals, vec![(5, Money(120)), (9, Money(30))]);
    }
}
