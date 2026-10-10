use serde::Deserialize;

use crate::shared::error::EngineError;
use crate::shared::money::Money;
use crate::spending::estimate::{Estimate, EstimateItem, ExpectedIncome, Factor, Priority};
use crate::spending::validation::required_text;

pub const CONTINGENCY_CHOICES: [i64; 5] = [0, 5, 10, 15, 20];
pub const DEFAULT_CONTINGENCY_PERCENT: i64 = 10;
const MAX_FACTOR_VALUE: i64 = 100_000;
const MAX_QUANTITY: i64 = 100_000;

fn default_contingency() -> i64 {
    DEFAULT_CONTINGENCY_PERCENT
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewFactor {
    pub label: String,
    pub value: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewEstimate {
    pub name: String,
    pub icon: String,
    #[serde(default = "default_contingency")]
    pub contingency_percent: i64,
    #[serde(default)]
    pub wallet_ids: Vec<String>,
    #[serde(default)]
    pub factors: Vec<NewFactor>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEstimate {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub contingency_percent: Option<i64>,
    #[serde(default)]
    pub wallet_ids: Option<Vec<String>>,
}

/// Creates the factor when `id` is empty, otherwise changes it.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFactor {
    pub estimate_id: String,
    #[serde(default)]
    pub id: Option<String>,
    pub label: String,
    pub value: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveItem {
    pub estimate_id: String,
    #[serde(default)]
    pub id: Option<String>,
    pub group: String,
    pub name: String,
    pub price: Money,
    #[serde(default = "one")]
    pub quantity: i64,
    pub priority: Priority,
    #[serde(default)]
    pub by: Vec<String>,
}

fn one() -> i64 {
    1
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveIncome {
    pub estimate_id: String,
    #[serde(default)]
    pub id: Option<String>,
    pub label: String,
    pub amount: Money,
}

/// Where a payment made through the estimate is written in the spending ledger.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordPayment {
    pub category_id: String,
    pub wallet_id: String,
    pub occurred_on: String,
    #[serde(default)]
    pub payment_method_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetItemPaid {
    pub id: String,
    pub paid: Money,
    /// Present when the payment was not recorded yet: the increase is added to the ledger as an
    /// expense. Absent when the person already recorded it, so it is not counted twice.
    #[serde(default)]
    pub record: Option<RecordPayment>,
}

pub fn checked_contingency(percent: i64) -> Result<i64, EngineError> {
    if CONTINGENCY_CHOICES.contains(&percent) {
        return Ok(percent);
    }
    Err(EngineError::validation("contingency must be 0, 5, 10, 15 or 20 percent"))
}

fn checked_factor_value(value: i64) -> Result<i64, EngineError> {
    if (1..=MAX_FACTOR_VALUE).contains(&value) {
        return Ok(value);
    }
    Err(EngineError::validation("a factor must be between 1 and 100000"))
}

impl Estimate {
    pub fn from_new(id: String, input: NewEstimate, factor_ids: Vec<String>) -> Result<Estimate, EngineError> {
        let factors = input
            .factors
            .iter()
            .zip(factor_ids)
            .map(|(factor, id)| factor_from(id, &factor.label, factor.value))
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Estimate {
            id,
            name: required_text("name", &input.name)?,
            icon: required_text("icon", &input.icon)?,
            contingency_percent: checked_contingency(input.contingency_percent)?,
            wallet_ids: input.wallet_ids,
            factors,
            items: Vec::new(),
            income: Vec::new(),
        })
    }

    pub fn apply(self, update: UpdateEstimate) -> Result<Estimate, EngineError> {
        let contingency_percent = match update.contingency_percent {
            Some(percent) => checked_contingency(percent)?,
            None => self.contingency_percent,
        };
        Ok(Estimate {
            name: match update.name.as_deref() {
                Some(name) => required_text("name", name)?,
                None => self.name,
            },
            icon: match update.icon.as_deref() {
                Some(icon) => required_text("icon", icon)?,
                None => self.icon,
            },
            contingency_percent,
            wallet_ids: update.wallet_ids.unwrap_or(self.wallet_ids),
            ..self
        })
    }

    /// The factor ids an item may multiply by: only ones this estimate really has.
    pub fn known_factors(&self, wanted: &[String]) -> Vec<String> {
        wanted.iter().filter(|id| self.factors.iter().any(|factor| &factor.id == *id)).cloned().collect()
    }
}

impl UpdateEstimate {
    pub fn changed_columns(&self) -> Vec<&'static str> {
        let given = [
            ("name", self.name.is_some()),
            ("icon", self.icon.is_some()),
            ("contingency_percent", self.contingency_percent.is_some()),
            ("wallet_ids", self.wallet_ids.is_some()),
        ];
        given.into_iter().filter(|(_, present)| *present).map(|(column, _)| column).collect()
    }
}

pub fn factor_from(id: String, label: &str, value: i64) -> Result<Factor, EngineError> {
    Ok(Factor { id, label: required_text("label", label)?, value: checked_factor_value(value)? })
}

pub fn item_from(id: String, estimate: &Estimate, input: &SaveItem, paid: Money) -> Result<EstimateItem, EngineError> {
    if input.price.is_negative() {
        return Err(EngineError::validation("price must not be negative"));
    }
    if !(1..=MAX_QUANTITY).contains(&input.quantity) {
        return Err(EngineError::validation("quantity must be between 1 and 100000"));
    }
    Ok(EstimateItem {
        id,
        group: required_text("group", &input.group)?,
        name: required_text("name", &input.name)?,
        price: input.price,
        quantity: input.quantity,
        priority: input.priority,
        by: estimate.known_factors(&input.by),
        paid,
    })
}

pub fn income_from(id: String, input: &SaveIncome) -> Result<ExpectedIncome, EngineError> {
    if input.amount.is_negative() {
        return Err(EngineError::validation("amount must not be negative"));
    }
    Ok(ExpectedIncome { id, label: required_text("label", &input.label)?, amount: input.amount })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn new_estimate() -> NewEstimate {
        NewEstimate {
            name: " Du lịch ".into(),
            icon: "airplane-tilt".into(),
            contingency_percent: 10,
            wallet_ids: vec!["w1".into()],
            factors: vec![NewFactor { label: "người".into(), value: 2 }, NewFactor { label: "ngày".into(), value: 4 }],
        }
    }

    fn estimate() -> Estimate {
        Estimate::from_new("e1".into(), new_estimate(), vec!["f1".into(), "f2".into()]).unwrap()
    }

    fn save_item() -> SaveItem {
        SaveItem {
            estimate_id: "e1".into(),
            id: None,
            group: "Đi lại".into(),
            name: "Vé máy bay".into(),
            price: Money(1_800_000),
            quantity: 1,
            priority: Priority::Must,
            by: vec!["f1".into(), "gone".into()],
        }
    }

    #[test]
    fn a_new_estimate_gets_a_trimmed_name_and_its_starting_factors() {
        let plan = estimate();
        assert_eq!(plan.name, "Du lịch");
        let factors: Vec<(&str, i64)> = plan.factors.iter().map(|f| (f.label.as_str(), f.value)).collect();
        assert_eq!(factors, [("người", 2), ("ngày", 4)]);
        assert!(plan.items.is_empty() && plan.income.is_empty());
    }

    #[test]
    fn the_contingency_must_be_one_of_the_offered_percents() {
        assert!(checked_contingency(15).is_ok());
        assert!(checked_contingency(0).is_ok());
        assert!(checked_contingency(12).is_err());
        let bad = NewEstimate { contingency_percent: 50, ..new_estimate() };
        assert!(Estimate::from_new("e".into(), bad, vec!["a".into(), "b".into()]).is_err());
    }

    #[test]
    fn blank_names_and_labels_are_rejected() {
        assert!(Estimate::from_new("e".into(), NewEstimate { name: " ".into(), ..new_estimate() }, vec![]).is_err());
        assert!(factor_from("f".into(), "  ", 2).is_err());
        assert!(income_from("i".into(), &SaveIncome { estimate_id: "e".into(), id: None, label: "".into(), amount: Money(1) }).is_err());
    }

    #[test]
    fn a_factor_must_be_at_least_one() {
        assert!(factor_from("f".into(), "khách", 0).is_err());
        assert!(factor_from("f".into(), "khách", 1).is_ok());
        assert!(factor_from("f".into(), "khách", 100_001).is_err());
    }

    #[test]
    fn an_item_keeps_only_the_factors_the_estimate_has() {
        let item = item_from("a".into(), &estimate(), &save_item(), Money(0)).unwrap();
        assert_eq!(item.by, vec!["f1"]);
    }

    #[test]
    fn an_item_needs_a_name_a_group_a_price_of_zero_or_more_and_a_quantity_of_one_or_more() {
        let plan = estimate();
        let blank = SaveItem { name: " ".into(), ..save_item() };
        assert!(item_from("a".into(), &plan, &blank, Money(0)).is_err());
        let negative = SaveItem { price: Money(-1), ..save_item() };
        assert!(item_from("a".into(), &plan, &negative, Money(0)).is_err());
        let none = SaveItem { quantity: 0, ..save_item() };
        assert!(item_from("a".into(), &plan, &none, Money(0)).is_err());
        let free = SaveItem { price: Money(0), ..save_item() };
        assert!(item_from("a".into(), &plan, &free, Money(0)).is_ok());
    }

    #[test]
    fn apply_changes_only_what_was_given() {
        let update = UpdateEstimate {
            id: "e1".into(),
            name: Some("Chuyến đi".into()),
            icon: None,
            contingency_percent: Some(15),
            wallet_ids: None,
        };
        let columns = update.changed_columns();
        let changed = estimate().apply(update).unwrap();
        assert_eq!((changed.name.as_str(), changed.contingency_percent), ("Chuyến đi", 15));
        assert_eq!(changed.wallet_ids, vec!["w1"]);
        assert_eq!(columns, vec!["name", "contingency_percent"]);
    }

    #[test]
    fn expected_income_cannot_be_negative() {
        let input = SaveIncome { estimate_id: "e".into(), id: None, label: "Thưởng".into(), amount: Money(-5) };
        assert!(income_from("i".into(), &input).is_err());
    }
}
