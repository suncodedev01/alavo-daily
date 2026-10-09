use alavo_domain::recipes::filter::RecipeFilter;
use alavo_domain::recipes::kinds::MealSlot;
use alavo_domain::shared::money::Money;

use crate::recipes::catalog;
use crate::recipes::plan::get_plan;
use crate::recipes::shopping::get_list;
use crate::recipes::test_support::{
    all_event_count, create_recipe, event_count, name_only_input, plan_meal, recipe_input,
    with_ctx,
};

#[test]
fn a_recipe_with_only_a_name_is_created_and_fetched() {
    with_ctx(|ctx| {
        let recipe = catalog::create(ctx, name_only_input("Phở")).unwrap();
        assert_eq!(recipe.summary.name, "Phở");
        assert!(recipe.ingredients.is_empty() && recipe.steps.is_empty());
        assert_eq!((recipe.summary.cost_vnd, recipe.summary.ingredient_count), (Money(0), 0));
        assert_eq!(catalog::get(ctx, &recipe.summary.id).unwrap(), recipe);
        assert_eq!(event_count(ctx, "recipe", "insert"), 1);
        assert_eq!(all_event_count(ctx), 1);
    });
}

#[test]
fn a_recipe_with_only_a_name_is_listed_with_zero_cost() {
    with_ctx(|ctx| {
        create_recipe(ctx, "Gà kho");
        catalog::create(ctx, name_only_input("Phở")).unwrap();
        let all = catalog::list(ctx, RecipeFilter::default()).unwrap();
        let names: Vec<_> = all.iter().map(|summary| summary.name.as_str()).collect();
        assert_eq!(names, ["Gà kho", "Phở"]);
        assert_eq!((all[1].cost_vnd, all[1].ingredient_count), (Money(0), 0));
    });
}

#[test]
fn a_recipe_can_be_emptied_down_to_its_name_and_filled_again() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let emptied = catalog::update(ctx, &id, name_only_input("Gà kho")).unwrap();
        assert!(emptied.ingredients.is_empty() && emptied.steps.is_empty());
        assert_eq!(emptied.summary.cost_vnd, Money(0));
        let refilled = catalog::update(ctx, &id, recipe_input("Gà kho")).unwrap();
        assert_eq!((refilled.ingredients.len(), refilled.steps.len()), (2, 2));
    });
}

#[test]
fn a_name_only_recipe_can_be_updated_and_given_ingredients() {
    with_ctx(|ctx| {
        let id = catalog::create(ctx, name_only_input("Phở")).unwrap().summary.id;
        let updated = catalog::update(ctx, &id, recipe_input("Phở bò")).unwrap();
        assert_eq!(updated.summary.name, "Phở bò");
        assert_eq!(updated.ingredients.len(), 2);
    });
}

#[test]
fn a_name_only_recipe_can_be_planned_and_adds_nothing_to_shopping() {
    with_ctx(|ctx| {
        let id = catalog::create(ctx, name_only_input("Phở")).unwrap().summary.id;
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &id);
        let entries = get_plan(ctx, "2026-10-05", None).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].recipe_name, "Phở");
        let list = get_list(ctx, "2026-10-05", "2026-10-11").unwrap();
        assert!(list.items.is_empty());
        assert_eq!((list.needed_count, list.needed_cost_vnd), (0, Money(0)));
    });
}

#[test]
fn a_name_only_recipe_does_not_disturb_the_shopping_of_other_planned_recipes() {
    with_ctx(|ctx| {
        let plain = catalog::create(ctx, name_only_input("Phở")).unwrap().summary.id;
        let full = create_recipe(ctx, "Gà kho").summary.id;
        plan_meal(ctx, "2026-10-07", MealSlot::Lunch, &plain);
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &full);
        let list = get_list(ctx, "2026-10-05", "2026-10-11").unwrap();
        let alone = full_recipe_alone_shopping_cost();
        assert_eq!(list.items.len(), 2);
        assert_eq!(list.needed_cost_vnd, alone);
    });
}

fn full_recipe_alone_shopping_cost() -> Money {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &id);
        get_list(ctx, "2026-10-05", "2026-10-11").unwrap().needed_cost_vnd
    })
}
