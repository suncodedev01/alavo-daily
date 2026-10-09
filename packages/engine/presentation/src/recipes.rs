use alavo_application::recipes::{catalog, expense, import, morning_menu, plan, shopping};
use alavo_application::Ctx;
use alavo_domain::recipes::expense::LogShoppingExpense;
use alavo_domain::recipes::filter::RecipeFilter;
use alavo_domain::recipes::plan::NewPlanEntry;
use alavo_domain::recipes::recipe::RecipeInput;
use alavo_domain::recipes::shopping::NewShoppingItem;
use serde::Deserialize;
use serde_json::json;

use crate::util::{with_input, Handled};

#[derive(Deserialize)]
struct Id {
    id: String,
}

#[derive(Deserialize)]
struct UpdateRecipe {
    id: String,
    #[serde(flatten)]
    recipe: RecipeInput,
}

#[derive(Deserialize)]
struct SetFavorite {
    id: String,
    favorite: bool,
}

#[derive(Deserialize)]
struct JsonLd {
    json: String,
}

#[derive(Deserialize)]
struct PlanRange {
    from: String,
    #[serde(default)]
    days: Option<i64>,
}

#[derive(Deserialize)]
struct MenuRange {
    from: String,
    #[serde(default)]
    days: Option<i64>,
}

#[derive(Deserialize)]
struct DateRange {
    from: String,
    to: String,
}

#[derive(Deserialize)]
struct HaveFlag {
    key: String,
    have: bool,
}

#[derive(Deserialize)]
struct Key {
    key: String,
}

/// Commands named `recipes.*`.
pub fn handle(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    let result = match command {
        "recipes.list" => with_input(payload, |input: RecipeFilter| catalog::list(ctx, input)),
        "recipes.get" => with_input(payload, |input: Id| catalog::get(ctx, &input.id)),
        "recipes.create" => with_input(payload, |input: RecipeInput| catalog::create(ctx, input)),
        "recipes.update" => with_input(payload, |input: UpdateRecipe| {
            catalog::update(ctx, &input.id, input.recipe)
        }),
        "recipes.delete" => with_input(payload, |input: Id| {
            catalog::delete(ctx, &input.id).map(|_| json!({}))
        }),
        "recipes.set_favorite" => with_input(payload, |input: SetFavorite| {
            catalog::set_favorite(ctx, &input.id, input.favorite)
        }),
        "recipes.parse_json_ld" => {
            with_input(payload, |input: JsonLd| import::parse_json_ld(&input.json))
        }
        _ => return handle_plan_and_shopping(ctx, command, payload),
    };
    Some(result)
}

fn handle_plan_and_shopping(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "recipes.get_plan" => {
            with_input(payload, |input: PlanRange| plan::get_plan(ctx, &input.from, input.days))
        }
        "recipes.morning_menus" => with_input(payload, |input: MenuRange| {
            morning_menu::get_many(ctx, &input.from, input.days)
        }),
        "recipes.add_to_plan" => {
            with_input(payload, |input: NewPlanEntry| plan::add_to_plan(ctx, input))
        }
        "recipes.remove_from_plan" => with_input(payload, |input: Id| {
            plan::remove_from_plan(ctx, &input.id).map(|_| json!({}))
        }),
        "recipes.get_shopping_list" => with_input(payload, |input: DateRange| {
            shopping::get_list(ctx, &input.from, &input.to)
        }),
        "recipes.set_shopping_have" => with_input(payload, |input: HaveFlag| {
            shopping::set_have(ctx, &input.key, input.have).map(|_| json!({}))
        }),
        "recipes.add_shopping_item" => with_input(payload, |input: NewShoppingItem| {
            shopping::add_item(ctx, input).map(|_| json!({}))
        }),
        "recipes.remove_shopping_item" => with_input(payload, |input: Key| {
            shopping::remove_item(ctx, &input.key).map(|_| json!({}))
        }),
        "recipes.log_shopping_expense" => with_input(payload, |input: LogShoppingExpense| {
            expense::log_shopping_expense(ctx, input)
        }),
        _ => return None,
    })
}

#[cfg(test)]
mod test_harness;
#[cfg(test)]
mod catalog_tests;
#[cfg(test)]
mod planning_tests;
