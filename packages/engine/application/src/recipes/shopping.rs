use std::collections::HashMap;

use alavo_domain::recipes::plan::PlanEntry;
use alavo_domain::recipes::recipe::Ingredient;
use alavo_domain::recipes::shopping::{
    build_shopping_list, NewShoppingItem, PlannedMeal, ShoppingList, ShoppingSources,
};
use alavo_domain::shared::date::Date;
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::recipes::ingredients::list_ingredients;
use alavo_infrastructure::persistence::repositories::recipes::plan::list_plan_between;
use alavo_infrastructure::persistence::repositories::recipes::shopping::{
    find_have_flag, insert_custom_item, list_custom_items, list_have_flags,
    soft_delete_custom_item, upsert_have_flag,
};

use crate::context::Ctx;
use crate::recipes::changes::{record_delete, record_insert, record_update, Entity};
use crate::recipes::lookup::require_recipe;
use crate::recipes::payloads::{custom_item_payload, have_flag_payload};

struct RecipeLines {
    servings: i64,
    ingredients: Vec<Ingredient>,
}

/// Plan entries with `from <= date <= to` merged by `name|unit`, plus the hand-added items.
pub fn get_list(ctx: &Ctx, from: &str, to: &str) -> Result<ShoppingList, EngineError> {
    let first = Date::parse(from)?.to_text();
    let last = Date::parse(to)?.to_text();
    let entries = list_plan_between(ctx.db, &first, &last)?;
    let sources = ShoppingSources {
        meals: load_meals(ctx, &entries)?,
        custom_items: list_custom_items(ctx.db)?,
        have_flags: list_have_flags(ctx.db)?,
    };
    Ok(build_shopping_list(&first, &last, &sources))
}

pub fn set_have(ctx: &Ctx, key: &str, have: bool) -> Result<(), EngineError> {
    if key.trim().is_empty() {
        return Err(EngineError::validation("shopping key must not be empty"));
    }
    ctx.transaction(|| {
        let existed = find_have_flag(ctx.db, key)?.is_some();
        let hlc = ctx.tick().value();
        upsert_have_flag(ctx.db, key, have, hlc)?;
        let payload = have_flag_payload(key, have, hlc);
        let entity = Entity::shopping_state(key);
        if existed {
            record_update(ctx, entity, &["have"], &payload)
        } else {
            record_insert(ctx, entity, &payload)
        }
    })
}

pub fn add_item(ctx: &Ctx, input: NewShoppingItem) -> Result<(), EngineError> {
    let item = input.into_custom(ctx.new_id())?;
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        insert_custom_item(ctx.db, &item, hlc)?;
        record_insert(ctx, Entity::shopping_item(&item.id), &custom_item_payload(&item, hlc))
    })
}

/// Removes the hand-added items with this key. A line that comes only from the plan has nothing
/// to remove: take the recipe off the plan instead.
pub fn remove_item(ctx: &Ctx, key: &str) -> Result<(), EngineError> {
    let items: Vec<_> =
        list_custom_items(ctx.db)?.into_iter().filter(|item| item.key() == key).collect();
    if items.is_empty() {
        return Err(EngineError::validation(format!("{key} is not a hand-added shopping item")));
    }
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        for item in &items {
            soft_delete_custom_item(ctx.db, &item.id, hlc)?;
            record_delete(ctx, Entity::shopping_item(&item.id), hlc)?;
        }
        Ok(())
    })
}

fn load_meals(ctx: &Ctx, entries: &[PlanEntry]) -> Result<Vec<PlannedMeal>, EngineError> {
    let mut recipes: HashMap<&str, RecipeLines> = HashMap::new();
    let mut meals = Vec::with_capacity(entries.len());
    for entry in entries {
        if !recipes.contains_key(entry.recipe_id.as_str()) {
            recipes.insert(&entry.recipe_id, load_recipe_lines(ctx, &entry.recipe_id)?);
        }
        let lines = &recipes[entry.recipe_id.as_str()];
        meals.push(PlannedMeal {
            recipe_name: entry.recipe_name.clone(),
            recipe_servings: lines.servings,
            servings: entry.servings,
            ingredients: lines.ingredients.clone(),
        });
    }
    Ok(meals)
}

fn load_recipe_lines(ctx: &Ctx, recipe_id: &str) -> Result<RecipeLines, EngineError> {
    let record = require_recipe(ctx, recipe_id)?;
    let ingredients = list_ingredients(ctx.db, recipe_id)?;
    Ok(RecipeLines { servings: record.body.servings, ingredients })
}

#[cfg(test)]
mod tests;
