use alavo_domain::shared::error::ErrorCode;

use super::*;
use alavo_domain::recipes::kinds::MealSlot;

use crate::recipes::test_support::{
    all_event_count, assert_code, create_recipe, event_count, plan_meal, with_ctx,
};

fn request(date: &str, slot: MealSlot, recipe_id: &str, servings: Option<i64>) -> NewPlanEntry {
    NewPlanEntry { date: date.into(), slot, recipe_id: recipe_id.into(), servings }
}

fn dates_and_slots(entries: &[PlanEntry]) -> Vec<(String, MealSlot)> {
    entries.iter().map(|entry| (entry.date.clone(), entry.slot)).collect()
}

#[test]
fn adding_to_the_plan_returns_the_entry_with_the_recipe_name_and_icon() {
    with_ctx(|ctx| {
        let recipe = create_recipe(ctx, "Gà kho");
        let entry = plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &recipe.summary.id);
        assert_eq!(entry.recipe_name, "Gà kho");
        assert_eq!(entry.recipe_icon, "cooking-pot");
        assert_eq!((entry.date.as_str(), entry.slot), ("2026-10-07", MealSlot::Dinner));
    });
}

#[test]
fn servings_default_to_two_when_absent() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let entry = add_to_plan(ctx, request("2026-10-07", MealSlot::Dinner, &id, None)).unwrap();
        assert_eq!(entry.servings, 2);
    });
}

#[test]
fn explicit_servings_are_kept() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let entry = add_to_plan(ctx, request("2026-10-07", MealSlot::Dinner, &id, Some(5)));
        assert_eq!(entry.unwrap().servings, 5);
    });
}

#[test]
fn adding_the_same_recipe_twice_to_one_date_and_slot_returns_the_first_entry() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let first = plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &id);
        let events = all_event_count(ctx);
        let second = add_to_plan(ctx, request("2026-10-07", MealSlot::Dinner, &id, Some(6)));
        assert_eq!(second.unwrap(), first);
        assert_eq!(get_plan(ctx, "2026-10-07", Some(1)).unwrap().len(), 1);
        assert_eq!(all_event_count(ctx), events);
    });
}

#[test]
fn the_same_recipe_may_be_planned_in_another_slot_or_on_another_day() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &id);
        plan_meal(ctx, "2026-10-07", MealSlot::Lunch, &id);
        plan_meal(ctx, "2026-10-08", MealSlot::Dinner, &id);
        assert_eq!(get_plan(ctx, "2026-10-07", None).unwrap().len(), 3);
    });
}

#[test]
fn two_recipes_may_share_a_slot() {
    with_ctx(|ctx| {
        let soup = create_recipe(ctx, "Canh chua").summary.id;
        let greens = create_recipe(ctx, "Rau muống").summary.id;
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &soup);
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &greens);
        assert_eq!(get_plan(ctx, "2026-10-07", Some(1)).unwrap().len(), 2);
    });
}

#[test]
fn a_date_without_leading_zeros_is_stored_in_the_canonical_form() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let entry = plan_meal(ctx, "2026-10-7", MealSlot::Dinner, &id);
        assert_eq!(entry.date, "2026-10-07");
        assert_eq!(get_plan(ctx, "2026-10-07", Some(1)).unwrap().len(), 1);
    });
}

#[test]
fn invalid_requests_are_rejected_without_writing() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let events = all_event_count(ctx);
        let bad = [
            request("2026-02-30", MealSlot::Lunch, &id, None),
            request("soon", MealSlot::Lunch, &id, None),
            request("2026-10-07", MealSlot::Lunch, &id, Some(0)),
            request("2026-10-07", MealSlot::Lunch, &id, Some(51)),
        ];
        for input in bad {
            assert_code(add_to_plan(ctx, input), ErrorCode::Validation);
        }
        assert_code(
            add_to_plan(ctx, request("2026-10-07", MealSlot::Lunch, "nope", None)),
            ErrorCode::NotFound,
        );
        assert_eq!(all_event_count(ctx), events);
    });
}

#[test]
fn adding_records_one_insert_event() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &id);
        assert_eq!(event_count(ctx, "plan_entry", "insert"), 1);
    });
}

#[test]
fn the_plan_runs_from_the_first_date_up_to_but_not_including_from_plus_days() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        for date in ["2026-10-04", "2026-10-05", "2026-10-11", "2026-10-12"] {
            plan_meal(ctx, date, MealSlot::Dinner, &id);
        }
        let week = get_plan(ctx, "2026-10-05", Some(7)).unwrap();
        let dates: Vec<_> = week.iter().map(|entry| entry.date.as_str()).collect();
        assert_eq!(dates, ["2026-10-05", "2026-10-11"]);
    });
}

#[test]
fn the_plan_covers_seven_days_when_days_is_absent() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        plan_meal(ctx, "2026-10-11", MealSlot::Dinner, &id);
        plan_meal(ctx, "2026-10-12", MealSlot::Dinner, &id);
        assert_eq!(get_plan(ctx, "2026-10-05", None).unwrap().len(), 1);
    });
}

#[test]
fn a_one_day_plan_holds_that_day_only() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        plan_meal(ctx, "2026-10-05", MealSlot::Dinner, &id);
        plan_meal(ctx, "2026-10-06", MealSlot::Dinner, &id);
        assert_eq!(get_plan(ctx, "2026-10-05", Some(1)).unwrap().len(), 1);
    });
}

#[test]
fn entries_are_ordered_by_date_then_breakfast_lunch_dinner() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        plan_meal(ctx, "2026-10-06", MealSlot::Breakfast, &id);
        plan_meal(ctx, "2026-10-05", MealSlot::Dinner, &id);
        plan_meal(ctx, "2026-10-05", MealSlot::Breakfast, &id);
        plan_meal(ctx, "2026-10-05", MealSlot::Lunch, &id);
        let order = dates_and_slots(&get_plan(ctx, "2026-10-05", None).unwrap());
        let expected = [
            ("2026-10-05", MealSlot::Breakfast),
            ("2026-10-05", MealSlot::Lunch),
            ("2026-10-05", MealSlot::Dinner),
            ("2026-10-06", MealSlot::Breakfast),
        ];
        let expected: Vec<_> = expected.iter().map(|(d, s)| (d.to_string(), *s)).collect();
        assert_eq!(order, expected);
    });
}

#[test]
fn the_plan_window_crosses_a_year_boundary() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        plan_meal(ctx, "2026-12-31", MealSlot::Dinner, &id);
        plan_meal(ctx, "2027-01-02", MealSlot::Dinner, &id);
        assert_eq!(get_plan(ctx, "2026-12-30", Some(4)).unwrap().len(), 2);
    });
}

#[test]
fn an_empty_plan_is_an_empty_list() {
    with_ctx(|ctx| assert!(get_plan(ctx, "2026-10-05", None).unwrap().is_empty()));
}

#[test]
fn a_bad_date_or_day_count_is_a_validation_error() {
    with_ctx(|ctx| {
        assert_code(get_plan(ctx, "nope", None), ErrorCode::Validation);
        assert_code(get_plan(ctx, "2026-10-05", Some(0)), ErrorCode::Validation);
        assert_code(get_plan(ctx, "2026-10-05", Some(1000)), ErrorCode::Validation);
    });
}

#[test]
fn removing_an_entry_takes_it_out_of_the_plan_and_records_a_delete() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let entry = plan_meal(ctx, "2026-10-05", MealSlot::Dinner, &id);
        remove_from_plan(ctx, &entry.id).unwrap();
        assert!(get_plan(ctx, "2026-10-05", None).unwrap().is_empty());
        assert_eq!(event_count(ctx, "plan_entry", "delete"), 1);
    });
}

#[test]
fn removing_an_unknown_or_already_removed_entry_is_not_found() {
    with_ctx(|ctx| {
        assert_code(remove_from_plan(ctx, "nope"), ErrorCode::NotFound);
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let entry = plan_meal(ctx, "2026-10-05", MealSlot::Dinner, &id);
        remove_from_plan(ctx, &entry.id).unwrap();
        assert_code(remove_from_plan(ctx, &entry.id), ErrorCode::NotFound);
    });
}

#[test]
fn a_slot_can_be_planned_again_after_its_entry_was_removed() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let first = plan_meal(ctx, "2026-10-05", MealSlot::Dinner, &id);
        remove_from_plan(ctx, &first.id).unwrap();
        let second = plan_meal(ctx, "2026-10-05", MealSlot::Dinner, &id);
        assert_ne!(first.id, second.id);
        assert_eq!(get_plan(ctx, "2026-10-05", Some(1)).unwrap().len(), 1);
    });
}
