use serde::{Deserialize, Serialize};

use crate::recipes::kinds::{Aisle, RecipeLevel};
use crate::shared::hlc::Hlc;
use crate::shared::money::Money;

pub const DEFAULT_ICON: &str = "cooking-pot";
pub const DEFAULT_UNIT: &str = "phần";

/// Columns of `recipes_recipes` that take part in field-level merging.
pub const RECIPE_COLUMNS: &[&str] = &[
    "name", "tags", "prep_min", "cook_min", "servings", "level", "favorite", "icon", "kcal", "note",
];

fn default_icon() -> String {
    DEFAULT_ICON.to_string()
}

fn default_unit() -> String {
    DEFAULT_UNIT.to_string()
}

/// The editable fields of a recipe, without its ingredients and steps.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecipeBody {
    pub name: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub prep_min: i64,
    #[serde(default)]
    pub cook_min: i64,
    pub servings: i64,
    #[serde(default)]
    pub level: RecipeLevel,
    #[serde(default = "default_icon")]
    pub icon: String,
    #[serde(default)]
    pub kcal: Option<i64>,
    #[serde(default)]
    pub note: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngredientInput {
    pub name: String,
    pub quantity: f64,
    #[serde(default = "default_unit")]
    pub unit: String,
    #[serde(default)]
    pub aisle: Aisle,
    #[serde(default)]
    pub cost_vnd: Money,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepInput {
    pub text: String,
    #[serde(default)]
    pub timer_min: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecipeInput {
    #[serde(flatten)]
    pub body: RecipeBody,
    pub ingredients: Vec<IngredientInput>,
    #[serde(default)]
    pub steps: Vec<StepInput>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ingredient {
    pub id: String,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub aisle: Aisle,
    pub cost_vnd: Money,
    pub position: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Step {
    pub id: String,
    pub text: String,
    pub timer_min: i64,
    pub position: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecipeSummary {
    pub id: String,
    pub name: String,
    pub tags: Vec<String>,
    pub prep_min: i64,
    pub cook_min: i64,
    pub servings: i64,
    pub level: RecipeLevel,
    pub favorite: bool,
    pub icon: String,
    pub cost_vnd: Money,
    pub ingredient_count: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Recipe {
    #[serde(flatten)]
    pub summary: RecipeSummary,
    pub kcal: Option<i64>,
    pub note: String,
    pub ingredients: Vec<Ingredient>,
    pub steps: Vec<Step>,
    /// A data URL. Only `recipes.get` carries it: the list stays light.
    pub photo: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Recipe {
    pub fn with_photo(self, photo: Option<String>) -> Recipe {
        Recipe { photo, ..self }
    }
}

/// One row of `recipes_recipes`. `updated_at` is a clock value, `created_at` is milliseconds.
#[derive(Debug, Clone, PartialEq)]
pub struct RecipeRecord {
    pub id: String,
    pub body: RecipeBody,
    pub favorite: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub field_updated_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct IngredientTotals {
    pub cost: Money,
    pub count: i64,
}

impl IngredientTotals {
    pub fn of(ingredients: &[Ingredient]) -> IngredientTotals {
        IngredientTotals {
            cost: ingredients.iter().map(|ingredient| ingredient.cost_vnd).sum(),
            count: ingredients.len() as i64,
        }
    }
}

impl RecipeRecord {
    pub fn summary(&self, totals: IngredientTotals) -> RecipeSummary {
        let body = &self.body;
        RecipeSummary {
            id: self.id.clone(),
            name: body.name.clone(),
            tags: body.tags.clone(),
            prep_min: body.prep_min,
            cook_min: body.cook_min,
            servings: body.servings,
            level: body.level,
            favorite: self.favorite,
            icon: body.icon.clone(),
            cost_vnd: totals.cost,
            ingredient_count: totals.count,
        }
    }

    pub fn into_recipe(self, ingredients: Vec<Ingredient>, steps: Vec<Step>) -> Recipe {
        let summary = self.summary(IngredientTotals::of(&ingredients));
        Recipe {
            summary,
            kcal: self.body.kcal,
            note: self.body.note,
            ingredients,
            steps,
            photo: None,
            created_at: self.created_at,
            updated_at: Hlc(self.updated_at).physical_ms(),
        }
    }
}

/// Columns whose value differs, so only those get a fresh field-level clock stamp.
pub fn changed_columns(old: &RecipeBody, new: &RecipeBody) -> Vec<&'static str> {
    let checks = [
        ("name", old.name != new.name),
        ("tags", old.tags != new.tags),
        ("prep_min", old.prep_min != new.prep_min),
        ("cook_min", old.cook_min != new.cook_min),
        ("servings", old.servings != new.servings),
        ("level", old.level != new.level),
        ("icon", old.icon != new.icon),
        ("kcal", old.kcal != new.kcal),
        ("note", old.note != new.note),
    ];
    checks.into_iter().filter(|(_, changed)| *changed).map(|(column, _)| column).collect()
}

pub fn sort_summaries_by_name(summaries: &mut [RecipeSummary]) {
    summaries.sort_by_cached_key(|summary| (summary.name.to_lowercase(), summary.name.clone()));
}

#[cfg(test)]
pub(crate) mod tests {
    use serde_json::json;

    use super::*;
    use crate::shared::hlc::HLC_EPOCH_MS;

    pub fn body(name: &str) -> RecipeBody {
        RecipeBody {
            name: name.to_string(),
            tags: vec!["Canh".to_string()],
            prep_min: 10,
            cook_min: 20,
            servings: 4,
            level: RecipeLevel::Easy,
            icon: DEFAULT_ICON.to_string(),
            kcal: None,
            note: String::new(),
        }
    }

    pub fn record(id: &str, name: &str) -> RecipeRecord {
        RecipeRecord {
            id: id.into(),
            body: body(name),
            favorite: false,
            created_at: 0,
            updated_at: 0,
            field_updated_at: "{}".into(),
        }
    }

    fn ingredient(cost: i64) -> Ingredient {
        Ingredient {
            id: "i".into(),
            name: "x".into(),
            quantity: 1.0,
            unit: "g".into(),
            aisle: Aisle::Other,
            cost_vnd: Money(cost),
            position: "0001".into(),
        }
    }

    #[test]
    fn input_json_uses_camel_case_and_applies_defaults() {
        let input: RecipeInput = serde_json::from_value(json!({
            "name": "Canh chua", "servings": 4,
            "ingredients": [{ "name": "Cá", "quantity": 500, "aisle": "meat_fish" }]
        }))
        .unwrap();
        assert_eq!(input.body.level, RecipeLevel::Medium);
        assert_eq!(input.body.icon, "cooking-pot");
        assert_eq!(input.ingredients[0].unit, "phần");
        assert_eq!(input.ingredients[0].cost_vnd, Money(0));
        assert!(input.steps.is_empty());
    }

    #[test]
    fn input_serializes_flat_like_the_typescript_contract() {
        let input = RecipeInput { body: body("A"), ingredients: vec![], steps: vec![] };
        let value = serde_json::to_value(&input).unwrap();
        assert_eq!(value["prepMin"], 10);
        assert_eq!(value["kcal"], serde_json::Value::Null);
        assert!(value.get("body").is_none());
    }

    #[test]
    fn totals_sum_costs_and_count_rows() {
        let totals = IngredientTotals::of(&[ingredient(1000), ingredient(2500)]);
        assert_eq!(totals, IngredientTotals { cost: Money(3500), count: 2 });
        assert_eq!(IngredientTotals::of(&[]), IngredientTotals::default());
    }

    #[test]
    fn recipe_json_flattens_the_summary_and_reports_milliseconds() {
        let mut stored = record("r1", "Gà kho");
        stored.favorite = true;
        stored.updated_at = Hlc::from_parts(HLC_EPOCH_MS + 7_000, 3).value();
        let value = serde_json::to_value(stored.into_recipe(vec![ingredient(1000)], vec![]));
        let value = value.unwrap();
        assert_eq!(value["costVnd"], 1000);
        assert_eq!(value["ingredientCount"], 1);
        assert_eq!(value["favorite"], true);
        assert_eq!(value["updatedAt"], HLC_EPOCH_MS + 7_000);
    }

    #[test]
    fn a_recipe_has_no_photo_until_one_is_attached() {
        let bare = record("r1", "Gà kho").into_recipe(vec![], vec![]);
        assert_eq!(serde_json::to_value(&bare).unwrap()["photo"], serde_json::Value::Null);
        let with = bare.with_photo(Some("data:image/jpeg;base64,AAAA".into()));
        assert_eq!(serde_json::to_value(&with).unwrap()["photo"], "data:image/jpeg;base64,AAAA");
    }

    #[test]
    fn changed_columns_lists_only_differences() {
        let old = body("A");
        let mut new = body("A");
        assert!(changed_columns(&old, &new).is_empty());
        new.name = "B".into();
        new.servings = 2;
        new.kcal = Some(100);
        assert_eq!(changed_columns(&old, &new), ["name", "servings", "kcal"]);
    }

    #[test]
    fn summaries_sort_by_name_ignoring_case() {
        let summary = |id: &str, name: &str| record(id, name).summary(IngredientTotals::default());
        let mut list = vec![summary("1", "bún chả"), summary("2", "Bánh xèo"), summary("3", "Canh")];
        sort_summaries_by_name(&mut list);
        let names: Vec<_> = list.iter().map(|summary| summary.name.as_str()).collect();
        assert_eq!(names, ["Bánh xèo", "bún chả", "Canh"]);
    }
}
