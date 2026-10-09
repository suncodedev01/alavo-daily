use serde::Deserialize;

use crate::shared::date::Date;
use crate::shared::error::EngineError;
use crate::shared::money::Money;
use crate::shared::serde_util::double_option;
use crate::spending::category::CategoryKind;
use crate::spending::validation::required_text;
use crate::spending::{NewTransaction, Transaction};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTransaction {
    pub id: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub amount_vnd: Option<Money>,
    #[serde(default)]
    pub category_id: Option<String>,
    #[serde(default)]
    pub wallet_id: Option<String>,
    #[serde(default)]
    pub occurred_on: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub recurring_rule: Option<Option<String>>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TransactionFilter {
    pub month: Option<String>,
    pub category_id: Option<String>,
    pub wallet_id: Option<String>,
    pub kind: Option<CategoryKind>,
    pub query: Option<String>,
    pub recurring_only: Option<bool>,
    pub limit: Option<i64>,
}

pub fn validate_transaction(
    title: &str,
    occurred_on: &str,
    amount: Money,
    kind: CategoryKind,
) -> Result<(), EngineError> {
    required_text("title", title)?;
    Date::parse(occurred_on)?;
    match (kind, amount.vnd()) {
        (_, 0) => Err(EngineError::validation("amountVnd must not be zero")),
        (CategoryKind::Expense, amount) if amount > 0 => {
            Err(EngineError::validation("an expense amount must be negative"))
        }
        (CategoryKind::Income, amount) if amount < 0 => {
            Err(EngineError::validation("an income amount must be positive"))
        }
        _ => Ok(()),
    }
}

impl NewTransaction {
    pub fn into_transaction(self, id: String, created_at: i64, updated_at: i64) -> Transaction {
        Transaction {
            id,
            occurred_on: self.occurred_on,
            title: self.title.trim().to_string(),
            category_id: self.category_id,
            wallet_id: self.wallet_id,
            amount_vnd: self.amount_vnd,
            note: self.note,
            recurring_rule: self.recurring_rule,
            recurring_source_id: None,
            created_at,
            updated_at,
        }
    }
}

impl Transaction {
    pub fn apply(self, update: UpdateTransaction) -> Transaction {
        Transaction {
            title: update.title.map_or(self.title, |title| title.trim().to_string()),
            amount_vnd: update.amount_vnd.unwrap_or(self.amount_vnd),
            category_id: update.category_id.unwrap_or(self.category_id),
            wallet_id: update.wallet_id.unwrap_or(self.wallet_id),
            occurred_on: update.occurred_on.unwrap_or(self.occurred_on),
            note: update.note.unwrap_or(self.note),
            recurring_rule: update.recurring_rule.unwrap_or(self.recurring_rule),
            ..self
        }
    }

    pub fn matches_text(&self, needle_lowercase: &str) -> bool {
        self.title.to_lowercase().contains(needle_lowercase)
            || self.note.to_lowercase().contains(needle_lowercase)
    }
}

impl UpdateTransaction {
    pub fn changed_columns(&self) -> Vec<&'static str> {
        let given = [
            ("title", self.title.is_some()),
            ("amount_vnd", self.amount_vnd.is_some()),
            ("category_id", self.category_id.is_some()),
            ("wallet_id", self.wallet_id.is_some()),
            ("occurred_on", self.occurred_on.is_some()),
            ("note", self.note.is_some()),
            ("recurring_rule", self.recurring_rule.is_some()),
        ];
        given.into_iter().filter(|(_, present)| *present).map(|(column, _)| column).collect()
    }
}

impl TransactionFilter {
    pub fn text_needle(&self) -> Option<String> {
        let needle = self.query.as_deref()?.trim().to_lowercase();
        (!needle.is_empty()).then_some(needle)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn check(title: &str, date: &str, amount: i64, kind: CategoryKind) -> Result<(), EngineError> {
        validate_transaction(title, date, Money(amount), kind)
    }

    fn sample() -> Transaction {
        NewTransaction {
            title: "  Phở  ".into(),
            amount_vnd: Money(-70_000),
            category_id: "category-food".into(),
            wallet_id: "wallet-cash".into(),
            occurred_on: "2026-10-06".into(),
            note: "Thìn".into(),
            recurring_rule: None,
        }
        .into_transaction("t1".into(), 5, 6)
    }

    fn update() -> UpdateTransaction {
        UpdateTransaction {
            id: "t1".into(),
            title: None,
            amount_vnd: None,
            category_id: None,
            wallet_id: None,
            occurred_on: None,
            note: None,
            recurring_rule: None,
        }
    }

    #[test]
    fn expense_must_be_negative_and_income_positive() {
        assert!(check("Phở", "2026-10-06", -70_000, CategoryKind::Expense).is_ok());
        assert!(check("Lương", "2026-10-06", 28_000_000, CategoryKind::Income).is_ok());
        assert!(check("Phở", "2026-10-06", 70_000, CategoryKind::Expense).is_err());
        assert!(check("Lương", "2026-10-06", -1, CategoryKind::Income).is_err());
    }

    #[test]
    fn zero_amount_is_rejected_for_both_kinds() {
        assert!(check("x", "2026-10-06", 0, CategoryKind::Expense).is_err());
        assert!(check("x", "2026-10-06", 0, CategoryKind::Income).is_err());
    }

    #[test]
    fn blank_title_and_impossible_date_are_rejected() {
        assert!(check("   ", "2026-10-06", -1, CategoryKind::Expense).is_err());
        assert!(check("x", "2026-02-30", -1, CategoryKind::Expense).is_err());
        assert!(check("x", "2026-10", -1, CategoryKind::Expense).is_err());
        assert!(check("x", "2024-02-29", -1, CategoryKind::Expense).is_ok());
    }

    #[test]
    fn new_transaction_gets_a_trimmed_title_and_the_given_ids_and_clocks() {
        let transaction = sample();
        assert_eq!(transaction.title, "Phở");
        assert_eq!((transaction.created_at, transaction.updated_at), (5, 6));
    }

    #[test]
    fn apply_changes_only_given_fields() {
        let change = UpdateTransaction { amount_vnd: Some(Money(-80_000)), ..update() };
        let changed = sample().apply(change);
        assert_eq!(changed.amount_vnd, Money(-80_000));
        assert_eq!(changed.title, "Phở");
        assert_eq!(changed.note, "Thìn");
    }

    #[test]
    fn apply_can_set_and_clear_the_recurring_rule() {
        let set = UpdateTransaction { recurring_rule: Some(Some("monthly:5".into())), ..update() };
        let with_rule = sample().apply(set);
        assert_eq!(with_rule.recurring_rule.as_deref(), Some("monthly:5"));
        let clear = UpdateTransaction { recurring_rule: Some(None), ..update() };
        assert_eq!(with_rule.apply(clear).recurring_rule, None);
    }

    #[test]
    fn changed_columns_lists_given_fields_in_a_stable_order() {
        let change = UpdateTransaction {
            note: Some("x".into()),
            title: Some("y".into()),
            recurring_rule: Some(None),
            ..update()
        };
        assert_eq!(change.changed_columns(), vec!["title", "note", "recurring_rule"]);
    }

    #[test]
    fn text_search_is_case_insensitive_for_vietnamese_and_covers_title_and_note() {
        let transaction = sample();
        assert!(transaction.matches_text("phở"));
        assert!(transaction.matches_text("thìn"));
        assert!(!transaction.matches_text("cà phê"));
        let upper = Transaction { title: "PHỞ BÒ".into(), ..sample() };
        assert!(upper.matches_text("phở"));
    }

    #[test]
    fn blank_query_has_no_needle() {
        let blank = TransactionFilter { query: Some("  ".into()), ..Default::default() };
        assert_eq!(blank.text_needle(), None);
        let upper = TransactionFilter { query: Some(" PHỞ ".into()), ..Default::default() };
        assert_eq!(upper.text_needle().as_deref(), Some("phở"));
    }

    #[test]
    fn filter_reads_camel_case_and_defaults_every_field() {
        let empty: TransactionFilter = serde_json::from_str("{}").unwrap();
        assert!(empty.month.is_none() && empty.limit.is_none());
        let full: TransactionFilter = serde_json::from_str(
            r#"{"month":"2026-10","categoryId":"c","walletId":"w","kind":"income",
                "query":"q","recurringOnly":true,"limit":5}"#,
        )
        .unwrap();
        assert_eq!(full.kind, Some(CategoryKind::Income));
        assert_eq!(full.recurring_only, Some(true));
        assert_eq!(full.limit, Some(5));
    }
}
