use serde::Serialize;

use crate::recipes::kinds::MealSlot;
use crate::recipes::plan::PlanEntry;
use crate::shared::date::Date;
use crate::shared::error::EngineError;

pub const DEFAULT_REMINDER_DAYS: i64 = 3;
pub const MAX_REMINDER_DAYS: i64 = 7;

const FNV_OFFSET: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MenuSource {
    /// The person planned at least one dish for the day.
    Planned,
    /// Nothing was planned, so one recipe was picked for them.
    Suggested,
    /// Nothing was planned and there are no recipes to pick from.
    Empty,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuDish {
    pub recipe_id: String,
    pub name: String,
    pub icon: String,
    /// The planned meal; absent for a suggestion.
    pub slot: Option<MealSlot>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MorningMenu {
    pub date: String,
    pub source: MenuSource,
    pub dishes: Vec<MenuDish>,
}

impl MorningMenu {
    pub fn planned(date: &str, entries: Vec<PlanEntry>) -> Self {
        let dishes = entries.into_iter().map(MenuDish::from_plan_entry).collect();
        Self { date: date.to_string(), source: MenuSource::Planned, dishes }
    }

    pub fn suggested(date: &str, dish: MenuDish) -> Self {
        Self { date: date.to_string(), source: MenuSource::Suggested, dishes: vec![dish] }
    }

    pub fn empty(date: &str) -> Self {
        Self { date: date.to_string(), source: MenuSource::Empty, dishes: Vec::new() }
    }
}

impl MenuDish {
    fn from_plan_entry(entry: PlanEntry) -> Self {
        Self {
            recipe_id: entry.recipe_id,
            name: entry.recipe_name,
            icon: entry.recipe_icon,
            slot: Some(entry.slot),
        }
    }

    pub fn suggestion(recipe_id: String, name: String, icon: String) -> Self {
        Self { recipe_id, name, icon, slot: None }
    }
}

/// The `days` dates (default 3) from `from` on that get a morning menu.
pub fn reminder_window(from: &str, days: Option<i64>) -> Result<Vec<String>, EngineError> {
    let start = Date::parse(from)?;
    let days = days.unwrap_or(DEFAULT_REMINDER_DAYS);
    if !(1..=MAX_REMINDER_DAYS).contains(&days) {
        return Err(EngineError::validation(format!(
            "days must be between 1 and {MAX_REMINDER_DAYS}"
        )));
    }
    Ok((0..days).map(|offset| start.add_days(offset).to_text()).collect())
}

/// Picks one of `count` recipes for a date. The same date always gives the same index, so the
/// reminders sent at 6, 7, 8 and 9 o'clock all name the same dish.
pub fn suggestion_index(date: &str, count: usize) -> Option<usize> {
    if count == 0 {
        return None;
    }
    let hash = date
        .bytes()
        .fold(FNV_OFFSET, |hash, byte| (hash ^ u64::from(byte)).wrapping_mul(FNV_PRIME));
    Some((hash % count as u64) as usize)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_window_starts_at_the_given_date_and_crosses_a_month_end() {
        let dates = reminder_window("2026-10-30", Some(3)).unwrap();
        assert_eq!(dates, ["2026-10-30", "2026-10-31", "2026-11-01"]);
    }

    #[test]
    fn the_window_defaults_to_three_days_and_rejects_zero_and_too_many() {
        assert_eq!(reminder_window("2026-10-10", None).unwrap().len(), 3);
        assert!(reminder_window("2026-10-10", Some(0)).is_err());
        assert!(reminder_window("2026-10-10", Some(8)).is_err());
    }

    #[test]
    fn there_is_nothing_to_pick_from_an_empty_list() {
        assert_eq!(suggestion_index("2026-10-10", 0), None);
    }

    #[test]
    fn the_same_date_always_picks_the_same_index() {
        assert_eq!(suggestion_index("2026-10-10", 8), suggestion_index("2026-10-10", 8));
    }

    #[test]
    fn the_index_stays_inside_the_list() {
        for day in 1..=31 {
            let date = format!("2026-10-{day:02}");
            assert!(suggestion_index(&date, 5).unwrap() < 5);
        }
    }

    #[test]
    fn a_single_recipe_is_always_the_pick() {
        assert_eq!(suggestion_index("2026-10-10", 1), Some(0));
    }

    #[test]
    fn different_dates_do_not_all_pick_the_same_index() {
        let picks: std::collections::HashSet<_> = (1..=14)
            .map(|day| suggestion_index(&format!("2026-10-{day:02}"), 8).unwrap())
            .collect();
        assert!(picks.len() > 1);
    }
}
