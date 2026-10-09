use alavo_domain::recipes::photo::validate_photo;
use alavo_domain::recipes::recipe::Recipe;
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::recipes::photos::{
    find_photo, soft_delete_photo, upsert_photo,
};

use crate::context::Ctx;
use crate::recipes::catalog;
use crate::recipes::changes::{record_delete, record_insert, record_update, Entity};
use crate::recipes::lookup::require_recipe;
use crate::recipes::payloads::photo_payload;

/// Sets the recipe's photo, or removes it with `None`. Setting the photo a recipe already has
/// changes nothing.
pub fn set_photo(ctx: &Ctx, id: &str, data_url: Option<&str>) -> Result<Recipe, EngineError> {
    require_recipe(ctx, id)?;
    match data_url {
        Some(data_url) => replace_photo(ctx, id, &validate_photo(data_url)?)?,
        None => remove_photo(ctx, id)?,
    }
    catalog::get(ctx, id)
}

pub fn retire_photo(ctx: &Ctx, recipe_id: &str, hlc: i64) -> Result<(), EngineError> {
    if find_photo(ctx.db, recipe_id)?.is_none() {
        return Ok(());
    }
    soft_delete_photo(ctx.db, recipe_id, hlc)?;
    record_delete(ctx, Entity::photo(recipe_id), hlc)
}

fn replace_photo(ctx: &Ctx, id: &str, data_url: &str) -> Result<(), EngineError> {
    let current = find_photo(ctx.db, id)?;
    if current.as_deref() == Some(data_url) {
        return Ok(());
    }
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        upsert_photo(ctx.db, id, data_url, hlc)?;
        let payload = photo_payload(id, data_url, hlc);
        match current {
            Some(_) => record_update(ctx, Entity::photo(id), &["data_url"], &payload),
            None => record_insert(ctx, Entity::photo(id), &payload),
        }
    })
}

fn remove_photo(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    ctx.transaction(|| {
        let hlc = ctx.tick().value();
        retire_photo(ctx, id, hlc)
    })
}

#[cfg(test)]
mod tests;
