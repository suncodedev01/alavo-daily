use alavo_domain::recipes::filter::RecipeFilter;
use alavo_domain::recipes::kinds::{Aisle, MealSlot, RecipeLevel};
use alavo_domain::shared::money::Money;
use alavo_infrastructure::testing::TEST_NOW_MS;

use super::*;
use crate::recipes::shopping::get_list;
use crate::recipes::test_support::{all_event_count, with_ctx};

fn at(date: &str, hour: i64) -> i64 {
    Date::parse(date).unwrap().to_days() * MS_PER_DAY + hour * 3_600_000
}

fn all_recipes(ctx: &Ctx) -> Vec<alavo_domain::recipes::recipe::RecipeSummary> {
    catalog::list(ctx, RecipeFilter::default()).unwrap()
}

fn sample_week(ctx: &Ctx) -> Vec<alavo_domain::recipes::plan::PlanEntry> {
    plan::get_plan(ctx, "2026-10-05", Some(7)).unwrap()
}

#[test]
fn the_week_starts_on_the_monday_of_the_current_utc_date() {
    assert_eq!(monday_of_week(TEST_NOW_MS).to_text(), "2026-10-05");
}

#[test]
fn a_monday_is_its_own_week_start_from_the_first_to_the_last_millisecond() {
    assert_eq!(monday_of_week(at("2026-10-05", 0)).to_text(), "2026-10-05");
    assert_eq!(monday_of_week(at("2026-10-05", 24) - 1).to_text(), "2026-10-05");
}

#[test]
fn a_sunday_belongs_to_the_week_that_began_six_days_earlier() {
    assert_eq!(monday_of_week(at("2026-10-11", 23)).to_text(), "2026-10-05");
    assert_eq!(monday_of_week(at("2026-10-12", 0)).to_text(), "2026-10-12");
}

#[test]
fn the_week_start_crosses_month_and_year_boundaries() {
    assert_eq!(monday_of_week(at("2027-01-01", 12)).to_text(), "2026-12-28");
    assert_eq!(monday_of_week(at("1970-01-01", 0)).to_text(), "1969-12-29");
}

#[test]
fn loading_creates_the_eight_sample_recipes() {
    with_ctx(|ctx| {
        load(ctx).unwrap();
        assert_eq!(all_recipes(ctx).len(), 8);
        let favorites = RecipeFilter { query: None, tag: Some("favorites".into()) };
        assert_eq!(catalog::list(ctx, favorites).unwrap().len(), 3);
    });
}

#[test]
fn a_sample_recipe_keeps_its_mockup_data_with_costs_in_whole_dong() {
    with_ctx(|ctx| {
        load(ctx).unwrap();
        let summary = all_recipes(ctx).into_iter().find(|r| r.name == "Gà kho gừng").unwrap();
        let recipe = catalog::get(ctx, &summary.id).unwrap();
        assert_eq!(summary.cost_vnd, Money(69_000));
        assert_eq!((summary.ingredient_count, summary.servings), (6, 4));
        assert_eq!((summary.prep_min, summary.cook_min), (15, 40));
        assert_eq!((summary.level, summary.favorite), (RecipeLevel::Easy, true));
        assert_eq!(recipe.kcal, Some(420));
        assert_eq!(recipe.steps.len(), 5);
        assert_eq!(recipe.steps[0].timer_min, 15);
        assert_eq!(recipe.ingredients[5].quantity, 0.5);
        assert_eq!(recipe.ingredients[5].aisle, Aisle::Spices);
    });
}

#[test]
fn the_levels_are_mapped_from_the_mockup_words() {
    with_ctx(|ctx| {
        load(ctx).unwrap();
        let level_of = |name: &str| {
            all_recipes(ctx).into_iter().find(|recipe| recipe.name == name).unwrap().level
        };
        assert_eq!(level_of("Phở bò"), RecipeLevel::Hard);
        assert_eq!(level_of("Bún chả"), RecipeLevel::Medium);
        assert_eq!(level_of("Canh chua cá lóc"), RecipeLevel::Easy);
    });
}

#[test]
fn tags_and_icons_follow_the_mockup() {
    with_ctx(|ctx| {
        load(ctx).unwrap();
        let by_tag = |tag: &str| {
            let filter = RecipeFilter { query: None, tag: Some(tag.into()) };
            catalog::list(ctx, filter).unwrap().len()
        };
        assert_eq!((by_tag("Món chính"), by_tag("Canh"), by_tag("Rau"), by_tag("Nhanh")), (6, 1, 1, 2));
        let icons: Vec<_> = all_recipes(ctx).into_iter().map(|recipe| recipe.icon).collect();
        assert!(icons.iter().all(|icon| icon == "cooking-pot" || icon == "fork-knife"));
    });
}

#[test]
fn the_sample_week_has_the_fifteen_planned_meals_of_the_mockup() {
    with_ctx(|ctx| {
        load(ctx).unwrap();
        let entries = sample_week(ctx);
        assert_eq!(entries.len(), 15);
        let first = &entries[0];
        assert_eq!((first.date.as_str(), first.slot), ("2026-10-05", MealSlot::Lunch));
        assert_eq!(first.recipe_name, "Cơm tấm sườn");
        let last = entries.last().unwrap();
        assert_eq!((last.date.as_str(), last.slot), ("2026-10-11", MealSlot::Dinner));
        assert!(entries.iter().all(|entry| entry.servings == 2));
    });
}

#[test]
fn friday_dinner_holds_two_dishes() {
    with_ctx(|ctx| {
        load(ctx).unwrap();
        let friday = plan::get_plan(ctx, "2026-10-09", Some(1)).unwrap();
        let dinner: Vec<_> = friday.iter().filter(|e| e.slot == MealSlot::Dinner).collect();
        assert_eq!(dinner.len(), 2);
    });
}

#[test]
fn loading_twice_adds_nothing() {
    with_ctx(|ctx| {
        load(ctx).unwrap();
        let events = all_event_count(ctx);
        load(ctx).unwrap();
        assert_eq!(all_recipes(ctx).len(), 8);
        assert_eq!(sample_week(ctx).len(), 15);
        assert_eq!(all_event_count(ctx), events);
    });
}

#[test]
fn the_guard_setting_is_what_stops_a_second_load() {
    with_ctx(|ctx| {
        load(ctx).unwrap();
        assert!(get_setting(ctx.db, "demo.recipes").unwrap().is_some());
    });
}

#[test]
fn loading_does_not_duplicate_recipes_the_user_already_has() {
    with_ctx(|ctx| {
        let mine = crate::recipes::test_support::create_recipe(ctx, "Món của tôi");
        load(ctx).unwrap();
        let names: Vec<_> = all_recipes(ctx).into_iter().map(|recipe| recipe.name).collect();
        assert_eq!(names.len(), 9);
        assert!(names.contains(&mine.summary.name));
    });
}

#[test]
fn the_sample_week_produces_the_expected_shopping_lines() {
    with_ctx(|ctx| {
        load(ctx).unwrap();
        let list = get_list(ctx, "2026-10-05", "2026-10-11").unwrap();
        let chicken = list.items.iter().find(|line| line.key == "Đùi gà|g").unwrap();
        assert_eq!(chicken.quantity, 600.0);
        assert_eq!(chicken.cost_vnd, Money(54_000));
        let tomato = list.items.iter().find(|line| line.key == "Cà chua|quả").unwrap();
        assert_eq!(tomato.quantity, 9.5);
        assert_eq!(tomato.from, ["Cơm tấm sườn", "Canh chua cá lóc", "Đậu hũ sốt cà"]);
        assert!(list.items.iter().filter(|line| line.aisle == Aisle::Spices).all(|line| line.have));
    });
}

#[test]
fn every_recipe_named_in_the_sample_week_exists() {
    let keys: Vec<_> = SAMPLE_RECIPES.iter().map(|sample| sample.key).collect();
    for day in SAMPLE_WEEK.iter() {
        for key in day.iter().flat_map(|slot| slot.iter()) {
            assert!(keys.contains(key), "{key} is not a sample recipe");
        }
    }
}

#[test]
fn sample_recipes_pass_the_same_validation_as_user_input() {
    with_ctx(|ctx| {
        for sample in SAMPLE_RECIPES {
            catalog::create(ctx, input_from(sample)).unwrap();
        }
    });
}
