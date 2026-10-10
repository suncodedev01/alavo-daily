use serde::{Deserialize, Serialize};

use crate::shared::error::EngineError;
use crate::spending::validation::{required_text, updated_text};

pub const DEFAULT_PAYMENT_METHOD_ID: &str = "payment-cash";
pub const PAYMENT_ICONS: [&str; 5] = ["money", "bank", "device-mobile", "credit-card", "coins"];

/// How a transaction was paid: cash, bank transfer, card. Separate from the wallet it came from.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentMethod {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub is_default: bool,
    pub position: i64,
    pub transaction_count: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPaymentMethod {
    pub name: String,
    pub icon: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePaymentMethod {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
}

fn checked_icon(icon: &str) -> Result<String, EngineError> {
    if PAYMENT_ICONS.contains(&icon) {
        return Ok(icon.to_string());
    }
    Err(EngineError::validation(format!("icon {icon} is not a payment method icon")))
}

impl PaymentMethod {
    pub fn from_new(
        id: String,
        position: i64,
        input: NewPaymentMethod,
    ) -> Result<PaymentMethod, EngineError> {
        Ok(PaymentMethod {
            id,
            name: required_text("name", &input.name)?,
            icon: checked_icon(&input.icon)?,
            is_default: false,
            position,
            transaction_count: 0,
        })
    }

    pub fn apply(self, update: UpdatePaymentMethod) -> Result<PaymentMethod, EngineError> {
        let icon = match update.icon.as_deref() {
            Some(icon) => checked_icon(icon)?,
            None => self.icon.clone(),
        };
        Ok(PaymentMethod {
            name: updated_text("name", update.name.as_deref(), self.name)?,
            icon,
            ..self
        })
    }

    pub fn can_be_deleted(&self) -> bool {
        !self.is_default
    }
}

impl UpdatePaymentMethod {
    pub fn changed_columns(&self) -> Vec<&'static str> {
        let given = [("name", self.name.is_some()), ("icon", self.icon.is_some())];
        given.into_iter().filter(|(_, present)| *present).map(|(column, _)| column).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn card() -> PaymentMethod {
        let input = NewPaymentMethod { name: " Thẻ Visa ".into(), icon: "credit-card".into() };
        PaymentMethod::from_new("p1".into(), 4, input).unwrap()
    }

    fn update() -> UpdatePaymentMethod {
        UpdatePaymentMethod { id: "p1".into(), name: None, icon: None }
    }

    #[test]
    fn a_new_method_gets_a_trimmed_name_and_is_not_the_default() {
        let method = card();
        assert_eq!((method.name.as_str(), method.is_default, method.position), ("Thẻ Visa", false, 4));
    }

    #[test]
    fn blank_names_and_unknown_icons_are_rejected() {
        let blank = NewPaymentMethod { name: "  ".into(), icon: "money".into() };
        assert!(PaymentMethod::from_new("p".into(), 1, blank).is_err());
        let odd = NewPaymentMethod { name: "Thẻ".into(), icon: "rocket".into() };
        assert!(PaymentMethod::from_new("p".into(), 1, odd).is_err());
    }

    #[test]
    fn apply_changes_only_the_given_fields() {
        let renamed = card().apply(UpdatePaymentMethod { name: Some("Visa".into()), ..update() }).unwrap();
        assert_eq!((renamed.name.as_str(), renamed.icon.as_str()), ("Visa", "credit-card"));
        let bad = card().apply(UpdatePaymentMethod { icon: Some("rocket".into()), ..update() });
        assert!(bad.is_err());
    }

    #[test]
    fn changed_columns_lists_what_was_given() {
        let change = UpdatePaymentMethod { name: Some("x".into()), icon: Some("bank".into()), ..update() };
        assert_eq!(change.changed_columns(), vec!["name", "icon"]);
        assert!(update().changed_columns().is_empty());
    }

    #[test]
    fn only_the_default_method_cannot_be_deleted() {
        assert!(card().can_be_deleted());
        assert!(!PaymentMethod { is_default: true, ..card() }.can_be_deleted());
    }
}
