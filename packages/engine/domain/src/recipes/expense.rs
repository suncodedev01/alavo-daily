use serde::Deserialize;

use crate::recipes::shopping::ShoppingList;
use crate::shared::date::Date;
use crate::shared::error::EngineError;
use crate::shared::money::Money;

const DEFAULT_TITLE: &str = "Đi chợ";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogShoppingExpense {
    pub from: String,
    pub to: String,
    pub wallet_id: String,
    pub category_id: String,
    pub occurred_on: String,
    #[serde(default)]
    pub title: Option<String>,
}

/// What gets recorded as an expense: spending is negative.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExpenseDraft {
    pub title: String,
    pub amount: Money,
}

/// Turns what is still to be bought into one expense. Fails when there is nothing to record.
pub fn draft_expense(list: &ShoppingList, title: Option<&str>) -> Result<ExpenseDraft, EngineError> {
    if list.needed_cost_vnd <= Money(0) {
        return Err(EngineError::validation("nothing with an estimated cost is left to buy"));
    }
    let title = match title.map(str::trim).filter(|title| !title.is_empty()) {
        Some(title) => title.to_string(),
        None => default_title(&list.from, &list.to)?,
    };
    Ok(ExpenseDraft { title, amount: -list.needed_cost_vnd })
}

fn default_title(from: &str, to: &str) -> Result<String, EngineError> {
    let (first, last) = (day_and_month(from)?, day_and_month(to)?);
    if first == last {
        Ok(format!("{DEFAULT_TITLE} {first}"))
    } else {
        Ok(format!("{DEFAULT_TITLE} {first} - {last}"))
    }
}

fn day_and_month(date: &str) -> Result<String, EngineError> {
    let date = Date::parse(date)?;
    Ok(format!("{:02}/{:02}", date.day, date.month))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn list(needed_cost: i64) -> ShoppingList {
        ShoppingList {
            from: "2026-10-05".into(),
            to: "2026-10-11".into(),
            items: vec![],
            needed_count: 1,
            needed_cost_vnd: Money(needed_cost),
        }
    }

    #[test]
    fn amount_is_the_needed_cost_as_a_negative_number() {
        let draft = draft_expense(&list(87_000), None).unwrap();
        assert_eq!(draft.amount, Money(-87_000));
    }

    #[test]
    fn default_title_names_the_date_range() {
        assert_eq!(draft_expense(&list(1), None).unwrap().title, "Đi chợ 05/10 - 11/10");
    }

    #[test]
    fn a_one_day_range_names_a_single_date() {
        let mut one_day = list(1);
        one_day.to = one_day.from.clone();
        assert_eq!(draft_expense(&one_day, None).unwrap().title, "Đi chợ 05/10");
    }

    #[test]
    fn a_given_title_wins_and_is_trimmed() {
        let draft = draft_expense(&list(1), Some("  Chợ Bến Thành ")).unwrap();
        assert_eq!(draft.title, "Chợ Bến Thành");
    }

    #[test]
    fn a_blank_title_falls_back_to_the_default() {
        assert_eq!(draft_expense(&list(1), Some("  ")).unwrap().title, "Đi chợ 05/10 - 11/10");
    }

    #[test]
    fn nothing_to_buy_is_a_validation_error() {
        assert!(draft_expense(&list(0), None).is_err());
    }

    #[test]
    fn a_broken_range_date_is_a_validation_error() {
        let mut broken = list(1);
        broken.from = "soon".into();
        assert!(draft_expense(&broken, None).is_err());
    }
}
