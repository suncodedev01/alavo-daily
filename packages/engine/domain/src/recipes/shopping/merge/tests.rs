use super::*;

fn ingredient(name: &str, amount: (f64, &str), aisle: Aisle, cost: i64) -> Ingredient {
    let (quantity, unit) = amount;
    Ingredient {
        id: format!("i-{name}"),
        name: name.into(),
        quantity,
        unit: unit.into(),
        aisle,
        cost_vnd: Money(cost),
        position: "0001".into(),
    }
}

fn meal(recipe: &str, recipe_servings: i64, servings: i64, ingredients: Vec<Ingredient>) -> PlannedMeal {
    PlannedMeal { recipe_name: recipe.into(), recipe_servings, servings, ingredients }
}

fn custom(name: &str, quantity: f64, unit: &str, aisle: Aisle) -> CustomItem {
    CustomItem { id: format!("c-{name}"), name: name.into(), quantity, unit: unit.into(), aisle }
}

fn list(sources: ShoppingSources) -> ShoppingList {
    build_shopping_list("2026-10-05", "2026-10-11", &sources)
}

fn sources(meals: Vec<PlannedMeal>) -> ShoppingSources {
    ShoppingSources { meals, ..Default::default() }
}

fn chicken(cost: i64) -> Ingredient {
    ingredient("Đùi gà", (600.0, "g"), Aisle::MeatFish, cost)
}

#[test]
fn merges_same_ingredient_across_recipes() {
    let result = list(sources(vec![
        meal("Gà kho", 4, 4, vec![chicken(54_000)]),
        meal("Gà nướng", 2, 2, vec![ingredient("Đùi gà", (300.0, "g"), Aisle::MeatFish, 27_000)]),
    ]));
    assert_eq!(result.items.len(), 1);
    assert_eq!(result.items[0].key, "Đùi gà|g");
    assert_eq!(result.items[0].quantity, 900.0);
    assert_eq!(result.items[0].cost_vnd, Money(81_000));
    assert_eq!(result.items[0].from, ["Gà kho", "Gà nướng"]);
}

#[test]
fn merges_the_same_recipe_planned_twice_and_lists_it_once() {
    let result = list(sources(vec![
        meal("Gà kho", 4, 4, vec![chicken(54_000)]),
        meal("Gà kho", 4, 4, vec![chicken(54_000)]),
    ]));
    assert_eq!(result.items[0].quantity, 1200.0);
    assert_eq!(result.items[0].from, ["Gà kho"]);
}

#[test]
fn different_units_of_one_ingredient_stay_separate() {
    let result = list(sources(vec![meal(
        "Món",
        2,
        2,
        vec![
            ingredient("Gừng", (50.0, "g"), Aisle::Vegetables, 4_000),
            ingredient("Gừng", (1.0, "củ"), Aisle::Vegetables, 3_000),
        ],
    )]));
    let keys: Vec<_> = result.items.iter().map(|item| item.key.as_str()).collect();
    assert_eq!(keys, ["Gừng|củ", "Gừng|g"]);
}

#[test]
fn names_that_differ_only_in_case_stay_separate() {
    let result = list(sources(vec![meal(
        "Món",
        2,
        2,
        vec![
            ingredient("Gừng", (1.0, "g"), Aisle::Vegetables, 0),
            ingredient("gừng", (1.0, "g"), Aisle::Vegetables, 0),
        ],
    )]));
    assert_eq!(result.items.len(), 2);
}

#[test]
fn surrounding_spaces_do_not_split_a_line() {
    let result = list(sources(vec![meal(
        "Món",
        2,
        2,
        vec![
            ingredient(" Hành ", (1.0, " củ"), Aisle::Vegetables, 0),
            ingredient("Hành", (2.0, "củ "), Aisle::Vegetables, 0),
        ],
    )]));
    assert_eq!(result.items.len(), 1);
    assert_eq!(result.items[0].quantity, 3.0);
    assert_eq!(result.items[0].name, "Hành");
}

#[test]
fn scales_quantity_and_cost_by_planned_over_recipe_servings() {
    let result = list(sources(vec![meal("Gà kho", 4, 2, vec![chicken(54_000)])]));
    assert_eq!(result.items[0].quantity, 300.0);
    assert_eq!(result.items[0].cost_vnd, Money(27_000));
}

#[test]
fn scaling_up_works_too() {
    let result = list(sources(vec![meal("Rau", 2, 6, vec![chicken(10_000)])]));
    assert_eq!(result.items[0].quantity, 1800.0);
    assert_eq!(result.items[0].cost_vnd, Money(30_000));
}

#[test]
fn keeps_fractional_quantities_after_scaling() {
    let pepper = ingredient("Tiêu xay", (0.5, "muỗng cà phê"), Aisle::Spices, 1_000);
    let result = list(sources(vec![meal("Gà kho", 4, 2, vec![pepper])]));
    assert_eq!(result.items[0].quantity, 0.25);
}

#[test]
fn removes_floating_point_noise_from_summed_quantities() {
    let item = ingredient("Muối", (0.1, "g"), Aisle::Other, 0);
    let meals = (0..3).map(|_| meal("Món", 1, 1, vec![item.clone()])).collect();
    assert_eq!(list(sources(meals)).items[0].quantity, 0.3);
}

#[test]
fn rounds_cost_to_whole_dong_after_summing_every_entry() {
    let item = ingredient("Hành", (1.0, "củ"), Aisle::Vegetables, 7);
    let meals = vec![meal("A", 4, 1, vec![item.clone()]), meal("B", 4, 1, vec![item])];
    assert_eq!(list(sources(meals)).items[0].cost_vnd, Money(4));
}

#[test]
fn rounds_a_single_fractional_cost_to_the_nearest_dong() {
    let item = ingredient("Hành", (1.0, "củ"), Aisle::Vegetables, 1_001);
    let result = list(sources(vec![meal("A", 3, 2, vec![item])]));
    assert_eq!(result.items[0].cost_vnd, Money(667));
}

#[test]
fn a_recipe_with_zero_servings_does_not_divide_by_zero() {
    let result = list(sources(vec![meal("A", 0, 2, vec![chicken(1_000)])]));
    assert_eq!(result.items[0].quantity, 1200.0);
}

#[test]
fn first_occurrence_decides_the_aisle() {
    let result = list(sources(vec![
        meal("A", 2, 2, vec![ingredient("Tỏi", (2.0, "tép"), Aisle::Vegetables, 0)]),
        meal("B", 2, 2, vec![ingredient("Tỏi", (2.0, "tép"), Aisle::Spices, 0)]),
    ]));
    assert_eq!(result.items[0].aisle, Aisle::Vegetables);
    assert!(!result.items[0].have);
}

#[test]
fn spices_default_to_already_at_home() {
    let result = list(sources(vec![meal(
        "A",
        2,
        2,
        vec![
            ingredient("Nước mắm", (2.0, "muỗng canh"), Aisle::Spices, 3_000),
            ingredient("Cà chua", (3.0, "quả"), Aisle::Vegetables, 12_000),
        ],
    )]));
    let have: Vec<_> = result.items.iter().map(|item| (item.name.as_str(), item.have)).collect();
    assert_eq!(have, [("Cà chua", false), ("Nước mắm", true)]);
}

#[test]
fn explicit_flags_override_the_spice_default_both_ways() {
    let mut input = sources(vec![meal(
        "A",
        2,
        2,
        vec![
            ingredient("Nước mắm", (2.0, "muỗng canh"), Aisle::Spices, 3_000),
            ingredient("Cà chua", (3.0, "quả"), Aisle::Vegetables, 12_000),
        ],
    )]);
    input.have_flags.insert("Nước mắm|muỗng canh".into(), false);
    input.have_flags.insert("Cà chua|quả".into(), true);
    let result = list(input);
    assert!(result.items.iter().any(|item| item.name == "Nước mắm" && !item.have));
    assert!(result.items.iter().any(|item| item.name == "Cà chua" && item.have));
    assert_eq!(result.needed_count, 1);
    assert_eq!(result.needed_cost_vnd, Money(3_000));
}

#[test]
fn needed_totals_count_only_items_still_to_buy() {
    let result = list(sources(vec![meal(
        "A",
        2,
        2,
        vec![
            ingredient("Cá", (500.0, "g"), Aisle::MeatFish, 75_000),
            ingredient("Cà chua", (3.0, "quả"), Aisle::Vegetables, 12_000),
            ingredient("Tiêu", (1.0, "g"), Aisle::Spices, 1_000),
        ],
    )]));
    assert_eq!(result.needed_count, 2);
    assert_eq!(result.needed_cost_vnd, Money(87_000));
}

#[test]
fn sorts_by_aisle_then_name() {
    let result = list(sources(vec![meal(
        "A",
        2,
        2,
        vec![
            ingredient("Bún", (1.0, "g"), Aisle::Other, 0),
            ingredient("Tiêu", (1.0, "g"), Aisle::Spices, 0),
            ingredient("Rau", (1.0, "g"), Aisle::Vegetables, 0),
            ingredient("Cá", (1.0, "g"), Aisle::MeatFish, 0),
            ingredient("Cà chua", (1.0, "g"), Aisle::Vegetables, 0),
            ingredient("bắp", (1.0, "g"), Aisle::Vegetables, 0),
        ],
    )]));
    let names: Vec<_> = result.items.iter().map(|item| item.name.as_str()).collect();
    assert_eq!(names, ["Cá", "bắp", "Cà chua", "Rau", "Tiêu", "Bún"]);
}

#[test]
fn an_empty_plan_gives_an_empty_list_that_keeps_the_range() {
    let result = list(ShoppingSources::default());
    assert!(result.items.is_empty());
    assert_eq!((result.needed_count, result.needed_cost_vnd), (0, Money(0)));
    assert_eq!((result.from.as_str(), result.to.as_str()), ("2026-10-05", "2026-10-11"));
}

#[test]
fn a_hand_added_item_is_listed_without_recipes() {
    let mut input = ShoppingSources::default();
    input.custom_items.push(custom("Sữa", 2.0, "hộp", Aisle::Other));
    let result = list(input);
    let item = &result.items[0];
    assert!(item.custom && item.from.is_empty() && !item.have);
    assert_eq!((item.quantity, item.cost_vnd), (2.0, Money(0)));
    assert_eq!(result.needed_count, 1);
}

#[test]
fn a_hand_added_item_merges_into_a_derived_line_with_the_same_key() {
    let mut input = sources(vec![meal("Gà kho", 4, 4, vec![chicken(54_000)])]);
    input.custom_items.push(custom("Đùi gà", 400.0, "g", Aisle::Other));
    let result = list(input);
    assert_eq!(result.items.len(), 1);
    let item = &result.items[0];
    assert_eq!(item.quantity, 1000.0);
    assert_eq!(item.cost_vnd, Money(54_000));
    assert_eq!(item.aisle, Aisle::MeatFish);
    assert_eq!(item.from, ["Gà kho"]);
    assert!(item.custom);
}

#[test]
fn two_hand_added_items_with_one_key_become_one_line() {
    let mut input = ShoppingSources::default();
    input.custom_items.push(custom("Sữa", 1.0, "hộp", Aisle::Other));
    input.custom_items.push(custom("Sữa", 2.0, "hộp", Aisle::Other));
    let result = list(input);
    assert_eq!(result.items.len(), 1);
    assert_eq!(result.items[0].quantity, 3.0);
}

#[test]
fn a_hand_added_spice_is_at_home_by_default() {
    let mut input = ShoppingSources::default();
    input.custom_items.push(custom("Muối", 1.0, "gói", Aisle::Spices));
    assert!(list(input).items[0].have);
}

#[test]
fn a_flag_applies_to_a_hand_added_item() {
    let mut input = ShoppingSources::default();
    input.custom_items.push(custom("Sữa", 1.0, "hộp", Aisle::Other));
    input.have_flags.insert("Sữa|hộp".into(), true);
    let result = list(input);
    assert!(result.items[0].have);
    assert_eq!(result.needed_count, 0);
}

#[test]
fn list_serializes_with_camel_case_keys_and_snake_case_aisles() {
    let result = list(sources(vec![meal("A", 2, 2, vec![chicken(1_000)])]));
    let value = serde_json::to_value(&result).unwrap();
    assert_eq!(value["neededCount"], 1);
    assert_eq!(value["neededCostVnd"], 1_000);
    assert_eq!(value["items"][0]["aisle"], "meat_fish");
    assert_eq!(value["items"][0]["costVnd"], 1_000);
    assert_eq!(value["items"][0]["custom"], false);
}
