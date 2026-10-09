use alavo_domain::recipes::plan::{plan_window, NewPlanEntry, PlanEntry};
use alavo_domain::shared::date::Date;
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::recipes::plan::{
    find_plan_entry, find_same_meal, insert_plan_entry, list_plan_between,
    list_plan_entry_ids_of_recipe, soft_delete_plan_entry,
};

use crate::context::Ctx;
use crate::recipes::changes::{record_delete, record_insert, Entity};
use crate::recipes::lookup::require_recipe;
use crate::recipes::payloads::plan_entry_payload;

/// Entries from `from` for `days` days (default 7), by date, then breakfast, lunch, dinner.
pub fn get_plan(ctx: &Ctx, from: &str, days: Option<i64>) -> Result<Vec<PlanEntry>, EngineError> {
    let (first, last) = plan_window(from, days)?;
    list_plan_between(ctx.db, &first, &last)
}

/// Planning the same recipe twice for one date and slot returns the entry that already exists.
pub fn add_to_plan(ctx: &Ctx, input: NewPlanEntry) -> Result<PlanEntry, EngineError> {
    let servings = input.validated_servings()?;
    let date = Date::parse(&input.date)?.to_text();
    let recipe = require_recipe(ctx, &input.recipe_id)?;
    if let Some(existing) = find_same_meal(ctx.db, &date, input.slot, &recipe.id)? {
        return Ok(existing);
    }
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        let entry = PlanEntry {
            id: ctx.new_id(),
            date,
            slot: input.slot,
            recipe_id: recipe.id,
            recipe_name: recipe.body.name,
            recipe_icon: recipe.body.icon,
            servings,
        };
        insert_plan_entry(ctx.db, &entry, hlc)?;
        record_insert(ctx, Entity::plan_entry(&entry.id), &plan_entry_payload(&entry, hlc))?;
        Ok(entry)
    })
}

pub fn remove_from_plan(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    if find_plan_entry(ctx.db, id)?.is_none() {
        return Err(EngineError::not_found("plan entry", id));
    }
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        soft_delete_plan_entry(ctx.db, id, hlc)?;
        record_delete(ctx, Entity::plan_entry(id), hlc)
    })
}

pub fn retire_entries_of_recipe(ctx: &Ctx, recipe_id: &str, hlc: i64) -> Result<(), EngineError> {
    for id in list_plan_entry_ids_of_recipe(ctx.db, recipe_id)? {
        soft_delete_plan_entry(ctx.db, &id, hlc)?;
        record_delete(ctx, Entity::plan_entry(&id), hlc)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests;
