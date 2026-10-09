use alavo_domain::recipes::filter::RecipeFilter;
use alavo_domain::recipes::recipe::{
    changed_columns, sort_summaries_by_name, Recipe, RecipeBody, RecipeInput, RecipeRecord,
    RecipeSummary, RECIPE_COLUMNS,
};
use alavo_domain::recipes::validation::validate_recipe;
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::hlc::Hlc;
use alavo_domain::sync::events::stamp_fields;
use alavo_infrastructure::persistence::repositories::recipes::ingredients::{
    ingredient_totals, list_ingredients,
};
use alavo_infrastructure::persistence::repositories::recipes::photos::find_photo;
use alavo_infrastructure::persistence::repositories::recipes::records::{
    insert_recipe, list_recipes, soft_delete_recipe, update_recipe,
};
use alavo_infrastructure::persistence::repositories::recipes::steps::list_steps;

use crate::context::Ctx;
use crate::recipes::changes::{record_delete, record_insert, record_update, Entity};
use crate::recipes::children::{insert_children, retire_children};
use crate::recipes::lookup::require_recipe;
use crate::recipes::payloads::recipe_payload;
use crate::recipes::photo::retire_photo;
use crate::recipes::plan::retire_entries_of_recipe;

pub fn list(ctx: &Ctx, filter: RecipeFilter) -> Result<Vec<RecipeSummary>, EngineError> {
    let totals = ingredient_totals(ctx.db)?;
    let mut summaries: Vec<RecipeSummary> = list_recipes(ctx.db)?
        .iter()
        .filter(|record| filter.matches(record))
        .map(|record| record.summary(totals.get(&record.id).copied().unwrap_or_default()))
        .collect();
    sort_summaries_by_name(&mut summaries);
    Ok(summaries)
}

pub fn get(ctx: &Ctx, id: &str) -> Result<Recipe, EngineError> {
    let record = require_recipe(ctx, id)?;
    let ingredients = list_ingredients(ctx.db, id)?;
    let recipe = record.into_recipe(ingredients, list_steps(ctx.db, id)?);
    Ok(recipe.with_photo(find_photo(ctx.db, id)?))
}

pub fn create(ctx: &Ctx, input: RecipeInput) -> Result<Recipe, EngineError> {
    let input = validate_recipe(input)?;
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        let record = RecipeRecord {
            id: ctx.new_id(),
            body: input.body.clone(),
            favorite: false,
            created_at: ctx.now_ms(),
            updated_at: hlc,
            field_updated_at: stamp_fields(None, RECIPE_COLUMNS, Hlc(hlc)),
        };
        insert_recipe(ctx.db, &record)?;
        record_insert(ctx, Entity::recipe(&record.id), &recipe_payload(&record))?;
        insert_children(ctx, &record.id, &input, hlc)?;
        get(ctx, &record.id)
    })
}

/// Replaces the recipe's fields, ingredients and steps. Only the fields whose value changed get
/// a new field-level clock stamp.
pub fn update(ctx: &Ctx, id: &str, input: RecipeInput) -> Result<Recipe, EngineError> {
    let input = validate_recipe(input)?;
    let existing = require_recipe(ctx, id)?;
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        write_body(ctx, existing, input.body.clone(), hlc)?;
        retire_children(ctx, id, hlc)?;
        insert_children(ctx, id, &input, hlc)?;
        get(ctx, id)
    })
}

pub fn set_favorite(ctx: &Ctx, id: &str, favorite: bool) -> Result<Recipe, EngineError> {
    let existing = require_recipe(ctx, id)?;
    if existing.favorite == favorite {
        return get(ctx, id);
    }
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        let record = RecipeRecord {
            favorite,
            updated_at: hlc,
            field_updated_at: stamp_fields(Some(&existing.field_updated_at), &["favorite"], Hlc(hlc)),
            ..existing
        };
        update_recipe(ctx.db, &record)?;
        record_update(ctx, Entity::recipe(id), &["favorite"], &recipe_payload(&record))?;
        get(ctx, id)
    })
}

/// Soft-deletes the recipe together with its ingredients, steps, photo and plan entries.
pub fn delete(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    require_recipe(ctx, id)?;
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        retire_children(ctx, id, hlc)?;
        retire_entries_of_recipe(ctx, id, hlc)?;
        retire_photo(ctx, id, hlc)?;
        soft_delete_recipe(ctx.db, id, hlc)?;
        record_delete(ctx, Entity::recipe(id), hlc)
    })
}

fn write_body(
    ctx: &Ctx,
    existing: RecipeRecord,
    body: RecipeBody,
    hlc: i64,
) -> Result<(), EngineError> {
    let changed = changed_columns(&existing.body, &body);
    let record = RecipeRecord {
        field_updated_at: stamp_fields(Some(&existing.field_updated_at), &changed, Hlc(hlc)),
        body,
        updated_at: hlc,
        ..existing
    };
    update_recipe(ctx.db, &record)?;
    record_update(ctx, Entity::recipe(&record.id), &changed, &recipe_payload(&record))
}

#[cfg(test)]
mod name_only_tests;
#[cfg(test)]
mod tests;
