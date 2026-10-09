use alavo_domain::recipes::morning_menu::{
    reminder_window, suggestion_index, MenuDish, MorningMenu,
};
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::recipes::plan::list_plan_between;
use alavo_infrastructure::persistence::repositories::recipes::records::list_recipes;

use crate::context::Ctx;

/// The menu for each of `days` mornings starting at `from`.
pub fn get_many(ctx: &Ctx, from: &str, days: Option<i64>) -> Result<Vec<MorningMenu>, EngineError> {
    reminder_window(from, days)?.iter().map(|date| get(ctx, date)).collect()
}

/// What to tell the person on the morning of `date`: the dishes they planned for it, or one
/// recipe picked for them when the day is still empty.
fn get(ctx: &Ctx, date: &str) -> Result<MorningMenu, EngineError> {
    let planned = list_plan_between(ctx.db, date, date)?;
    if !planned.is_empty() {
        return Ok(MorningMenu::planned(date, planned));
    }
    suggest(ctx, date)
}

fn suggest(ctx: &Ctx, date: &str) -> Result<MorningMenu, EngineError> {
    let mut recipes = list_recipes(ctx.db)?;
    let Some(index) = suggestion_index(date, recipes.len()) else {
        return Ok(MorningMenu::empty(date));
    };
    let pick = recipes.swap_remove(index);
    let dish = MenuDish::suggestion(pick.id, pick.body.name, pick.body.icon);
    Ok(MorningMenu::suggested(date, dish))
}

#[cfg(test)]
mod tests {
    use alavo_domain::recipes::kinds::MealSlot;
    use alavo_domain::recipes::morning_menu::MenuSource;
    use alavo_domain::shared::error::ErrorCode;

    use super::*;
    use crate::recipes::test_support::{assert_code, create_recipe, plan_meal, with_ctx};

    #[test]
    fn planned_dishes_are_listed_by_meal() {
        with_ctx(|ctx| {
            let lunch = create_recipe(ctx, "Bún chả").summary.id;
            let dinner = create_recipe(ctx, "Gà kho").summary.id;
            plan_meal(ctx, "2026-10-10", MealSlot::Dinner, &dinner);
            plan_meal(ctx, "2026-10-10", MealSlot::Lunch, &lunch);
            let menu = get(ctx, "2026-10-10").unwrap();
            assert_eq!(menu.source, MenuSource::Planned);
            let names: Vec<_> = menu.dishes.iter().map(|dish| dish.name.as_str()).collect();
            assert_eq!(names, ["Bún chả", "Gà kho"]);
            assert_eq!(menu.dishes[0].slot, Some(MealSlot::Lunch));
        });
    }

    #[test]
    fn a_dish_planned_for_another_day_does_not_count() {
        with_ctx(|ctx| {
            let id = create_recipe(ctx, "Gà kho").summary.id;
            plan_meal(ctx, "2026-10-11", MealSlot::Dinner, &id);
            assert_eq!(get(ctx, "2026-10-10").unwrap().source, MenuSource::Suggested);
        });
    }

    #[test]
    fn an_empty_day_gets_one_suggested_recipe_without_a_meal() {
        with_ctx(|ctx| {
            create_recipe(ctx, "Bún chả");
            create_recipe(ctx, "Gà kho");
            let menu = get(ctx, "2026-10-10").unwrap();
            assert_eq!(menu.source, MenuSource::Suggested);
            assert_eq!(menu.dishes.len(), 1);
            assert_eq!(menu.dishes[0].slot, None);
        });
    }

    #[test]
    fn the_suggestion_is_the_same_every_time_it_is_asked() {
        with_ctx(|ctx| {
            for name in ["Bún chả", "Gà kho", "Canh chua", "Phở bò"] {
                create_recipe(ctx, name);
            }
            let first = get(ctx, "2026-10-10").unwrap();
            assert_eq!(get(ctx, "2026-10-10").unwrap(), first);
        });
    }

    #[test]
    fn without_recipes_or_plan_there_is_nothing_to_say() {
        with_ctx(|ctx| {
            let menu = get(ctx, "2026-10-10").unwrap();
            assert_eq!(menu.source, MenuSource::Empty);
            assert!(menu.dishes.is_empty());
        });
    }

    #[test]
    fn a_date_that_does_not_exist_is_a_validation_error() {
        with_ctx(|ctx| assert_code(get_many(ctx, "2026-13-45", None), ErrorCode::Validation));
    }

    #[test]
    fn three_mornings_are_returned_by_default_in_date_order() {
        with_ctx(|ctx| {
            let id = create_recipe(ctx, "Gà kho").summary.id;
            plan_meal(ctx, "2026-10-11", MealSlot::Dinner, &id);
            let menus = get_many(ctx, "2026-10-10", None).unwrap();
            let days: Vec<_> = menus.iter().map(|menu| (menu.date.as_str(), menu.source)).collect();
            assert_eq!(
                days,
                [
                    ("2026-10-10", MenuSource::Suggested),
                    ("2026-10-11", MenuSource::Planned),
                    ("2026-10-12", MenuSource::Suggested),
                ]
            );
        });
    }

    #[test]
    fn too_many_days_is_a_validation_error() {
        with_ctx(|ctx| assert_code(get_many(ctx, "2026-10-10", Some(8)), ErrorCode::Validation));
    }
}
