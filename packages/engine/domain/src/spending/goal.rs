use serde::{Deserialize, Serialize};

use crate::shared::date::Date;
use crate::shared::error::EngineError;
use crate::shared::money::Money;
use crate::shared::serde_util::double_option;
use crate::spending::validation::{positive_amount, required_text, updated_text};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub target_vnd: Money,
    pub saved_vnd: Money,
    pub due_on: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewGoal {
    pub name: String,
    pub icon: String,
    pub target_vnd: Money,
    #[serde(default)]
    pub saved_vnd: Option<Money>,
    #[serde(default)]
    pub due_on: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGoal {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub target_vnd: Option<Money>,
    #[serde(default, deserialize_with = "double_option")]
    pub due_on: Option<Option<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContributeGoal {
    pub id: String,
    pub amount_vnd: Money,
}

impl Goal {
    pub fn from_new(id: String, input: NewGoal) -> Result<Goal, EngineError> {
        let saved = input.saved_vnd.unwrap_or_default();
        if saved.is_negative() {
            return Err(EngineError::validation("savedVnd must not be negative"));
        }
        Ok(Goal {
            id,
            name: required_text("name", &input.name)?,
            icon: required_text("icon", &input.icon)?,
            target_vnd: positive_amount("targetVnd", input.target_vnd)?,
            saved_vnd: saved,
            due_on: checked_due_on(input.due_on)?,
        })
    }

    pub fn apply(self, update: UpdateGoal) -> Result<Goal, EngineError> {
        let target = match update.target_vnd {
            Some(amount) => positive_amount("targetVnd", amount)?,
            None => self.target_vnd,
        };
        let due_on = match update.due_on {
            Some(requested) => checked_due_on(requested)?,
            None => self.due_on,
        };
        Ok(Goal {
            name: updated_text("name", update.name.as_deref(), self.name)?,
            icon: updated_text("icon", update.icon.as_deref(), self.icon)?,
            target_vnd: target,
            due_on,
            ..self
        })
    }

    pub fn contribute(self, amount: Money) -> Result<Goal, EngineError> {
        let amount = positive_amount("amountVnd", amount)?;
        Ok(Goal { saved_vnd: self.saved_vnd + amount, ..self })
    }
}

impl UpdateGoal {
    pub fn changed_columns(&self) -> Vec<&'static str> {
        let given = [
            ("name", self.name.is_some()),
            ("icon", self.icon.is_some()),
            ("target_vnd", self.target_vnd.is_some()),
            ("due_on", self.due_on.is_some()),
        ];
        given.into_iter().filter(|(_, present)| *present).map(|(column, _)| column).collect()
    }
}

fn checked_due_on(due_on: Option<String>) -> Result<Option<String>, EngineError> {
    due_on.map(|text| Date::parse(&text).map(Date::to_text)).transpose()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn new_goal() -> NewGoal {
        NewGoal {
            name: " Quỹ khẩn cấp ".into(),
            icon: "piggy-bank".into(),
            target_vnd: Money(60_000_000),
            saved_vnd: None,
            due_on: None,
        }
    }

    fn goal() -> Goal {
        Goal::from_new("g1".into(), new_goal()).unwrap()
    }

    fn update() -> UpdateGoal {
        UpdateGoal { id: "g1".into(), name: None, icon: None, target_vnd: None, due_on: None }
    }

    #[test]
    fn new_goal_starts_with_nothing_saved_and_a_trimmed_name() {
        let goal = goal();
        assert_eq!(goal.name, "Quỹ khẩn cấp");
        assert_eq!(goal.saved_vnd, Money(0));
        assert_eq!(goal.due_on, None);
    }

    #[test]
    fn new_goal_rejects_bad_target_saved_date_and_name() {
        let cases = [
            NewGoal { target_vnd: Money(0), ..new_goal() },
            NewGoal { saved_vnd: Some(Money(-1)), ..new_goal() },
            NewGoal { due_on: Some("2026-02-30".into()), ..new_goal() },
            NewGoal { name: " ".into(), ..new_goal() },
        ];
        for input in cases {
            assert!(Goal::from_new("g".into(), input).is_err());
        }
    }

    #[test]
    fn contribute_adds_to_saved_and_rejects_non_positive_amounts() {
        let grown = goal().contribute(Money(1_000_000)).unwrap();
        assert_eq!(grown.saved_vnd, Money(1_000_000));
        assert!(goal().contribute(Money(0)).is_err());
        assert!(goal().contribute(Money(-5)).is_err());
    }

    #[test]
    fn contribute_can_pass_the_target() {
        let over = Goal { saved_vnd: Money(59_000_000), ..goal() }.contribute(Money(5_000_000));
        assert_eq!(over.unwrap().saved_vnd, Money(64_000_000));
    }

    #[test]
    fn update_can_set_and_clear_the_due_date() {
        let set = UpdateGoal { due_on: Some(Some("2026-12-20".into())), ..update() };
        let dated = goal().apply(set).unwrap();
        assert_eq!(dated.due_on.as_deref(), Some("2026-12-20"));
        let kept = dated.clone().apply(update()).unwrap();
        assert_eq!(kept.due_on.as_deref(), Some("2026-12-20"));
        let clear = UpdateGoal { due_on: Some(None), ..update() };
        assert_eq!(dated.apply(clear).unwrap().due_on, None);
    }

    #[test]
    fn update_validates_target_and_date() {
        let target = UpdateGoal { target_vnd: Some(Money(0)), ..update() };
        assert!(goal().apply(target).is_err());
        let date = UpdateGoal { due_on: Some(Some("nope".into())), ..update() };
        assert!(goal().apply(date).is_err());
    }

    #[test]
    fn changed_columns_lists_only_given_fields() {
        let change = UpdateGoal { icon: Some("x".into()), due_on: Some(None), ..update() };
        assert_eq!(change.changed_columns(), vec!["icon", "due_on"]);
    }
}
