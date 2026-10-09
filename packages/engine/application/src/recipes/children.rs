//! The ingredients and steps of a recipe. They are always rewritten as a whole: the old rows
//! are soft-deleted and new rows with fresh ids and positions are inserted.

use alavo_domain::recipes::position::positions;
use alavo_domain::recipes::recipe::{Ingredient, IngredientInput, RecipeInput, Step, StepInput};
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::recipes::ingredients::{
    insert_ingredient, list_ingredients, soft_delete_ingredient,
};
use alavo_infrastructure::persistence::repositories::recipes::steps::{
    insert_step, list_steps, soft_delete_step,
};

use crate::context::Ctx;
use crate::recipes::changes::{record_delete, record_insert, Entity};
use crate::recipes::payloads::{ingredient_payload, step_payload};

pub fn insert_children(
    ctx: &Ctx,
    recipe_id: &str,
    input: &RecipeInput,
    hlc: i64,
) -> Result<(), EngineError> {
    insert_ingredients(ctx, recipe_id, &input.ingredients, hlc)?;
    insert_steps(ctx, recipe_id, &input.steps, hlc)
}

pub fn retire_children(ctx: &Ctx, recipe_id: &str, hlc: i64) -> Result<(), EngineError> {
    for ingredient in list_ingredients(ctx.db, recipe_id)? {
        soft_delete_ingredient(ctx.db, &ingredient.id, hlc)?;
        record_delete(ctx, Entity::ingredient(&ingredient.id), hlc)?;
    }
    for step in list_steps(ctx.db, recipe_id)? {
        soft_delete_step(ctx.db, &step.id, hlc)?;
        record_delete(ctx, Entity::step(&step.id), hlc)?;
    }
    Ok(())
}

fn insert_ingredients(
    ctx: &Ctx,
    recipe_id: &str,
    inputs: &[IngredientInput],
    hlc: i64,
) -> Result<(), EngineError> {
    for (input, position) in inputs.iter().zip(positions(inputs.len())) {
        let ingredient = Ingredient {
            id: ctx.new_id(),
            name: input.name.clone(),
            quantity: input.quantity,
            unit: input.unit.clone(),
            aisle: input.aisle,
            cost_vnd: input.cost_vnd,
            position,
        };
        insert_ingredient(ctx.db, recipe_id, &ingredient, hlc)?;
        let payload = ingredient_payload(recipe_id, &ingredient, hlc);
        record_insert(ctx, Entity::ingredient(&ingredient.id), &payload)?;
    }
    Ok(())
}

fn insert_steps(
    ctx: &Ctx,
    recipe_id: &str,
    inputs: &[StepInput],
    hlc: i64,
) -> Result<(), EngineError> {
    for (input, position) in inputs.iter().zip(positions(inputs.len())) {
        let step = Step {
            id: ctx.new_id(),
            text: input.text.clone(),
            timer_min: input.timer_min,
            position,
        };
        insert_step(ctx.db, recipe_id, &step, hlc)?;
        record_insert(ctx, Entity::step(&step.id), &step_payload(recipe_id, &step, hlc))?;
    }
    Ok(())
}
