use alavo_domain::recipes::recipe::RecipeRecord;
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::recipes::records::find_recipe;

use crate::context::Ctx;

pub fn require_recipe(ctx: &Ctx, id: &str) -> Result<RecipeRecord, EngineError> {
    find_recipe(ctx.db, id)?.ok_or_else(|| EngineError::not_found("recipe", id))
}
