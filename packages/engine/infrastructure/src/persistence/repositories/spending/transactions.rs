use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{Transaction, TransactionFilter};

use super::rows::{money_value, query_one, query_rows, query_total, Stamp};

pub(super) const TRANSACTION_COLUMNS: &str = r#"
    t.id, t.occurred_on, t.title, t.category_id, t.wallet_id, t.amount_vnd, t.note,
    t.recurring_rule, t.recurring_source_id, t.created_at, t.updated_at
"#;

pub fn list_transactions(
    db: &dyn Database,
    filter: &TransactionFilter,
) -> Result<Vec<Transaction>, EngineError> {
    let needle = filter.text_needle();
    let (clauses, mut params) = filter_clauses(filter);
    let mut sql = list_sql(&clauses);
    let limit = filter.limit.filter(|_| needle.is_none());
    if let Some(limit) = limit {
        sql.push_str(" LIMIT ?");
        params.push(Value::from(limit));
    }
    let rows = query_rows(db, &sql, &params, transaction_from_row)?;
    Ok(match needle {
        Some(needle) => keep_text_matches(rows, &needle, filter.limit),
        None => rows,
    })
}

pub fn find_transaction(db: &dyn Database, id: &str) -> Result<Option<Transaction>, EngineError> {
    let sql = format!(
        r#"
        SELECT {TRANSACTION_COLUMNS}
        FROM spending_transactions t
        WHERE t.id = ? AND t.deleted_at IS NULL
        "#
    );
    query_one(db, &sql, &[Value::from(id)], transaction_from_row)
}

pub fn insert_transaction(
    db: &dyn Database,
    transaction: &Transaction,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_transactions
            (id, occurred_on, title, category_id, wallet_id, amount_vnd, note, recurring_rule,
             recurring_source_id, created_at, updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(transaction.id.as_str()),
        Value::from(transaction.occurred_on.as_str()),
        Value::from(transaction.title.as_str()),
        Value::from(transaction.category_id.as_str()),
        Value::from(transaction.wallet_id.as_str()),
        money_value(transaction.amount_vnd),
        Value::from(transaction.note.as_str()),
        Value::from(transaction.recurring_rule.as_deref()),
        Value::from(transaction.recurring_source_id.as_deref()),
        Value::from(transaction.created_at),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_transaction(
    db: &dyn Database,
    transaction: &Transaction,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_transactions
        SET occurred_on = ?, title = ?, category_id = ?, wallet_id = ?, amount_vnd = ?,
            note = ?, recurring_rule = ?, updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(transaction.occurred_on.as_str()),
        Value::from(transaction.title.as_str()),
        Value::from(transaction.category_id.as_str()),
        Value::from(transaction.wallet_id.as_str()),
        money_value(transaction.amount_vnd),
        Value::from(transaction.note.as_str()),
        Value::from(transaction.recurring_rule.as_deref()),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(transaction.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn count_in_category(db: &dyn Database, category_id: &str) -> Result<i64, EngineError> {
    let sql = r#"
        SELECT COUNT(*) AS total
        FROM spending_transactions
        WHERE category_id = ? AND deleted_at IS NULL
    "#;
    query_total(db, sql, &[Value::from(category_id)])
}

pub fn count_in_wallet(db: &dyn Database, wallet_id: &str) -> Result<i64, EngineError> {
    let sql = r#"
        SELECT COUNT(*) AS total
        FROM spending_transactions
        WHERE wallet_id = ? AND deleted_at IS NULL
    "#;
    query_total(db, sql, &[Value::from(wallet_id)])
}

fn filter_clauses(filter: &TransactionFilter) -> (Vec<&'static str>, Vec<Value>) {
    let mut clauses = vec!["t.deleted_at IS NULL"];
    let mut params = Vec::new();
    if let Some(month) = &filter.month {
        clauses.push("substr(t.occurred_on, 1, 7) = ?");
        params.push(Value::from(month.as_str()));
    }
    if let Some(category_id) = &filter.category_id {
        clauses.push("t.category_id = ?");
        params.push(Value::from(category_id.as_str()));
    }
    if let Some(wallet_id) = &filter.wallet_id {
        clauses.push("t.wallet_id = ?");
        params.push(Value::from(wallet_id.as_str()));
    }
    if let Some(kind) = filter.kind {
        clauses.push("t.category_id IN (SELECT id FROM spending_categories WHERE kind = ?)");
        params.push(Value::from(kind.as_str()));
    }
    if filter.recurring_only == Some(true) {
        clauses.push("(t.recurring_rule IS NOT NULL OR t.recurring_source_id IS NOT NULL)");
    }
    (clauses, params)
}

fn list_sql(clauses: &[&str]) -> String {
    format!(
        r#"
        SELECT {TRANSACTION_COLUMNS}
        FROM spending_transactions t
        WHERE {}
        ORDER BY t.occurred_on DESC, t.created_at DESC, t.rowid DESC
        "#,
        clauses.join(" AND ")
    )
}

// SQLite LOWER() only folds ASCII, so Vietnamese text search runs here: O(n) over the rows
// that passed the other filters.
fn keep_text_matches(rows: Vec<Transaction>, needle: &str, limit: Option<i64>) -> Vec<Transaction> {
    let matching = rows.into_iter().filter(|transaction| transaction.matches_text(needle));
    match limit {
        Some(limit) => matching.take(limit.max(0) as usize).collect(),
        None => matching.collect(),
    }
}

pub(super) fn transaction_from_row(row: &Row) -> Result<Transaction, EngineError> {
    Ok(Transaction {
        id: row.text("id")?,
        occurred_on: row.text("occurred_on")?,
        title: row.text("title")?,
        category_id: row.text("category_id")?,
        wallet_id: row.text("wallet_id")?,
        amount_vnd: Money(row.int("amount_vnd")?),
        note: row.text("note")?,
        recurring_rule: row.opt_text("recurring_rule")?,
        recurring_source_id: row.opt_text("recurring_source_id")?,
        created_at: row.int("created_at")?,
        updated_at: row.int("updated_at")?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests;
