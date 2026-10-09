//! Proposes dishes for the empty meals of a date range. Nothing is saved: the person looks at
//! the proposal and applies it through the normal plan commands.

mod pick;
mod random;

use serde::{Deserialize, Serialize};

use crate::recipes::kinds::MealSlot;
use crate::recipes::plan::{plan_window, PlanEntry};
use crate::recipes::recipe::RecipeRecord;
use crate::shared::date::Date;
use crate::shared::error::EngineError;
use pick::{fill, Fill};

/// The same recipe is never proposed twice with fewer than this many days between the two.
pub const REPEAT_GAP_DAYS: i64 = 3;

const DEFAULT_SLOTS: [MealSlot; 2] = [MealSlot::Lunch, MealSlot::Dinner];

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestRequest {
    pub from: String,
    #[serde(default)]
    pub days: Option<i64>,
    /// Meals to fill; lunch and dinner when absent.
    #[serde(default)]
    pub slots: Option<Vec<MealSlot>>,
    /// Another seed gives another proposal for the same range.
    #[serde(default)]
    pub seed: Option<u64>,
    /// Meals the caller has proposed elsewhere: they count for spacing and variety but are not
    /// returned.
    #[serde(default)]
    pub also_planned: Vec<PlannedSlot>,
    /// Recipes not to propose, unless that would leave nothing to propose.
    #[serde(default)]
    pub avoid: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlannedSlot {
    pub date: String,
    pub slot: MealSlot,
    pub recipe_id: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestedEntry {
    pub date: String,
    pub slot: MealSlot,
    pub recipe_id: String,
    pub recipe_name: String,
    pub recipe_icon: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Candidate {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub tags: Vec<String>,
    pub favorite: bool,
}

/// A calendar day as days since 1970-01-01, and a meal of that day.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub(crate) struct Spot {
    pub day: i64,
    pub slot: MealSlot,
}

#[derive(Debug, Clone)]
pub(crate) struct Placed {
    pub spot: Spot,
    pub recipe_id: String,
}

impl Candidate {
    pub fn from_record(record: RecipeRecord) -> Candidate {
        Candidate {
            id: record.id,
            name: record.body.name,
            icon: record.body.icon,
            tags: record.body.tags,
            favorite: record.favorite,
        }
    }

    /// Two dishes with the same first tag (for example "Món chính") are alike.
    pub(crate) fn primary_tag(&self) -> Option<&str> {
        self.tags.first().map(String::as_str)
    }
}

impl PlannedSlot {
    pub fn of_entry(entry: &PlanEntry) -> PlannedSlot {
        PlannedSlot {
            date: entry.date.clone(),
            slot: entry.slot,
            recipe_id: entry.recipe_id.clone(),
        }
    }
}

impl SuggestRequest {
    /// The dates whose existing plan matters: the range plus the days around it that the
    /// spacing rule looks at.
    pub fn context_window(&self) -> Result<(String, String), EngineError> {
        let (first, last) = plan_window(&self.from, self.days)?;
        let before = Date::parse(&first)?.add_days(-REPEAT_GAP_DAYS);
        let after = Date::parse(&last)?.add_days(REPEAT_GAP_DAYS);
        Ok((before.to_text(), after.to_text()))
    }

    fn slots_to_fill(&self) -> Result<Vec<MealSlot>, EngineError> {
        let mut slots = self.slots.clone().unwrap_or_else(|| DEFAULT_SLOTS.to_vec());
        if slots.is_empty() {
            return Err(EngineError::validation("slots must not be empty"));
        }
        slots.sort();
        slots.dedup();
        Ok(slots)
    }

    fn open_spots(&self) -> Result<Vec<Spot>, EngineError> {
        let (first, last) = plan_window(&self.from, self.days)?;
        let (first, last) = (Date::parse(&first)?.to_days(), Date::parse(&last)?.to_days());
        let slots = self.slots_to_fill()?;
        Ok((first..=last)
            .flat_map(|day| slots.iter().map(move |slot| Spot { day, slot: *slot }))
            .collect())
    }
}

/// Proposes one dish for every meal of the range that has none yet. `existing` is the saved plan
/// around the range. Meals are filled in date order and the result is the same for the same
/// request, recipes and plan.
pub fn suggest_entries(
    request: &SuggestRequest,
    recipes: &[Candidate],
    existing: &[PlannedSlot],
) -> Result<Vec<SuggestedEntry>, EngineError> {
    let open = request.open_spots()?;
    let mut placed = placed_from(existing)?;
    placed.extend(placed_from(&request.also_planned)?);
    let picks = fill(Fill {
        recipes,
        placed,
        open,
        avoid: &request.avoid,
        seed: request.seed.unwrap_or(0),
    });
    Ok(picks
        .into_iter()
        .map(|pick| SuggestedEntry {
            date: Date::from_days(pick.spot.day).to_text(),
            slot: pick.spot.slot,
            recipe_id: pick.recipe.id.clone(),
            recipe_name: pick.recipe.name.clone(),
            recipe_icon: pick.recipe.icon.clone(),
        })
        .collect())
}

fn placed_from(entries: &[PlannedSlot]) -> Result<Vec<Placed>, EngineError> {
    entries
        .iter()
        .map(|entry| {
            let day = Date::parse(&entry.date)?.to_days();
            Ok(Placed { spot: Spot { day, slot: entry.slot }, recipe_id: entry.recipe_id.clone() })
        })
        .collect()
}

#[cfg(test)]
mod tests;
