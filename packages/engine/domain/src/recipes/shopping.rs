pub mod merge;

use serde::{Deserialize, Serialize};

use crate::recipes::kinds::Aisle;
use crate::recipes::recipe::DEFAULT_UNIT;
use crate::shared::error::EngineError;
use crate::shared::money::Money;

pub use merge::{build_shopping_list, PlannedMeal, ShoppingSources};

const DEFAULT_CUSTOM_QUANTITY: f64 = 1.0;

/// `<name>|<unit>`, trimmed. Two ingredients with the same key are bought as one line.
pub fn shopping_key(name: &str, unit: &str) -> String {
    format!("{}|{}", name.trim(), unit.trim())
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShoppingItem {
    pub key: String,
    pub name: String,
    pub unit: String,
    pub aisle: Aisle,
    pub quantity: f64,
    pub cost_vnd: Money,
    pub from: Vec<String>,
    pub have: bool,
    pub custom: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShoppingList {
    pub from: String,
    pub to: String,
    pub items: Vec<ShoppingItem>,
    pub needed_count: i64,
    pub needed_cost_vnd: Money,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewShoppingItem {
    pub name: String,
    #[serde(default)]
    pub quantity: Option<f64>,
    #[serde(default)]
    pub unit: Option<String>,
    #[serde(default)]
    pub aisle: Option<Aisle>,
}

/// An item the user typed into the shopping list by hand.
#[derive(Debug, Clone, PartialEq)]
pub struct CustomItem {
    pub id: String,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub aisle: Aisle,
}

impl CustomItem {
    pub fn key(&self) -> String {
        shopping_key(&self.name, &self.unit)
    }
}

impl NewShoppingItem {
    pub fn into_custom(self, id: String) -> Result<CustomItem, EngineError> {
        let name = self.name.trim().to_string();
        if name.is_empty() {
            return Err(EngineError::validation("shopping item name must not be empty"));
        }
        let quantity = self.quantity.unwrap_or(DEFAULT_CUSTOM_QUANTITY);
        if !quantity.is_finite() || quantity <= 0.0 {
            return Err(EngineError::validation("shopping item quantity must be above 0"));
        }
        let unit = self.unit.as_deref().map(str::trim).filter(|unit| !unit.is_empty());
        Ok(CustomItem {
            id,
            name,
            quantity,
            unit: unit.unwrap_or(DEFAULT_UNIT).to_string(),
            aisle: self.aisle.unwrap_or_default(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn new_item(name: &str) -> NewShoppingItem {
        NewShoppingItem { name: name.into(), quantity: None, unit: None, aisle: None }
    }

    #[test]
    fn key_joins_trimmed_name_and_unit() {
        assert_eq!(shopping_key(" Đùi gà ", " g "), "Đùi gà|g");
    }

    #[test]
    fn key_is_case_sensitive() {
        assert_ne!(shopping_key("Gừng", "g"), shopping_key("gừng", "g"));
    }

    #[test]
    fn custom_item_defaults_to_one_portion_in_other() {
        let item = new_item(" Sữa ").into_custom("c1".into()).unwrap();
        assert_eq!(item.name, "Sữa");
        assert_eq!(item.quantity, 1.0);
        assert_eq!(item.unit, "phần");
        assert_eq!(item.aisle, Aisle::Other);
        assert_eq!(item.key(), "Sữa|phần");
    }

    #[test]
    fn custom_item_keeps_what_the_user_gave() {
        let item = NewShoppingItem {
            name: "Muối".into(),
            quantity: Some(0.5),
            unit: Some("kg".into()),
            aisle: Some(Aisle::Spices),
        }
        .into_custom("c1".into())
        .unwrap();
        assert_eq!((item.quantity, item.unit.as_str(), item.aisle), (0.5, "kg", Aisle::Spices));
    }

    #[test]
    fn custom_item_rejects_blank_name_and_bad_quantity() {
        assert!(new_item("  ").into_custom("c".into()).is_err());
        for quantity in [0.0, -2.0, f64::NAN] {
            let item = NewShoppingItem { quantity: Some(quantity), ..new_item("Sữa") };
            assert!(item.into_custom("c".into()).is_err());
        }
    }

    #[test]
    fn blank_unit_falls_back_to_the_default() {
        let item = NewShoppingItem { unit: Some("  ".into()), ..new_item("Sữa") };
        assert_eq!(item.into_custom("c".into()).unwrap().unit, "phần");
    }
}
