mod data;

use alavo_domain::recipes::kinds::MealSlot;
use alavo_domain::recipes::plan::NewPlanEntry;
use alavo_domain::recipes::recipe::{IngredientInput, RecipeBody, RecipeInput, StepInput};
use alavo_domain::shared::date::Date;
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_infrastructure::persistence::repositories::hub::{get_setting, set_setting};

use crate::context::Ctx;
use crate::recipes::{catalog, plan};
use data::{SampleDay, SampleRecipe, COST_UNIT_VND, SAMPLE_RECIPES, SAMPLE_WEEK};

const DEMO_KEY: &str = "demo.recipes";
const MS_PER_DAY: i64 = 86_400_000;
const SLOTS: [MealSlot; 3] = [MealSlot::Breakfast, MealSlot::Lunch, MealSlot::Dinner];

/// Fills the module with sample data for a first look. Safe to call twice: the second call
/// finds the `demo.recipes` setting and does nothing.
pub fn load(ctx: &Ctx) -> Result<(), EngineError> {
    if get_setting(ctx.db, DEMO_KEY)?.is_some() {
        return Ok(());
    }
    ctx.transaction(|| {
        let created = create_sample_recipes(ctx)?;
        plan_sample_week(ctx, &created)?;
        set_setting(ctx.db, DEMO_KEY, "true", ctx.now_ms())
    })
}

/// The Monday of the week that holds the UTC date of `now_ms`.
fn monday_of_week(now_ms: i64) -> Date {
    let days = now_ms.div_euclid(MS_PER_DAY);
    let days_since_monday = (days + 3).rem_euclid(7);
    Date::from_days(days - days_since_monday)
}

/// Sample recipe key and the id the recipe got.
type CreatedRecipes = Vec<(&'static str, String)>;

fn create_sample_recipes(ctx: &Ctx) -> Result<CreatedRecipes, EngineError> {
    let mut created = Vec::with_capacity(SAMPLE_RECIPES.len());
    for sample in SAMPLE_RECIPES {
        let recipe = catalog::create(ctx, input_from(sample))?;
        if sample.favorite {
            catalog::set_favorite(ctx, &recipe.summary.id, true)?;
        }
        created.push((sample.key, recipe.summary.id));
    }
    Ok(created)
}

fn plan_sample_week(ctx: &Ctx, created: &CreatedRecipes) -> Result<(), EngineError> {
    let monday = monday_of_week(ctx.now_ms());
    for (offset, day) in SAMPLE_WEEK.iter().enumerate() {
        plan_day(ctx, created, &monday.add_days(offset as i64).to_text(), day)?;
    }
    Ok(())
}

fn plan_day(
    ctx: &Ctx,
    created: &CreatedRecipes,
    date: &str,
    day: &SampleDay,
) -> Result<(), EngineError> {
    for (slot, keys) in SLOTS.iter().zip(day) {
        for key in *keys {
            let entry = NewPlanEntry {
                date: date.to_string(),
                slot: *slot,
                recipe_id: recipe_id_for(created, key)?,
                servings: None,
            };
            plan::add_to_plan(ctx, entry)?;
        }
    }
    Ok(())
}

fn recipe_id_for(created: &CreatedRecipes, key: &str) -> Result<String, EngineError> {
    created
        .iter()
        .find(|(own, _)| *own == key)
        .map(|(_, id)| id.clone())
        .ok_or_else(|| EngineError::internal(format!("sample week names unknown recipe {key}")))
}

fn input_from(sample: &SampleRecipe) -> RecipeInput {
    RecipeInput {
        body: RecipeBody {
            name: sample.name.to_string(),
            tags: sample.tags.iter().map(|tag| tag.to_string()).collect(),
            prep_min: sample.prep_min,
            cook_min: sample.cook_min,
            servings: sample.servings,
            level: sample.level,
            icon: sample.icon.to_string(),
            kcal: Some(sample.kcal),
            note: String::new(),
        },
        ingredients: sample.ingredients.iter().map(ingredient_input).collect(),
        steps: sample.steps.iter().map(step_input).collect(),
    }
}

fn ingredient_input(sample: &data::SampleIngredient) -> IngredientInput {
    let (name, quantity, unit, aisle, cost) = *sample;
    IngredientInput {
        name: name.to_string(),
        quantity,
        unit: unit.to_string(),
        aisle,
        cost_vnd: Money(cost * COST_UNIT_VND),
    }
}

fn step_input(sample: &data::SampleStep) -> StepInput {
    StepInput { text: sample.0.to_string(), timer_min: sample.1 }
}

#[cfg(test)]
mod tests;
