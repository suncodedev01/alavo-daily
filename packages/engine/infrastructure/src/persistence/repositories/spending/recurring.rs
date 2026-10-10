use std::collections::HashSet;

use alavo_domain::ports::{Database, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::Transaction;

use super::rows::query_rows;
use super::transactions::{transaction_from_row, TRANSACTION_COLUMNS};

pub fn list_recurring_templates(db: &dyn Database) -> Result<Vec<Transaction>, EngineError> {
    let sql = format!(
        r#"
        SELECT {TRANSACTION_COLUMNS}
        FROM spending_transactions t
        WHERE t.deleted_at IS NULL
          AND t.recurring_rule IS NOT NULL
          AND t.recurring_source_id IS NULL
        ORDER BY t.occurred_on, t.rowid
        "#
    );
    query_rows(db, &sql, &[], transaction_from_row)
}

// Deleted rows are included on purpose: a deleted occurrence must not come back.
pub fn occurrence_ids(
    db: &dyn Database,
    template_id: &str,
) -> Result<HashSet<String>, EngineError> {
    let sql = r#"
        SELECT id
        FROM spending_transactions
        WHERE recurring_source_id = ?
    "#;
    let ids = query_rows(db, sql, &[Value::from(template_id)], |row| row.text("id"))?;
    Ok(ids.into_iter().collect())
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use alavo_domain::shared::money::Money;

    use crate::persistence::repositories::spending::rows::Stamp;
    use crate::persistence::repositories::spending::transactions::{
        insert_transaction, update_transaction,
    };
    use crate::testing::migrated_memory_db;

    use super::*;

    fn sample(id: &str, rule: Option<&str>, source: Option<&str>) -> Transaction {
        Transaction {
            payment_method_id: None,
            id: id.into(),
            occurred_on: "2026-09-03".into(),
            title: "Internet".into(),
            category_id: "category-bills".into(),
            wallet_id: "wallet-cash".into(),
            amount_vnd: Money(-230_000),
            note: String::new(),
            recurring_rule: rule.map(str::to_string),
            recurring_source_id: source.map(str::to_string),
            created_at: 1,
            updated_at: 1,
        }
    }

    fn stamp(clock: i64) -> Stamp {
        Stamp { updated_at: clock, field_updated_at: "{}".into() }
    }

    fn insert(db: &dyn Database, transaction: &Transaction) {
        insert_transaction(db, transaction, &stamp(1)).unwrap();
    }

    #[test]
    fn templates_are_rows_with_a_rule_and_no_source() {
        let db = migrated_memory_db();
        insert(&db, &sample("template", Some("monthly:3"), None));
        insert(&db, &sample("plain", None, None));
        insert(&db, &sample("template@2026-10-03", None, Some("template")));
        let templates = list_recurring_templates(&db).unwrap();
        assert_eq!(templates.len(), 1);
        assert_eq!(templates[0].id, "template");
    }

    #[test]
    fn a_template_whose_rule_was_cleared_is_no_longer_listed() {
        let db = migrated_memory_db();
        let template = sample("template", Some("monthly:3"), None);
        insert(&db, &template);
        let stopped = Transaction { recurring_rule: None, ..template };
        update_transaction(&db, &stopped, &stamp(2)).unwrap();
        assert!(list_recurring_templates(&db).unwrap().is_empty());
    }

    #[test]
    fn occurrence_ids_include_deleted_rows_and_only_this_template() {
        let db = migrated_memory_db();
        insert(&db, &sample("a@2026-10-03", None, Some("a")));
        insert(&db, &sample("a@2026-11-03", None, Some("a")));
        insert(&db, &sample("b@2026-10-03", None, Some("b")));
        let delete = "UPDATE spending_transactions SET deleted_at = 5 WHERE id = 'a@2026-11-03'";
        db.execute(delete, &[]).unwrap();
        let ids = occurrence_ids(&db, "a").unwrap();
        assert_eq!(ids.len(), 2);
        assert!(ids.contains("a@2026-11-03"));
    }
}
