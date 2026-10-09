//! Reads a schema.org Recipe from JSON-LD, the format recipe sites embed for search engines.

mod duration;
mod ingredient_line;
mod instructions;
mod quantity;
mod text;
mod units;

use serde_json::{Map, Value};

use crate::recipes::json_ld::duration::parse_duration_minutes;
use crate::recipes::json_ld::ingredient_line::parse_ingredient_line;
use crate::recipes::json_ld::instructions::parse_steps;
use crate::recipes::json_ld::text::{clean_text, first_integer};
use crate::recipes::kinds::RecipeLevel;
use crate::recipes::recipe::{IngredientInput, RecipeBody, RecipeInput, DEFAULT_ICON};
use crate::recipes::validation::{MAX_SERVINGS, MIN_SERVINGS};
use crate::shared::error::EngineError;

const DEFAULT_SERVINGS: i64 = 2;
const MAX_TAGS: usize = 10;
const RECIPE_TYPE: &str = "Recipe";

/// `Ok(None)` when the document is valid JSON but holds no Recipe. The result is a draft for
/// the recipe form: it is not validated, so a missing name stays empty.
pub fn parse_recipe(json: &str) -> Result<Option<RecipeInput>, EngineError> {
    let document: Value = serde_json::from_str(json)
        .map_err(|error| EngineError::validation(format!("invalid JSON-LD: {error}")))?;
    Ok(find_recipe(&document).map(draft_from))
}

fn find_recipe(node: &Value) -> Option<&Map<String, Value>> {
    match node {
        Value::Array(items) => items.iter().find_map(find_recipe),
        Value::Object(object) if is_recipe(object) => Some(object),
        Value::Object(object) => object.get("@graph").and_then(find_recipe),
        _ => None,
    }
}

fn is_recipe(object: &Map<String, Value>) -> bool {
    match object.get("@type") {
        Some(Value::String(kind)) => is_recipe_type(kind),
        Some(Value::Array(kinds)) => kinds.iter().filter_map(Value::as_str).any(is_recipe_type),
        _ => false,
    }
}

fn is_recipe_type(kind: &str) -> bool {
    kind.rsplit(['/', ':']).next() == Some(RECIPE_TYPE)
}

fn draft_from(recipe: &Map<String, Value>) -> RecipeInput {
    let (prep_min, cook_min) = times(recipe);
    RecipeInput {
        body: RecipeBody {
            name: text_field(recipe, "name"),
            tags: tags(recipe),
            prep_min,
            cook_min,
            servings: servings(recipe),
            level: RecipeLevel::default(),
            icon: DEFAULT_ICON.to_string(),
            kcal: calories(recipe),
            note: text_field(recipe, "description"),
        },
        ingredients: ingredients(recipe),
        steps: parse_steps(recipe.get("recipeInstructions")),
    }
}

fn text_field(recipe: &Map<String, Value>, key: &str) -> String {
    recipe.get(key).and_then(Value::as_str).map(clean_text).unwrap_or_default()
}

fn minutes_field(recipe: &Map<String, Value>, key: &str) -> Option<i64> {
    recipe.get(key).and_then(Value::as_str).and_then(parse_duration_minutes)
}

/// Prep and cook minutes. A site that only gives a total gets it counted as cooking time.
fn times(recipe: &Map<String, Value>) -> (i64, i64) {
    let prep = minutes_field(recipe, "prepTime").unwrap_or(0);
    let cook = minutes_field(recipe, "cookTime").unwrap_or(0);
    match minutes_field(recipe, "totalTime") {
        Some(total) if prep == 0 && cook == 0 => (0, total),
        _ => (prep, cook),
    }
}

fn servings(recipe: &Map<String, Value>) -> i64 {
    let yield_count = recipe.get("recipeYield").and_then(yield_count).unwrap_or(DEFAULT_SERVINGS);
    yield_count.clamp(MIN_SERVINGS, MAX_SERVINGS)
}

fn yield_count(value: &Value) -> Option<i64> {
    match value {
        Value::Number(number) => number.as_f64().map(|count| count.round() as i64),
        Value::String(text) => first_integer(text),
        Value::Array(items) => items.iter().find_map(yield_count),
        _ => None,
    }
}

fn calories(recipe: &Map<String, Value>) -> Option<i64> {
    match recipe.get("nutrition")?.get("calories")? {
        Value::Number(number) => number.as_f64().map(|calories| calories.round() as i64),
        Value::String(text) => first_integer(text),
        _ => None,
    }
}

fn ingredients(recipe: &Map<String, Value>) -> Vec<IngredientInput> {
    let lines = recipe.get("recipeIngredient").or_else(|| recipe.get("ingredients"));
    let lines = lines.map(string_values).unwrap_or_default();
    let ingredients = lines.iter().filter(|line| !clean_text(line).is_empty());
    ingredients.map(|line| parse_ingredient_line(line)).collect()
}

fn tags(recipe: &Map<String, Value>) -> Vec<String> {
    let mut tags: Vec<String> = Vec::new();
    for key in ["recipeCategory", "keywords"] {
        let words = recipe.get(key).map(string_values).unwrap_or_default();
        for tag in words.iter().flat_map(|word| word.split(',')).map(clean_text) {
            if !tag.is_empty() && !tags.iter().any(|own| own.to_lowercase() == tag.to_lowercase()) {
                tags.push(tag);
            }
        }
    }
    tags.truncate(MAX_TAGS);
    tags
}

fn string_values(value: &Value) -> Vec<String> {
    match value {
        Value::String(text) => vec![text.clone()],
        Value::Array(items) => items.iter().filter_map(Value::as_str).map(String::from).collect(),
        _ => Vec::new(),
    }
}

#[cfg(test)]
mod tests;
