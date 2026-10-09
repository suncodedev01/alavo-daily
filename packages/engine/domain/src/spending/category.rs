use serde::{Deserialize, Serialize};

use crate::shared::error::EngineError;
use crate::shared::money::Money;
use crate::shared::serde_util::double_option;
use crate::spending::validation::{positive_amount, required_text, updated_text};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CategoryKind {
    Expense,
    Income,
}

impl CategoryKind {
    pub fn as_str(self) -> &'static str {
        match self {
            CategoryKind::Expense => "expense",
            CategoryKind::Income => "income",
        }
    }

    pub fn parse(text: &str) -> Result<CategoryKind, EngineError> {
        match text {
            "expense" => Ok(CategoryKind::Expense),
            "income" => Ok(CategoryKind::Income),
            other => Err(EngineError::db(format!("unknown category kind {other}"))),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub kind: CategoryKind,
    pub budget_vnd: Option<Money>,
    pub is_fixed: bool,
    pub position: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewCategory {
    pub name: String,
    pub icon: String,
    pub kind: CategoryKind,
    #[serde(default)]
    pub budget_vnd: Option<Money>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCategory {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub budget_vnd: Option<Option<Money>>,
}

impl Category {
    pub fn from_new(
        id: String,
        position: i64,
        input: NewCategory,
    ) -> Result<Category, EngineError> {
        Ok(Category {
            id,
            name: required_text("name", &input.name)?,
            icon: required_text("icon", &input.icon)?,
            kind: input.kind,
            budget_vnd: without_budget_for_income(input.kind, checked_budget(input.budget_vnd)?),
            is_fixed: false,
            position,
        })
    }

    pub fn apply(self, update: UpdateCategory) -> Result<Category, EngineError> {
        let budget = match update.budget_vnd {
            Some(requested) => checked_budget(requested)?,
            None => self.budget_vnd,
        };
        Ok(Category {
            name: updated_text("name", update.name.as_deref(), self.name)?,
            icon: updated_text("icon", update.icon.as_deref(), self.icon)?,
            budget_vnd: without_budget_for_income(self.kind, budget),
            ..self
        })
    }
}

impl UpdateCategory {
    pub fn changed_columns(&self) -> Vec<&'static str> {
        let mut columns = Vec::new();
        if self.name.is_some() {
            columns.push("name");
        }
        if self.icon.is_some() {
            columns.push("icon");
        }
        if self.budget_vnd.is_some() {
            columns.push("budget_vnd");
        }
        columns
    }
}

fn checked_budget(budget: Option<Money>) -> Result<Option<Money>, EngineError> {
    budget.map(|amount| positive_amount("budgetVnd", amount)).transpose()
}

fn without_budget_for_income(kind: CategoryKind, budget: Option<Money>) -> Option<Money> {
    match kind {
        CategoryKind::Expense => budget,
        CategoryKind::Income => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn new_category(kind: CategoryKind, budget: Option<i64>) -> NewCategory {
        NewCategory {
            name: " Cà phê ".into(),
            icon: "coffee".into(),
            kind,
            budget_vnd: budget.map(Money),
        }
    }

    fn food() -> Category {
        let input = new_category(CategoryKind::Expense, Some(500_000));
        Category::from_new("c1".into(), 1, input).unwrap()
    }

    fn update(id: &str) -> UpdateCategory {
        UpdateCategory { id: id.into(), name: None, icon: None, budget_vnd: None }
    }

    #[test]
    fn new_category_trims_the_name_and_is_not_fixed() {
        let category = food();
        assert_eq!(category.name, "Cà phê");
        assert!(!category.is_fixed);
        assert_eq!(category.budget_vnd, Some(Money(500_000)));
    }

    #[test]
    fn new_category_rejects_blank_name_blank_icon_and_non_positive_budget() {
        let base = || new_category(CategoryKind::Expense, None);
        let blank_name = NewCategory { name: "  ".into(), ..base() };
        let blank_icon = NewCategory { icon: "".into(), ..base() };
        assert!(Category::from_new("c".into(), 1, blank_name).is_err());
        assert!(Category::from_new("c".into(), 1, blank_icon).is_err());
        for amount in [0, -1] {
            let input = new_category(CategoryKind::Expense, Some(amount));
            assert!(Category::from_new("c".into(), 1, input).is_err());
        }
    }

    #[test]
    fn income_categories_drop_any_budget() {
        let input = new_category(CategoryKind::Income, Some(9));
        let income = Category::from_new("c".into(), 1, input).unwrap();
        assert_eq!(income.budget_vnd, None);
        let change = UpdateCategory { budget_vnd: Some(Some(Money(5))), ..update("c") };
        assert_eq!(income.apply(change).unwrap().budget_vnd, None);
    }

    #[test]
    fn update_can_set_clear_and_leave_the_budget() {
        let kept = food().apply(update("c1")).unwrap();
        assert_eq!(kept.budget_vnd, Some(Money(500_000)));
        let clear = UpdateCategory { budget_vnd: Some(None), ..update("c1") };
        assert_eq!(food().apply(clear).unwrap().budget_vnd, None);
        let set = UpdateCategory { budget_vnd: Some(Some(Money(7))), ..update("c1") };
        assert_eq!(food().apply(set).unwrap().budget_vnd, Some(Money(7)));
    }

    #[test]
    fn update_validates_given_fields() {
        let blank = UpdateCategory { name: Some(" ".into()), ..update("c1") };
        assert!(food().apply(blank).is_err());
        let zero = UpdateCategory { budget_vnd: Some(Some(Money(0))), ..update("c1") };
        assert!(food().apply(zero).is_err());
    }

    #[test]
    fn changed_columns_lists_only_given_fields() {
        let both =
            UpdateCategory { name: Some("x".into()), budget_vnd: Some(None), ..update("c1") };
        assert_eq!(both.changed_columns(), vec!["name", "budget_vnd"]);
        assert!(update("c1").changed_columns().is_empty());
    }

    #[test]
    fn kind_round_trips_through_text() {
        assert_eq!(CategoryKind::parse("income").unwrap(), CategoryKind::Income);
        assert_eq!(CategoryKind::Expense.as_str(), "expense");
        assert!(CategoryKind::parse("other").is_err());
    }

    #[test]
    fn update_payload_tells_null_from_missing() {
        let cleared: UpdateCategory =
            serde_json::from_str(r#"{"id":"c","budgetVnd":null}"#).unwrap();
        let missing: UpdateCategory = serde_json::from_str(r#"{"id":"c"}"#).unwrap();
        assert_eq!(cleared.budget_vnd, Some(None));
        assert_eq!(missing.budget_vnd, None);
    }
}
