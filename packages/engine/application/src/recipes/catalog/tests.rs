use alavo_domain::recipes::kinds::{Aisle, MealSlot, RecipeLevel};
use alavo_domain::shared::error::ErrorCode;
use alavo_domain::shared::hlc::HLC_EPOCH_MS;
use alavo_domain::shared::money::Money;
use alavo_infrastructure::persistence::repositories::recipes::records::find_recipe;
use alavo_infrastructure::testing::TEST_NOW_MS;
use serde_json::Value;

use super::*;
use crate::recipes::catalog;
use crate::recipes::plan::get_plan;
use crate::recipes::test_support::{
    all_event_count, assert_code, create_recipe, event_count, ingredient, plan_meal,
    recipe_input, with_ctx,
};

fn names(summaries: Vec<RecipeSummary>) -> Vec<String> {
    summaries.into_iter().map(|summary| summary.name).collect()
}

fn stamps(ctx: &Ctx, id: &str) -> Value {
    let record = find_recipe(ctx.db, id).unwrap().unwrap();
    serde_json::from_str(&record.field_updated_at).unwrap()
}

#[test]
fn create_returns_the_recipe_with_ordered_ingredients_and_steps() {
    with_ctx(|ctx| {
        let recipe = create_recipe(ctx, "Gà kho");
        assert_eq!(recipe.summary.name, "Gà kho");
        assert_eq!(recipe.summary.servings, 4);
        assert!(!recipe.summary.favorite);
        let positions: Vec<_> = recipe.ingredients.iter().map(|i| i.position.as_str()).collect();
        assert_eq!(positions, ["0001", "0002"]);
        assert_eq!(recipe.ingredients[0].name, "Đùi gà");
        assert_eq!(recipe.steps[1].text, "Kho");
        assert_eq!(recipe.steps[1].timer_min, 30);
        assert_eq!(recipe.kcal, Some(420));
    });
}

#[test]
fn create_sums_ingredient_costs_and_counts_them() {
    with_ctx(|ctx| {
        let recipe = create_recipe(ctx, "Gà kho");
        assert_eq!(recipe.summary.cost_vnd, Money(57_000));
        assert_eq!(recipe.summary.ingredient_count, 2);
    });
}

#[test]
fn create_stamps_the_times_from_the_clock() {
    with_ctx(|ctx| {
        let recipe = create_recipe(ctx, "Gà kho");
        assert_eq!(recipe.created_at, TEST_NOW_MS);
        assert!(recipe.updated_at >= HLC_EPOCH_MS);
        assert!((recipe.updated_at - TEST_NOW_MS).abs() < 1_000);
    });
}

#[test]
fn create_cleans_the_input_before_saving() {
    with_ctx(|ctx| {
        let mut input = recipe_input("  Gà kho  ");
        input.ingredients.push(ingredient("  ", (1.0, "g"), Aisle::Other, 0));
        input.ingredients[0].unit = " ".into();
        let recipe = catalog::create(ctx, input).unwrap();
        assert_eq!(recipe.summary.name, "Gà kho");
        assert_eq!(recipe.ingredients.len(), 2);
        assert_eq!(recipe.ingredients[0].unit, "phần");
    });
}

#[test]
fn create_rejects_invalid_input_and_writes_nothing() {
    with_ctx(|ctx| {
        let mut bad_inputs = Vec::new();
        for change in [
            |r: &mut RecipeInput| r.body.name = " ".into(),
            |r: &mut RecipeInput| r.body.servings = 0,
            |r: &mut RecipeInput| r.body.servings = 51,
            |r: &mut RecipeInput| r.ingredients[0].quantity = 0.0,
            |r: &mut RecipeInput| r.steps[0].timer_min = -1,
        ] {
            let mut input = recipe_input("Gà kho");
            change(&mut input);
            bad_inputs.push(input);
        }
        for input in bad_inputs {
            assert_code(catalog::create(ctx, input), ErrorCode::Validation);
        }
        assert!(catalog::list(ctx, RecipeFilter::default()).unwrap().is_empty());
        assert_eq!(all_event_count(ctx), 0);
    });
}

#[test]
fn create_appends_one_sync_event_per_row_in_the_same_transaction() {
    with_ctx(|ctx| {
        create_recipe(ctx, "Gà kho");
        assert_eq!(event_count(ctx, "recipe", "insert"), 1);
        assert_eq!(event_count(ctx, "ingredient", "insert"), 2);
        assert_eq!(event_count(ctx, "step", "insert"), 2);
        assert_eq!(all_event_count(ctx), 5);
    });
}

#[test]
fn create_stamps_every_column_for_field_level_merging() {
    with_ctx(|ctx| {
        let recipe = create_recipe(ctx, "Gà kho");
        let stamps = stamps(ctx, &recipe.summary.id);
        for column in RECIPE_COLUMNS {
            assert!(stamps.get(column).is_some(), "{column} has no stamp");
        }
    });
}

#[test]
fn get_returns_what_create_saved() {
    with_ctx(|ctx| {
        let created = create_recipe(ctx, "Gà kho");
        assert_eq!(catalog::get(ctx, &created.summary.id).unwrap(), created);
    });
}

#[test]
fn get_of_an_unknown_id_is_not_found() {
    with_ctx(|ctx| assert_code(catalog::get(ctx, "nope"), ErrorCode::NotFound));
}

#[test]
fn update_replaces_fields_ingredients_and_steps() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let mut input = recipe_input("Gà rang");
        input.body.servings = 2;
        input.body.level = RecipeLevel::Hard;
        input.ingredients = vec![ingredient("Tôm", (300.0, "g"), Aisle::MeatFish, 75_000)];
        input.steps = vec![];
        let updated = catalog::update(ctx, &id, input).unwrap();
        assert_eq!(updated.summary.name, "Gà rang");
        assert_eq!(updated.summary.servings, 2);
        assert_eq!(updated.summary.level, RecipeLevel::Hard);
        assert_eq!(updated.ingredients.len(), 1);
        assert_eq!(updated.ingredients[0].name, "Tôm");
        assert_eq!(updated.ingredients[0].position, "0001");
        assert!(updated.steps.is_empty());
        assert_eq!(updated.summary.cost_vnd, Money(75_000));
        assert_eq!(catalog::get(ctx, &id).unwrap(), updated);
    });
}

#[test]
fn update_keeps_the_id_and_the_creation_time_and_favorite_flag() {
    with_ctx(|ctx| {
        let created = create_recipe(ctx, "Gà kho");
        let id = created.summary.id.clone();
        catalog::set_favorite(ctx, &id, true).unwrap();
        let updated = catalog::update(ctx, &id, recipe_input("Gà rang")).unwrap();
        assert_eq!(updated.summary.id, id);
        assert_eq!(updated.created_at, created.created_at);
        assert!(updated.summary.favorite);
    });
}

#[test]
fn update_soft_deletes_the_old_rows_and_reports_them_as_deleted_events() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        catalog::update(ctx, &id, recipe_input("Gà kho")).unwrap();
        assert_eq!(event_count(ctx, "ingredient", "delete"), 2);
        assert_eq!(event_count(ctx, "step", "delete"), 2);
        assert_eq!(event_count(ctx, "ingredient", "insert"), 4);
        let live = ctx.db.query("SELECT id FROM recipes_ingredients WHERE deleted_at IS NULL", &[]);
        assert_eq!(live.unwrap().len(), 2);
        let all = ctx.db.query("SELECT id FROM recipes_ingredients", &[]);
        assert_eq!(all.unwrap().len(), 4);
    });
}

#[test]
fn update_restamps_only_the_fields_that_changed() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let before = stamps(ctx, &id);
        let mut input = recipe_input("Gà rang");
        input.body.cook_min = 45;
        catalog::update(ctx, &id, input).unwrap();
        let after = stamps(ctx, &id);
        assert!(after["name"].as_i64() > before["name"].as_i64());
        assert!(after["cook_min"].as_i64() > before["cook_min"].as_i64());
        assert_eq!(after["servings"], before["servings"]);
        assert_eq!(after["tags"], before["tags"]);
    });
}

#[test]
fn update_names_the_changed_columns_in_its_sync_event() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let mut input = recipe_input("Gà rang");
        input.body.note = "ít mặn".into();
        catalog::update(ctx, &id, input).unwrap();
        let sql = "SELECT changed_fields FROM hub_delta_events WHERE entity_type = 'recipe' AND action = 'update'";
        let rows = ctx.db.query(sql, &[]).unwrap();
        assert_eq!(rows[0].text("changed_fields").unwrap(), r#"["name","note"]"#);
    });
}

#[test]
fn update_with_invalid_input_changes_nothing() {
    with_ctx(|ctx| {
        let created = create_recipe(ctx, "Gà kho");
        let events = all_event_count(ctx);
        let mut input = recipe_input("Gà rang");
        input.ingredients[0].quantity = -3.0;
        assert_code(catalog::update(ctx, &created.summary.id, input), ErrorCode::Validation);
        assert_eq!(catalog::get(ctx, &created.summary.id).unwrap(), created);
        assert_eq!(all_event_count(ctx), events);
    });
}

#[test]
fn update_of_an_unknown_recipe_is_not_found() {
    with_ctx(|ctx| {
        assert_code(catalog::update(ctx, "nope", recipe_input("A")), ErrorCode::NotFound);
    });
}

#[test]
fn set_favorite_flips_the_flag_and_records_the_changed_field() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        assert!(catalog::set_favorite(ctx, &id, true).unwrap().summary.favorite);
        assert!(!catalog::set_favorite(ctx, &id, false).unwrap().summary.favorite);
        assert_eq!(event_count(ctx, "recipe", "update"), 2);
    });
}

#[test]
fn set_favorite_to_the_current_value_writes_nothing() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let events = all_event_count(ctx);
        assert!(!catalog::set_favorite(ctx, &id, false).unwrap().summary.favorite);
        assert_eq!(all_event_count(ctx), events);
    });
}

#[test]
fn set_favorite_of_an_unknown_recipe_is_not_found() {
    with_ctx(|ctx| assert_code(catalog::set_favorite(ctx, "nope", true), ErrorCode::NotFound));
}

#[test]
fn list_is_ordered_by_name_and_carries_cost_and_ingredient_count() {
    with_ctx(|ctx| {
        create_recipe(ctx, "Phở");
        create_recipe(ctx, "bún chả");
        create_recipe(ctx, "Bánh xèo");
        let all = catalog::list(ctx, RecipeFilter::default()).unwrap();
        assert_eq!(names(all.clone()), ["Bánh xèo", "bún chả", "Phở"]);
        assert_eq!((all[0].cost_vnd, all[0].ingredient_count), (Money(57_000), 2));
    });
}

#[test]
fn list_of_an_empty_catalog_is_empty() {
    with_ctx(|ctx| assert!(catalog::list(ctx, RecipeFilter::default()).unwrap().is_empty()));
}

#[test]
fn list_filters_by_name_ignoring_case() {
    with_ctx(|ctx| {
        create_recipe(ctx, "Gà kho gừng");
        create_recipe(ctx, "Phở bò");
        let filter = RecipeFilter { query: Some("GÀ".into()), tag: None };
        assert_eq!(names(catalog::list(ctx, filter).unwrap()), ["Gà kho gừng"]);
    });
}

#[test]
fn list_filters_by_exact_tag_and_by_favorites() {
    with_ctx(|ctx| {
        let mut soup = recipe_input("Canh chua");
        soup.body.tags = vec!["Canh".into()];
        catalog::create(ctx, soup).unwrap();
        let main = create_recipe(ctx, "Gà kho");
        catalog::set_favorite(ctx, &main.summary.id, true).unwrap();
        let by_tag = RecipeFilter { query: None, tag: Some("Canh".into()) };
        assert_eq!(names(catalog::list(ctx, by_tag).unwrap()), ["Canh chua"]);
        let favorites = RecipeFilter { query: None, tag: Some("favorites".into()) };
        assert_eq!(names(catalog::list(ctx, favorites).unwrap()), ["Gà kho"]);
        let unknown = RecipeFilter { query: None, tag: Some("Món lạ".into()) };
        assert!(catalog::list(ctx, unknown).unwrap().is_empty());
    });
}

#[test]
fn list_combines_name_and_tag() {
    with_ctx(|ctx| {
        create_recipe(ctx, "Gà kho");
        create_recipe(ctx, "Gà nướng");
        let both = RecipeFilter { query: Some("nướng".into()), tag: Some("Món chính".into()) };
        assert_eq!(names(catalog::list(ctx, both).unwrap()), ["Gà nướng"]);
    });
}

#[test]
fn delete_hides_the_recipe_and_its_children_but_keeps_other_recipes() {
    with_ctx(|ctx| {
        let doomed = create_recipe(ctx, "Gà kho").summary.id;
        create_recipe(ctx, "Phở");
        catalog::delete(ctx, &doomed).unwrap();
        assert_code(catalog::get(ctx, &doomed), ErrorCode::NotFound);
        assert_eq!(names(catalog::list(ctx, RecipeFilter::default()).unwrap()), ["Phở"]);
        let live = ctx.db.query("SELECT id FROM recipes_ingredients WHERE deleted_at IS NULL", &[]);
        assert_eq!(live.unwrap().len(), 2);
    });
}

#[test]
fn deleting_a_recipe_removes_its_plan_entries_only() {
    with_ctx(|ctx| {
        let doomed = create_recipe(ctx, "Gà kho").summary.id;
        let kept = create_recipe(ctx, "Phở").summary.id;
        plan_meal(ctx, "2026-10-05", MealSlot::Dinner, &doomed);
        plan_meal(ctx, "2026-10-06", MealSlot::Lunch, &doomed);
        plan_meal(ctx, "2026-10-05", MealSlot::Lunch, &kept);
        catalog::delete(ctx, &doomed).unwrap();
        let entries = get_plan(ctx, "2026-10-05", None).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].recipe_id, kept);
        assert_eq!(event_count(ctx, "plan_entry", "delete"), 2);
    });
}

#[test]
fn delete_records_a_delete_event_for_every_row_it_retires() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        catalog::delete(ctx, &id).unwrap();
        assert_eq!(event_count(ctx, "recipe", "delete"), 1);
        assert_eq!(event_count(ctx, "ingredient", "delete"), 2);
        assert_eq!(event_count(ctx, "step", "delete"), 2);
    });
}

#[test]
fn delete_of_an_unknown_or_already_deleted_recipe_is_not_found() {
    with_ctx(|ctx| {
        assert_code(catalog::delete(ctx, "nope"), ErrorCode::NotFound);
        let id = create_recipe(ctx, "Gà kho").summary.id;
        catalog::delete(ctx, &id).unwrap();
        assert_code(catalog::delete(ctx, &id), ErrorCode::NotFound);
    });
}

#[test]
fn a_deleted_recipe_cannot_be_updated_or_favorited() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        catalog::delete(ctx, &id).unwrap();
        assert_code(catalog::update(ctx, &id, recipe_input("A")), ErrorCode::NotFound);
        assert_code(catalog::set_favorite(ctx, &id, true), ErrorCode::NotFound);
    });
}
