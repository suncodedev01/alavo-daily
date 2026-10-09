//! Sync event payloads: one JSON object per row, keyed by column name, so a device applying
//! the event can write the columns as they are.

use alavo_domain::recipes::plan::PlanEntry;
use alavo_domain::recipes::recipe::{Ingredient, RecipeRecord, Step};
use alavo_domain::recipes::shopping::CustomItem;
use serde_json::{json, Value};

pub fn recipe_payload(record: &RecipeRecord) -> Value {
    let body = &record.body;
    json!({
        "id": record.id,
        "name": body.name,
        "tags": body.tags,
        "prep_min": body.prep_min,
        "cook_min": body.cook_min,
        "servings": body.servings,
        "level": body.level.as_str(),
        "favorite": record.favorite,
        "icon": body.icon,
        "kcal": body.kcal,
        "note": body.note,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
        "field_updated_at": record.field_updated_at,
    })
}

pub fn ingredient_payload(recipe_id: &str, ingredient: &Ingredient, updated_at: i64) -> Value {
    json!({
        "id": ingredient.id,
        "recipe_id": recipe_id,
        "name": ingredient.name,
        "quantity": ingredient.quantity,
        "unit": ingredient.unit,
        "aisle": ingredient.aisle.as_str(),
        "cost_vnd": ingredient.cost_vnd.vnd(),
        "position": ingredient.position,
        "updated_at": updated_at,
    })
}

pub fn step_payload(recipe_id: &str, step: &Step, updated_at: i64) -> Value {
    json!({
        "id": step.id,
        "recipe_id": recipe_id,
        "text": step.text,
        "timer_min": step.timer_min,
        "position": step.position,
        "updated_at": updated_at,
    })
}

pub fn plan_entry_payload(entry: &PlanEntry, updated_at: i64) -> Value {
    json!({
        "id": entry.id,
        "planned_on": entry.date,
        "slot": entry.slot.as_str(),
        "recipe_id": entry.recipe_id,
        "servings": entry.servings,
        "updated_at": updated_at,
    })
}

pub fn custom_item_payload(item: &CustomItem, updated_at: i64) -> Value {
    json!({
        "id": item.id,
        "name": item.name,
        "quantity": item.quantity,
        "unit": item.unit,
        "aisle": item.aisle.as_str(),
        "updated_at": updated_at,
    })
}

pub fn have_flag_payload(key: &str, have: bool, updated_at: i64) -> Value {
    json!({ "id": key, "have": have, "updated_at": updated_at })
}
