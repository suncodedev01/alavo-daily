use alavo_domain::ports::{Database, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::report::{CategoryTotal, MonthTotal};
use alavo_domain::spending::CategoryKind;

use super::rows::query_rows;

pub fn category_totals_between(
    db: &dyn Database,
    from: &str,
    to: &str,
) -> Result<Vec<CategoryTotal>, EngineError> {
    let sql = r#"
        SELECT c.id AS category_id, c.name AS name, c.icon AS icon, c.kind AS kind,
               SUM(ABS(t.amount_vnd)) AS total, COUNT(*) AS row_count
        FROM spending_transactions t
        JOIN spending_categories c ON c.id = t.category_id
        WHERE t.deleted_at IS NULL AND t.occurred_on BETWEEN ? AND ?
        GROUP BY c.id
        ORDER BY total DESC, c.position
    "#;
    query_rows(db, sql, &[Value::from(from), Value::from(to)], |row| {
        Ok(CategoryTotal {
            category_id: row.text("category_id")?,
            name: row.text("name")?,
            icon: row.text("icon")?,
            kind: CategoryKind::parse(&row.text("kind")?)?,
            total: Money(row.int("total")?),
            transaction_count: row.int("row_count")?,
        })
    })
}

pub fn month_totals_between(
    db: &dyn Database,
    from: &str,
    to: &str,
) -> Result<Vec<MonthTotal>, EngineError> {
    let sql = r#"
        SELECT substr(occurred_on, 1, 7) AS month,
               COALESCE(SUM(CASE WHEN amount_vnd > 0 THEN amount_vnd ELSE 0 END), 0) AS income,
               COALESCE(SUM(CASE WHEN amount_vnd < 0 THEN -amount_vnd ELSE 0 END), 0) AS expense
        FROM spending_transactions
        WHERE deleted_at IS NULL AND occurred_on BETWEEN ? AND ?
        GROUP BY month
        ORDER BY month
    "#;
    query_rows(db, sql, &[Value::from(from), Value::from(to)], |row| {
        Ok(MonthTotal {
            month: row.text("month")?,
            income: Money(row.int("income")?),
            expense: Money(row.int("expense")?),
        })
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
    fn category_totals_are_largest_first_and_stay_inside_the_range() {
        let db = migrated_memory_db();
        add(&db, "a", "2026-10-01", "category-food", -100);
        add(&db, "b", "2026-10-31", "category-food", -50);
        add(&db, "c", "2026-10-15", "category-fun", -400);
        add(&db, "d", "2026-09-30", "category-fun", -9_000);
        add(&db, "e", "2026-10-20", "category-income", 700);
        let totals = category_totals_between(&db, "2026-10-01", "2026-10-31").unwrap();
        let summary: Vec<_> =
            totals.iter().map(|item| (item.category_id.as_str(), item.total)).collect();
        assert_eq!(
            summary,
            vec![
                ("category-income", Money(700)),
                ("category-fun", Money(400)),
                ("category-food", Money(150)),
            ]
        );
        assert_eq!(totals[2].transaction_count, 2);
        assert_eq!(totals[0].kind, CategoryKind::Income);
    }

    #[test]
    fn deleted_rows_are_left_out_of_both_queries() {
        let db = migrated_memory_db();
        add(&db, "a", "2026-10-01", "category-food", -100);
        db.execute("UPDATE spending_transactions SET deleted_at = 3", &[]).unwrap();
        assert!(category_totals_between(&db, "2026-10-01", "2026-10-31").unwrap().is_empty());
        assert!(month_totals_between(&db, "2026-10-01", "2026-10-31").unwrap().is_empty());
    }

    #[test]
    fn month_totals_split_income_from_expense_per_month_in_order() {
        let db = migrated_memory_db();
        add(&db, "a", "2026-11-02", "category-food", -100);
        add(&db, "b", "2026-10-02", "category-food", -40);
        add(&db, "c", "2026-10-03", "category-income", 900);
        add(&db, "d", "2026-12-01", "category-food", -1);
        let months = month_totals_between(&db, "2026-10-01", "2026-11-30").unwrap();
        let summary: Vec<_> = months
            .iter()
            .map(|month| (month.month.as_str(), month.income, month.expense))
            .collect();
        assert_eq!(
            summary,
            vec![("2026-10", Money(900), Money(40)), ("2026-11", Money(0), Money(100))]
        );
    }
}
