use serde::{Deserialize, Serialize};

use crate::shared::error::EngineError;
use crate::shared::money::Money;
use crate::spending::validation::{positive_amount, required_text};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bill {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub amount_vnd: Money,
    pub day_of_month: i64,
    pub active: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveBill {
    #[serde(default)]
    pub id: Option<String>,
    pub title: String,
    pub icon: String,
    pub amount_vnd: Money,
    pub day_of_month: i64,
    #[serde(default)]
    pub active: Option<bool>,
}

impl SaveBill {
    pub fn into_bill(self, id: String, current_active: bool) -> Result<Bill, EngineError> {
        if !(1..=31).contains(&self.day_of_month) {
            return Err(EngineError::validation("dayOfMonth must be between 1 and 31"));
        }
        Ok(Bill {
            id,
            title: required_text("title", &self.title)?,
            icon: required_text("icon", &self.icon)?,
            amount_vnd: positive_amount("amountVnd", self.amount_vnd)?,
            day_of_month: self.day_of_month,
            active: self.active.unwrap_or(current_active),
        })
    }

    pub fn changed_columns(&self) -> Vec<&'static str> {
        let mut columns = vec!["title", "icon", "amount_vnd", "day_of_month"];
        if self.active.is_some() {
            columns.push("active");
        }
        columns
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn save() -> SaveBill {
        SaveBill {
            id: None,
            title: " Internet FPT ".into(),
            icon: "lightning".into(),
            amount_vnd: Money(230_000),
            day_of_month: 15,
            active: None,
        }
    }

    #[test]
    fn a_new_bill_is_active_unless_told_otherwise() {
        let bill = save().into_bill("b1".into(), true).unwrap();
        assert_eq!(bill.title, "Internet FPT");
        assert!(bill.active);
        let paused =
            SaveBill { active: Some(false), ..save() }.into_bill("b1".into(), true).unwrap();
        assert!(!paused.active);
    }

    #[test]
    fn an_update_without_active_keeps_the_current_flag() {
        assert!(!save().into_bill("b1".into(), false).unwrap().active);
    }

    #[test]
    fn day_of_month_must_be_between_1_and_31() {
        for day in [0, -3, 32] {
            let result = SaveBill { day_of_month: day, ..save() }.into_bill("b".into(), true);
            assert!(result.is_err(), "day {day}");
        }
        for day in [1, 31] {
            assert!(SaveBill { day_of_month: day, ..save() }.into_bill("b".into(), true).is_ok());
        }
    }

    #[test]
    fn blank_text_and_non_positive_amounts_are_rejected() {
        let cases = [
            SaveBill { title: " ".into(), ..save() },
            SaveBill { icon: "".into(), ..save() },
            SaveBill { amount_vnd: Money(0), ..save() },
        ];
        for input in cases {
            assert!(input.into_bill("b".into(), true).is_err());
        }
    }

    #[test]
    fn changed_columns_include_active_only_when_given() {
        assert_eq!(save().changed_columns().len(), 4);
        let with_active = SaveBill { active: Some(true), ..save() };
        assert_eq!(with_active.changed_columns().last(), Some(&"active"));
    }
}
