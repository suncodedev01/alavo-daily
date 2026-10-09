use serde::{Deserialize, Serialize};

use crate::shared::error::EngineError;

/// Where an ingredient is bought. Declaration order is the order of the shopping list.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default, Serialize, Deserialize,
)]
#[serde(rename_all = "snake_case")]
pub enum Aisle {
    MeatFish,
    Vegetables,
    Spices,
    #[default]
    Other,
}

impl Aisle {
    pub fn as_str(self) -> &'static str {
        match self {
            Aisle::MeatFish => "meat_fish",
            Aisle::Vegetables => "vegetables",
            Aisle::Spices => "spices",
            Aisle::Other => "other",
        }
    }

    pub fn parse(text: &str) -> Result<Aisle, EngineError> {
        match text {
            "meat_fish" => Ok(Aisle::MeatFish),
            "vegetables" => Ok(Aisle::Vegetables),
            "spices" => Ok(Aisle::Spices),
            "other" => Ok(Aisle::Other),
            _ => Err(EngineError::validation(format!("unknown aisle {text}"))),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecipeLevel {
    Easy,
    #[default]
    Medium,
    Hard,
}

impl RecipeLevel {
    pub fn as_str(self) -> &'static str {
        match self {
            RecipeLevel::Easy => "easy",
            RecipeLevel::Medium => "medium",
            RecipeLevel::Hard => "hard",
        }
    }

    pub fn parse(text: &str) -> Result<RecipeLevel, EngineError> {
        match text {
            "easy" => Ok(RecipeLevel::Easy),
            "medium" => Ok(RecipeLevel::Medium),
            "hard" => Ok(RecipeLevel::Hard),
            _ => Err(EngineError::validation(format!("unknown level {text}"))),
        }
    }
}

/// A meal of the day. Declaration order is the order inside one day of the plan.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MealSlot {
    Breakfast,
    Lunch,
    Dinner,
}

impl MealSlot {
    pub fn as_str(self) -> &'static str {
        match self {
            MealSlot::Breakfast => "breakfast",
            MealSlot::Lunch => "lunch",
            MealSlot::Dinner => "dinner",
        }
    }

    pub fn parse(text: &str) -> Result<MealSlot, EngineError> {
        match text {
            "breakfast" => Ok(MealSlot::Breakfast),
            "lunch" => Ok(MealSlot::Lunch),
            "dinner" => Ok(MealSlot::Dinner),
            _ => Err(EngineError::validation(format!("unknown meal slot {text}"))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aisles_round_trip_through_text_and_json() {
        for aisle in [Aisle::MeatFish, Aisle::Vegetables, Aisle::Spices, Aisle::Other] {
            assert_eq!(Aisle::parse(aisle.as_str()).unwrap(), aisle);
            let json = serde_json::to_string(&aisle).unwrap();
            assert_eq!(json, format!("\"{}\"", aisle.as_str()));
        }
    }

    #[test]
    fn aisles_sort_in_shopping_order() {
        let mut aisles = vec![Aisle::Other, Aisle::Spices, Aisle::MeatFish, Aisle::Vegetables];
        aisles.sort();
        assert_eq!(aisles, [Aisle::MeatFish, Aisle::Vegetables, Aisle::Spices, Aisle::Other]);
    }

    #[test]
    fn levels_and_slots_round_trip_and_reject_unknown_text() {
        for level in [RecipeLevel::Easy, RecipeLevel::Medium, RecipeLevel::Hard] {
            assert_eq!(RecipeLevel::parse(level.as_str()).unwrap(), level);
        }
        for slot in [MealSlot::Breakfast, MealSlot::Lunch, MealSlot::Dinner] {
            assert_eq!(MealSlot::parse(slot.as_str()).unwrap(), slot);
        }
        assert!(RecipeLevel::parse("Dễ").is_err());
        assert!(MealSlot::parse("brunch").is_err());
        assert!(Aisle::parse("Gia vị").is_err());
    }

    #[test]
    fn slots_sort_from_breakfast_to_dinner() {
        assert!(MealSlot::Breakfast < MealSlot::Lunch);
        assert!(MealSlot::Lunch < MealSlot::Dinner);
    }
}
