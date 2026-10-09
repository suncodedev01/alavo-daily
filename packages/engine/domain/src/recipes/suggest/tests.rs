use std::collections::HashSet;

use super::*;

fn dish(id: &str, tag: &str, favorite: bool) -> Candidate {
    Candidate {
        id: id.into(),
        name: format!("Món {id}"),
        icon: "cooking-pot".into(),
        tags: vec![tag.into()],
        favorite,
    }
}

fn dishes(count: usize) -> Vec<Candidate> {
    (0..count).map(|index| dish(&format!("r{index}"), "Món chính", false)).collect()
}

fn request(from: &str, days: i64, slots: &[MealSlot]) -> SuggestRequest {
    SuggestRequest {
        from: from.into(),
        days: Some(days),
        slots: Some(slots.to_vec()),
        seed: None,
        also_planned: Vec::new(),
        avoid: Vec::new(),
    }
}

fn dinners(days: i64) -> SuggestRequest {
    request("2026-10-05", days, &[MealSlot::Dinner])
}

fn planned(date: &str, slot: MealSlot, recipe_id: &str) -> PlannedSlot {
    PlannedSlot { date: date.into(), slot, recipe_id: recipe_id.into() }
}

fn ids(entries: &[SuggestedEntry]) -> Vec<&str> {
    entries.iter().map(|entry| entry.recipe_id.as_str()).collect()
}

fn day_of(date: &str) -> i64 {
    Date::parse(date).unwrap().to_days()
}

fn run(request: &SuggestRequest, recipes: &[Candidate]) -> Vec<SuggestedEntry> {
    suggest_entries(request, recipes, &[]).unwrap()
}

#[test]
fn the_same_request_gives_the_same_proposal() {
    let recipes = dishes(6);
    assert_eq!(run(&dinners(7), &recipes), run(&dinners(7), &recipes));
}

#[test]
fn another_seed_gives_another_proposal() {
    let recipes = dishes(8);
    let proposals: HashSet<Vec<String>> = (0..20)
        .map(|seed| {
            let mut own = dinners(7);
            own.seed = Some(seed);
            ids(&run(&own, &recipes)).iter().map(|id| id.to_string()).collect()
        })
        .collect();
    assert!(proposals.len() > 1);
}

#[test]
fn lunch_and_dinner_of_every_day_are_filled_by_default() {
    let mut own = dinners(7);
    own.slots = None;
    let entries = run(&own, &dishes(10));
    assert_eq!(entries.len(), 14);
    assert_eq!((entries[0].date.as_str(), entries[0].slot), ("2026-10-05", MealSlot::Lunch));
    assert_eq!((entries[1].date.as_str(), entries[1].slot), ("2026-10-05", MealSlot::Dinner));
    assert_eq!(entries[13].date, "2026-10-11");
}

#[test]
fn the_same_recipe_is_never_proposed_twice_within_three_days() {
    let recipes = dishes(6);
    for seed in 0..30 {
        let mut own = dinners(14);
        own.seed = Some(seed);
        let entries = run(&own, &recipes);
        for (index, first) in entries.iter().enumerate() {
            for second in &entries[index + 1..] {
                let apart = day_of(&second.date) - day_of(&first.date);
                let same = first.recipe_id == second.recipe_id;
                assert!(!same || apart >= REPEAT_GAP_DAYS, "seed {seed}");
            }
        }
    }
}

#[test]
fn lunch_and_dinner_of_one_day_are_different_dishes() {
    let mut own = request("2026-10-05", 7, &[MealSlot::Lunch, MealSlot::Dinner]);
    own.seed = Some(3);
    let entries = run(&own, &dishes(8));
    for pair in entries.chunks(2) {
        assert_ne!(pair[0].recipe_id, pair[1].recipe_id);
    }
}

#[test]
fn saved_meals_are_skipped_and_still_count_for_spacing() {
    let recipes = dishes(5);
    let existing = [planned("2026-10-06", MealSlot::Dinner, "r0")];
    for seed in 0..20 {
        let mut own = dinners(5);
        own.seed = Some(seed);
        let entries = suggest_entries(&own, &recipes, &existing).unwrap();
        assert_eq!(entries.len(), 4);
        assert!(entries.iter().all(|entry| entry.date != "2026-10-06"));
        let saved_day = day_of("2026-10-06");
        let near = entries.iter().filter(|entry| day_of(&entry.date).abs_diff(saved_day) < 3);
        assert!(near.into_iter().all(|entry| entry.recipe_id != "r0"), "seed {seed}");
    }
}

#[test]
fn a_meal_just_before_the_range_counts_for_spacing() {
    let recipes = dishes(4);
    let existing = [planned("2026-10-04", MealSlot::Dinner, "r0")];
    for seed in 0..20 {
        let mut own = dinners(2);
        own.seed = Some(seed);
        let entries = suggest_entries(&own, &recipes, &existing).unwrap();
        assert!(entries.iter().all(|entry| entry.recipe_id != "r0"), "seed {seed}");
    }
}

#[test]
fn favorites_are_proposed_more_often() {
    let mut recipes = dishes(5);
    recipes.push(dish("fav", "Món chính", true));
    let favorite_picks = (0..300)
        .filter(|seed| {
            let mut own = dinners(1);
            own.seed = Some(*seed);
            run(&own, &recipes)[0].recipe_id == "fav"
        })
        .count();
    let unweighted_share = 300 / 6;
    assert!(favorite_picks > unweighted_share * 3 / 2, "{favorite_picks}");
}

#[test]
fn two_dishes_of_the_same_kind_do_not_follow_each_other_when_there_is_a_choice() {
    let recipes = [
        dish("m1", "Món chính", false),
        dish("m2", "Món chính", false),
        dish("c1", "Canh", false),
        dish("r1", "Rau", false),
    ];
    let existing = [planned("2026-10-05", MealSlot::Dinner, "m1")];
    for seed in 0..40 {
        let mut own = request("2026-10-06", 1, &[MealSlot::Dinner]);
        own.seed = Some(seed);
        let entries = suggest_entries(&own, &recipes, &existing).unwrap();
        assert_ne!(entries[0].recipe_id, "m2", "seed {seed}");
    }
}

#[test]
fn the_kind_rule_gives_way_when_every_dish_is_of_the_same_kind() {
    let entries = run(&dinners(3), &dishes(3));
    assert_eq!(entries.len(), 3);
    assert_eq!(ids(&entries).iter().collect::<HashSet<_>>().len(), 3);
}

#[test]
fn the_kind_of_the_next_day_is_respected_too() {
    let recipes = [
        dish("m1", "Món chính", false),
        dish("m2", "Món chính", false),
        dish("c1", "Canh", false),
    ];
    let existing = [planned("2026-10-06", MealSlot::Dinner, "m1")];
    for seed in 0..20 {
        let mut own = request("2026-10-05", 1, &[MealSlot::Dinner]);
        own.seed = Some(seed);
        let entries = suggest_entries(&own, &recipes, &existing).unwrap();
        assert_eq!(entries[0].recipe_id, "c1", "seed {seed}");
    }
}

#[test]
fn with_fewer_recipes_than_meals_the_repeat_comes_as_late_as_possible() {
    let entries = run(&dinners(6), &dishes(2));
    let order = ids(&entries);
    assert_eq!(order[0], order[2]);
    assert_eq!(order[1], order[3]);
    assert_eq!(order[2], order[4]);
    assert_ne!(order[0], order[1]);
}

#[test]
fn with_three_recipes_for_seven_meals_each_comes_back_every_three_days() {
    let entries = run(&dinners(7), &dishes(3));
    for (index, entry) in entries.iter().enumerate().skip(3) {
        assert_eq!(entry.recipe_id, entries[index - 3].recipe_id);
    }
}

#[test]
fn a_single_recipe_fills_every_meal() {
    let entries = run(&dinners(4), &dishes(1));
    assert_eq!(ids(&entries), ["r0", "r0", "r0", "r0"]);
}

#[test]
fn no_recipes_means_no_proposal() {
    assert!(run(&dinners(7), &[]).is_empty());
}

#[test]
fn a_range_that_is_already_full_gives_nothing() {
    let existing: Vec<_> = (5..=7)
        .map(|day| planned(&format!("2026-10-{day:02}"), MealSlot::Dinner, "r0"))
        .collect();
    assert!(suggest_entries(&dinners(3), &dishes(4), &existing).unwrap().is_empty());
}

#[test]
fn meals_proposed_elsewhere_count_but_are_not_returned() {
    let recipes = dishes(4);
    let mut own = request("2026-10-06", 1, &[MealSlot::Dinner]);
    own.also_planned = vec![planned("2026-10-07", MealSlot::Dinner, "r0")];
    for seed in 0..20 {
        own.seed = Some(seed);
        let entries = run(&own, &recipes);
        assert_eq!(entries.len(), 1);
        assert_ne!(entries[0].recipe_id, "r0", "seed {seed}");
    }
}

#[test]
fn an_avoided_recipe_is_not_proposed() {
    let recipes = dishes(3);
    let mut own = dinners(1);
    own.avoid = vec!["r0".into(), "r1".into()];
    for seed in 0..10 {
        own.seed = Some(seed);
        assert_eq!(ids(&run(&own, &recipes)), ["r2"]);
    }
}

#[test]
fn avoiding_every_recipe_is_ignored() {
    let mut own = dinners(1);
    own.avoid = vec!["r0".into()];
    assert_eq!(ids(&run(&own, &dishes(1))), ["r0"]);
}

#[test]
fn entries_carry_the_recipe_name_and_icon() {
    let entries = run(&dinners(1), &dishes(1));
    assert_eq!(entries[0].recipe_name, "Món r0");
    assert_eq!(entries[0].recipe_icon, "cooking-pot");
}

#[test]
fn a_bad_date_range_or_slot_list_is_a_validation_error() {
    let recipes = dishes(2);
    let dinner = [MealSlot::Dinner];
    assert!(suggest_entries(&request("2026-13-01", 7, &dinner), &recipes, &[]).is_err());
    assert!(suggest_entries(&request("2026-10-05", 0, &dinner), &recipes, &[]).is_err());
    assert!(suggest_entries(&request("2026-10-05", 7, &[]), &recipes, &[]).is_err());
    let bad_existing = [planned("not a date", MealSlot::Dinner, "r0")];
    assert!(suggest_entries(&dinners(1), &recipes, &bad_existing).is_err());
}

#[test]
fn duplicate_slots_are_filled_once() {
    let twice = [MealSlot::Dinner, MealSlot::Dinner];
    let entries = run(&request("2026-10-05", 2, &twice), &dishes(4));
    assert_eq!(entries.len(), 2);
}

#[test]
fn the_context_window_adds_the_spacing_days_on_both_sides() {
    let (first, last) = dinners(7).context_window().unwrap();
    assert_eq!((first.as_str(), last.as_str()), ("2026-10-02", "2026-10-14"));
}

#[test]
fn the_request_reads_camel_case_json_with_defaults() {
    let json = r#"{ "from": "2026-10-05", "alsoPlanned": [
        { "date": "2026-10-06", "slot": "dinner", "recipeId": "r1" } ] }"#;
    let parsed: SuggestRequest = serde_json::from_str(json).unwrap();
    assert_eq!((parsed.days, parsed.slots, parsed.seed), (None, None, None));
    assert_eq!(parsed.also_planned.len(), 1);
    assert!(parsed.avoid.is_empty());
}
