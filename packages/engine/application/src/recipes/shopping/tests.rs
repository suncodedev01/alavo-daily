use alavo_domain::recipes::kinds::{Aisle, MealSlot};
use alavo_domain::recipes::plan::NewPlanEntry;
use alavo_domain::recipes::shopping::ShoppingItem;
use alavo_domain::shared::error::ErrorCode;
use alavo_domain::shared::money::Money;

use super::*;
use crate::recipes::test_support::{
    all_event_count, assert_code, create_recipe, event_count, ingredient, plan_meal, recipe_input,
    with_ctx,
};
use crate::recipes::{catalog, plan};

const FROM: &str = "2026-10-05";
const TO: &str = "2026-10-11";

fn item(name: &str) -> NewShoppingItem {
    NewShoppingItem { name: name.into(), quantity: None, unit: None, aisle: None }
}

fn list(ctx: &Ctx) -> ShoppingList {
    get_list(ctx, FROM, TO).unwrap()
}

fn find<'a>(list: &'a ShoppingList, key: &str) -> &'a ShoppingItem {
    list.items.iter().find(|item| item.key == key).unwrap_or_else(|| panic!("no line {key}"))
}

fn plan_chicken(ctx: &Ctx, date: &str, slot: MealSlot) -> String {
    let id = create_recipe(ctx, &format!("Gà kho {date} {}", slot.as_str())).summary.id;
    plan_meal(ctx, date, slot, &id);
    id
}

#[test]
fn an_empty_plan_gives_an_empty_list_for_the_range() {
    with_ctx(|ctx| {
        let result = list(ctx);
        assert!(result.items.is_empty());
        assert_eq!((result.from.as_str(), result.to.as_str()), (FROM, TO));
        assert_eq!((result.needed_count, result.needed_cost_vnd), (0, Money(0)));
    });
}

#[test]
fn entry_servings_scale_the_recipe_quantities_and_cost() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let entry = NewPlanEntry {
            date: "2026-10-07".into(),
            slot: MealSlot::Dinner,
            recipe_id: id,
            servings: Some(6),
        };
        plan::add_to_plan(ctx, entry).unwrap();
        let chicken = list(ctx).items.into_iter().find(|i| i.key == "Đùi gà|g").unwrap();
        assert_eq!(chicken.quantity, 900.0);
        assert_eq!(chicken.cost_vnd, Money(81_000));
        assert_eq!(chicken.from, ["Gà kho"]);
    });
}

#[test]
fn the_default_two_servings_halve_a_four_serving_recipe() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &id);
        let result = list(ctx);
        assert_eq!(find(&result, "Đùi gà|g").quantity, 300.0);
        assert_eq!(find(&result, "Đùi gà|g").cost_vnd, Money(27_000));
    });
}

#[test]
fn the_same_ingredient_from_two_recipes_becomes_one_line() {
    with_ctx(|ctx| {
        plan_chicken(ctx, "2026-10-05", MealSlot::Lunch);
        plan_chicken(ctx, "2026-10-06", MealSlot::Dinner);
        let result = list(ctx);
        let chicken = find(&result, "Đùi gà|g");
        assert_eq!(chicken.quantity, 600.0);
        assert_eq!(chicken.from.len(), 2);
    });
}

#[test]
fn only_entries_inside_the_range_count_and_both_ends_are_included() {
    with_ctx(|ctx| {
        for date in ["2026-10-04", "2026-10-05", "2026-10-11", "2026-10-12"] {
            plan_chicken(ctx, date, MealSlot::Dinner);
        }
        assert_eq!(find(&list(ctx), "Đùi gà|g").quantity, 600.0);
    });
}

#[test]
fn a_reversed_range_has_no_planned_items() {
    with_ctx(|ctx| {
        plan_chicken(ctx, "2026-10-07", MealSlot::Dinner);
        assert!(get_list(ctx, TO, FROM).unwrap().items.is_empty());
    });
}

#[test]
fn invalid_range_dates_are_rejected() {
    with_ctx(|ctx| {
        assert_code(get_list(ctx, "soon", TO), ErrorCode::Validation);
        assert_code(get_list(ctx, FROM, "2026-02-30"), ErrorCode::Validation);
    });
}

#[test]
fn a_deleted_recipe_no_longer_contributes() {
    with_ctx(|ctx| {
        let id = plan_chicken(ctx, "2026-10-07", MealSlot::Dinner);
        catalog::delete(ctx, &id).unwrap();
        assert!(list(ctx).items.is_empty());
    });
}

#[test]
fn spices_default_to_already_at_home_and_do_not_count_as_needed() {
    with_ctx(|ctx| {
        plan_chicken(ctx, "2026-10-07", MealSlot::Dinner);
        let result = list(ctx);
        assert!(find(&result, "Nước mắm|muỗng canh").have);
        assert!(!find(&result, "Đùi gà|g").have);
        assert_eq!((result.needed_count, result.needed_cost_vnd), (1, Money(27_000)));
    });
}

#[test]
fn the_have_flag_persists_and_overrides_the_default() {
    with_ctx(|ctx| {
        plan_chicken(ctx, "2026-10-07", MealSlot::Dinner);
        set_have(ctx, "Đùi gà|g", true).unwrap();
        set_have(ctx, "Nước mắm|muỗng canh", false).unwrap();
        let result = list(ctx);
        assert!(find(&result, "Đùi gà|g").have);
        assert!(!find(&result, "Nước mắm|muỗng canh").have);
        assert_eq!(result.needed_count, 1);
        assert_eq!(result.needed_cost_vnd, Money(1_500));
    });
}

#[test]
fn the_have_flag_can_be_flipped_back() {
    with_ctx(|ctx| {
        plan_chicken(ctx, "2026-10-07", MealSlot::Dinner);
        set_have(ctx, "Đùi gà|g", true).unwrap();
        set_have(ctx, "Đùi gà|g", false).unwrap();
        assert!(!find(&list(ctx), "Đùi gà|g").have);
    });
}

#[test]
fn the_have_flag_belongs_to_the_key_not_to_a_date_range() {
    with_ctx(|ctx| {
        plan_chicken(ctx, "2026-10-07", MealSlot::Dinner);
        plan_chicken(ctx, "2026-10-14", MealSlot::Dinner);
        set_have(ctx, "Đùi gà|g", true).unwrap();
        let next_week = get_list(ctx, "2026-10-12", "2026-10-18").unwrap();
        assert!(find(&next_week, "Đùi gà|g").have);
    });
}

#[test]
fn set_have_records_an_insert_then_an_update_event() {
    with_ctx(|ctx| {
        set_have(ctx, "Sữa|hộp", true).unwrap();
        set_have(ctx, "Sữa|hộp", false).unwrap();
        assert_eq!(event_count(ctx, "shopping_state", "insert"), 1);
        assert_eq!(event_count(ctx, "shopping_state", "update"), 1);
    });
}

#[test]
fn set_have_with_a_blank_key_is_rejected() {
    with_ctx(|ctx| {
        assert_code(set_have(ctx, "  ", true), ErrorCode::Validation);
        assert_eq!(all_event_count(ctx), 0);
    });
}

#[test]
fn a_hand_added_item_defaults_to_one_portion_in_the_other_aisle() {
    with_ctx(|ctx| {
        add_item(ctx, item("Sữa")).unwrap();
        let result = list(ctx);
        let milk = find(&result, "Sữa|phần");
        assert_eq!((milk.quantity, milk.aisle), (1.0, Aisle::Other));
        assert!(milk.custom && milk.from.is_empty() && !milk.have);
        assert_eq!(milk.cost_vnd, Money(0));
        assert_eq!(result.needed_count, 1);
    });
}

#[test]
fn a_hand_added_item_keeps_its_quantity_unit_and_aisle() {
    with_ctx(|ctx| {
        let input = NewShoppingItem {
            name: " Muối ".into(),
            quantity: Some(2.5),
            unit: Some("kg".into()),
            aisle: Some(Aisle::Spices),
        };
        add_item(ctx, input).unwrap();
        let result = list(ctx);
        let salt = find(&result, "Muối|kg");
        assert_eq!((salt.quantity, salt.aisle, salt.have), (2.5, Aisle::Spices, true));
    });
}

#[test]
fn hand_added_items_appear_even_when_nothing_is_planned() {
    with_ctx(|ctx| {
        add_item(ctx, item("Sữa")).unwrap();
        assert_eq!(list(ctx).items.len(), 1);
        assert_eq!(get_list(ctx, "2030-01-01", "2030-01-07").unwrap().items.len(), 1);
    });
}

#[test]
fn a_hand_added_item_merges_into_a_planned_line_with_the_same_key() {
    with_ctx(|ctx| {
        plan_chicken(ctx, "2026-10-07", MealSlot::Dinner);
        let input = NewShoppingItem {
            name: "Đùi gà".into(),
            quantity: Some(200.0),
            unit: Some("g".into()),
            aisle: None,
        };
        add_item(ctx, input).unwrap();
        let result = list(ctx);
        assert_eq!(result.items.iter().filter(|line| line.name == "Đùi gà").count(), 1);
        let chicken = find(&result, "Đùi gà|g");
        assert_eq!(chicken.quantity, 500.0);
        assert_eq!(chicken.aisle, Aisle::MeatFish);
        assert_eq!(chicken.from.len(), 1);
    });
}

#[test]
fn invalid_hand_added_items_are_rejected_without_writing() {
    with_ctx(|ctx| {
        assert_code(add_item(ctx, item("  ")), ErrorCode::Validation);
        for quantity in [0.0, -1.0] {
            let input = NewShoppingItem { quantity: Some(quantity), ..item("Sữa") };
            assert_code(add_item(ctx, input), ErrorCode::Validation);
        }
        assert_eq!(all_event_count(ctx), 0);
        assert!(list(ctx).items.is_empty());
    });
}

#[test]
fn adding_an_item_records_an_insert_event() {
    with_ctx(|ctx| {
        add_item(ctx, item("Sữa")).unwrap();
        assert_eq!(event_count(ctx, "shopping_item", "insert"), 1);
    });
}

#[test]
fn removing_a_hand_added_item_takes_it_off_the_list() {
    with_ctx(|ctx| {
        add_item(ctx, item("Sữa")).unwrap();
        add_item(ctx, item("Trứng")).unwrap();
        remove_item(ctx, "Sữa|phần").unwrap();
        let names: Vec<_> = list(ctx).items.into_iter().map(|line| line.name).collect();
        assert_eq!(names, ["Trứng"]);
        assert_eq!(event_count(ctx, "shopping_item", "delete"), 1);
    });
}

#[test]
fn removing_a_planned_line_is_a_validation_error() {
    with_ctx(|ctx| {
        plan_chicken(ctx, "2026-10-07", MealSlot::Dinner);
        let events = all_event_count(ctx);
        assert_code(remove_item(ctx, "Đùi gà|g"), ErrorCode::Validation);
        assert_eq!(find(&list(ctx), "Đùi gà|g").quantity, 300.0);
        assert_eq!(all_event_count(ctx), events);
    });
}

#[test]
fn removing_an_unknown_key_is_a_validation_error() {
    with_ctx(|ctx| assert_code(remove_item(ctx, "Không có|phần"), ErrorCode::Validation));
}

#[test]
fn removing_a_merged_line_removes_only_the_hand_added_part() {
    with_ctx(|ctx| {
        plan_chicken(ctx, "2026-10-07", MealSlot::Dinner);
        let input = NewShoppingItem {
            name: "Đùi gà".into(),
            quantity: Some(200.0),
            unit: Some("g".into()),
            aisle: None,
        };
        add_item(ctx, input).unwrap();
        remove_item(ctx, "Đùi gà|g").unwrap();
        let result = list(ctx);
        let chicken = find(&result, "Đùi gà|g");
        assert_eq!((chicken.quantity, chicken.custom), (300.0, false));
    });
}

#[test]
fn removing_an_item_twice_fails_the_second_time() {
    with_ctx(|ctx| {
        add_item(ctx, item("Sữa")).unwrap();
        remove_item(ctx, "Sữa|phần").unwrap();
        assert_code(remove_item(ctx, "Sữa|phần"), ErrorCode::Validation);
    });
}

#[test]
fn lines_are_sorted_by_aisle_then_name() {
    with_ctx(|ctx| {
        let mut input = recipe_input("Món");
        input.ingredients = vec![
            ingredient("Bún", (1.0, "g"), Aisle::Other, 0),
            ingredient("Tiêu", (1.0, "g"), Aisle::Spices, 0),
            ingredient("Rau", (1.0, "g"), Aisle::Vegetables, 0),
            ingredient("Cá", (1.0, "g"), Aisle::MeatFish, 0),
        ];
        let id = catalog::create(ctx, input).unwrap().summary.id;
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &id);
        let names: Vec<_> = list(ctx).items.into_iter().map(|line| line.name).collect();
        assert_eq!(names, ["Cá", "Rau", "Tiêu", "Bún"]);
    });
}
