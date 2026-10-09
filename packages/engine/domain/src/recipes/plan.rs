use serde::{Deserialize, Serialize};

use crate::recipes::kinds::MealSlot;
use crate::recipes::validation::{MAX_SERVINGS, MIN_SERVINGS};
use crate::shared::date::Date;
use crate::shared::error::EngineError;

pub const DEFAULT_PLAN_SERVINGS: i64 = 2;
pub const DEFAULT_PLAN_DAYS: i64 = 7;
pub const MAX_PLAN_DAYS: i64 = 366;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanEntry {
    pub id: String,
    pub date: String,
    pub slot: MealSlot,
    pub recipe_id: String,
    pub recipe_name: String,
    pub recipe_icon: String,
    pub servings: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPlanEntry {
    pub date: String,
    pub slot: MealSlot,
    pub recipe_id: String,
    #[serde(default)]
    pub servings: Option<i64>,
}

impl NewPlanEntry {
    /// Checks the date and returns the servings to plan for, defaulting to two.
    pub fn validated_servings(&self) -> Result<i64, EngineError> {
        Date::parse(&self.date)?;
        let servings = self.servings.unwrap_or(DEFAULT_PLAN_SERVINGS);
        if !(MIN_SERVINGS..=MAX_SERVINGS).contains(&servings) {
            return Err(EngineError::validation(format!(
                "servings must be between {MIN_SERVINGS} and {MAX_SERVINGS}"
            )));
        }
        Ok(servings)
    }
}

/// The first and last date (both included) of `days` days starting at `from`.
pub fn plan_window(from: &str, days: Option<i64>) -> Result<(String, String), EngineError> {
    let start = Date::parse(from)?;
    let days = days.unwrap_or(DEFAULT_PLAN_DAYS);
    if !(1..=MAX_PLAN_DAYS).contains(&days) {
        return Err(EngineError::validation(format!("days must be between 1 and {MAX_PLAN_DAYS}")));
    }
    Ok((start.to_text(), start.add_days(days - 1).to_text()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(date: &str, servings: Option<i64>) -> NewPlanEntry {
        NewPlanEntry {
            date: date.into(),
            slot: MealSlot::Dinner,
            recipe_id: "r1".into(),
            servings,
        }
    }

    #[test]
    fn servings_default_to_two() {
        assert_eq!(entry("2026-10-05", None).validated_servings().unwrap(), 2);
        assert_eq!(entry("2026-10-05", Some(6)).validated_servings().unwrap(), 6);
    }

    #[test]
    fn servings_outside_the_range_are_rejected() {
        assert!(entry("2026-10-05", Some(0)).validated_servings().is_err());
        assert!(entry("2026-10-05", Some(51)).validated_servings().is_err());
    }

    #[test]
    fn an_impossible_date_is_rejected() {
        assert!(entry("2026-02-30", None).validated_servings().is_err());
        assert!(entry("tomorrow", None).validated_servings().is_err());
    }

    #[test]
    fn window_covers_seven_days_by_default_with_an_inclusive_end() {
        let (first, last) = plan_window("2026-10-05", None).unwrap();
        assert_eq!((first.as_str(), last.as_str()), ("2026-10-05", "2026-10-11"));
    }

    #[test]
    fn window_crosses_month_and_year_boundaries() {
        let (_, last) = plan_window("2026-12-29", Some(5)).unwrap();
        assert_eq!(last, "2027-01-02");
        let (first, last) = plan_window("2026-10-05", Some(1)).unwrap();
        assert_eq!(first, last);
    }

    #[test]
    fn window_rejects_bad_day_counts_and_dates() {
        assert!(plan_window("2026-10-05", Some(0)).is_err());
        assert!(plan_window("2026-10-05", Some(-3)).is_err());
        assert!(plan_window("2026-10-05", Some(367)).is_err());
        assert!(plan_window("nope", None).is_err());
    }

    #[test]
    fn plan_entry_json_is_camel_case_with_lowercase_slots() {
        let value = serde_json::to_value(PlanEntry {
            id: "e1".into(),
            date: "2026-10-05".into(),
            slot: MealSlot::Lunch,
            recipe_id: "r1".into(),
            recipe_name: "Cơm tấm".into(),
            recipe_icon: "fork-knife".into(),
            servings: 2,
        })
        .unwrap();
        assert_eq!(value["slot"], "lunch");
        assert_eq!(value["recipeName"], "Cơm tấm");
        assert_eq!(value["recipeIcon"], "fork-knife");
    }
}
