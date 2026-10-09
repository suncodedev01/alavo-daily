use alavo_domain::recipes::kinds::MealSlot;
use alavo_domain::shared::error::ErrorCode;

use super::*;
use crate::recipes::catalog::set_favorite;
use crate::recipes::plan::get_plan;
use crate::recipes::test_support::{
    all_event_count, assert_code, create_recipe, plan_meal, with_ctx,
};

fn week(from: &str, slots: &[MealSlot]) -> SuggestRequest {
    SuggestRequest {
        from: from.into(),
        days: Some(7),
        slots: Some(slots.to_vec()),
        seed: None,
        also_planned: Vec::new(),
        avoid: Vec::new(),
    }
}

fn create_recipes(ctx: &Ctx, count: usize) -> Vec<String> {
    (0..count).map(|index| create_recipe(ctx, &format!("Món {index}")).summary.id).collect()
}

#[test]
fn a_week_of_dinners_is_proposed_without_saving_anything() {
    with_ctx(|ctx| {
        create_recipes(ctx, 6);
        let events = all_event_count(ctx);
        let entries = suggest_plan(ctx, week("2026-10-05", &[MealSlot::Dinner])).unwrap();
        assert_eq!(entries.len(), 7);
        assert!(get_plan(ctx, "2026-10-05", None).unwrap().is_empty());
        assert_eq!(all_event_count(ctx), events);
    });
}

#[test]
fn meals_that_are_already_planned_are_left_alone() {
    with_ctx(|ctx| {
        let ids = create_recipes(ctx, 6);
        plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &ids[0]);
        let entries = suggest_plan(ctx, week("2026-10-05", &[MealSlot::Dinner])).unwrap();
        assert_eq!(entries.len(), 6);
        assert!(entries.iter().all(|entry| entry.date != "2026-10-07"));
    });
}

#[test]
fn a_dish_planned_the_week_before_is_not_repeated_on_the_first_days() {
    with_ctx(|ctx| {
        let ids = create_recipes(ctx, 4);
        plan_meal(ctx, "2026-10-04", MealSlot::Dinner, &ids[0]);
        for seed in 0..15 {
            let mut request = week("2026-10-05", &[MealSlot::Dinner]);
            request.days = Some(2);
            request.seed = Some(seed);
            let entries = suggest_plan(ctx, request).unwrap();
            assert!(entries.iter().all(|entry| entry.recipe_id != ids[0]), "seed {seed}");
        }
    });
}

#[test]
fn favorites_are_proposed_more_often_than_other_recipes() {
    with_ctx(|ctx| {
        let ids = create_recipes(ctx, 6);
        set_favorite(ctx, &ids[0], true).unwrap();
        let favorite_picks = (0..200)
            .filter(|seed| {
                let mut request = week("2026-10-05", &[MealSlot::Dinner]);
                request.days = Some(1);
                request.seed = Some(*seed);
                suggest_plan(ctx, request).unwrap()[0].recipe_id == ids[0]
            })
            .count();
        assert!(favorite_picks > 200 / 6 * 3 / 2, "{favorite_picks}");
    });
}

#[test]
fn deleted_recipes_are_never_proposed() {
    with_ctx(|ctx| {
        let ids = create_recipes(ctx, 3);
        crate::recipes::catalog::delete(ctx, &ids[0]).unwrap();
        let entries = suggest_plan(ctx, week("2026-10-05", &[MealSlot::Dinner])).unwrap();
        assert!(entries.iter().all(|entry| entry.recipe_id != ids[0]));
    });
}

#[test]
fn without_recipes_there_is_nothing_to_propose() {
    with_ctx(|ctx| {
        assert!(suggest_plan(ctx, week("2026-10-05", &[MealSlot::Dinner])).unwrap().is_empty());
    });
}

#[test]
fn a_bad_date_is_a_validation_error() {
    with_ctx(|ctx| {
        let request = week("2026-02-30", &[MealSlot::Dinner]);
        assert_code(suggest_plan(ctx, request), ErrorCode::Validation);
    });
}
