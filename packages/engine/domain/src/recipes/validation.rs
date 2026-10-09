use crate::recipes::position::MAX_POSITIONS;
use crate::recipes::recipe::{
    IngredientInput, RecipeBody, RecipeInput, StepInput, DEFAULT_ICON, DEFAULT_UNIT,
};
use crate::shared::error::EngineError;
use crate::shared::money::Money;

pub const MIN_SERVINGS: i64 = 1;
pub const MAX_SERVINGS: i64 = 50;

/// Checks a recipe and returns it cleaned up: text trimmed, blank ingredients, steps and tags
/// dropped, empty units and icons replaced by their defaults.
pub fn validate_recipe(input: RecipeInput) -> Result<RecipeInput, EngineError> {
    let body = clean_body(input.body)?;
    let ingredients = clean_ingredients(input.ingredients)?;
    let steps = clean_steps(input.steps)?;
    Ok(RecipeInput { body, ingredients, steps })
}

fn clean_body(body: RecipeBody) -> Result<RecipeBody, EngineError> {
    let name = body.name.trim().to_string();
    if name.is_empty() {
        return Err(EngineError::validation("recipe name must not be empty"));
    }
    if !(MIN_SERVINGS..=MAX_SERVINGS).contains(&body.servings) {
        return Err(EngineError::validation(format!(
            "servings must be between {MIN_SERVINGS} and {MAX_SERVINGS}"
        )));
    }
    if body.prep_min < 0 || body.cook_min < 0 || body.kcal.is_some_and(|kcal| kcal < 0) {
        return Err(EngineError::validation("times and calories must not be negative"));
    }
    Ok(RecipeBody {
        name,
        tags: clean_tags(&body.tags),
        icon: non_empty_or(&body.icon, DEFAULT_ICON),
        note: body.note.trim().to_string(),
        ..body
    })
}

fn clean_tags(tags: &[String]) -> Vec<String> {
    let mut clean: Vec<String> = Vec::new();
    for tag in tags.iter().map(|tag| tag.trim()).filter(|tag| !tag.is_empty()) {
        if !clean.iter().any(|own| own == tag) {
            clean.push(tag.to_string());
        }
    }
    clean
}

fn clean_ingredients(items: Vec<IngredientInput>) -> Result<Vec<IngredientInput>, EngineError> {
    let named: Vec<IngredientInput> = items.into_iter().filter_map(clean_ingredient).collect();
    check_list_length(named.len(), "ingredients")?;
    named.iter().try_for_each(check_ingredient)?;
    Ok(named)
}

fn clean_ingredient(item: IngredientInput) -> Option<IngredientInput> {
    let name = item.name.trim();
    if name.is_empty() {
        return None;
    }
    Some(IngredientInput {
        name: name.to_string(),
        unit: non_empty_or(&item.unit, DEFAULT_UNIT),
        ..item
    })
}

fn check_ingredient(item: &IngredientInput) -> Result<(), EngineError> {
    if !item.quantity.is_finite() || item.quantity <= 0.0 {
        return Err(EngineError::validation(format!("quantity of {} must be above 0", item.name)));
    }
    if item.cost_vnd < Money(0) {
        return Err(EngineError::validation(format!("cost of {} must not be negative", item.name)));
    }
    Ok(())
}

fn clean_steps(items: Vec<StepInput>) -> Result<Vec<StepInput>, EngineError> {
    let steps: Vec<StepInput> = items
        .into_iter()
        .filter(|step| !step.text.trim().is_empty())
        .map(|step| StepInput { text: step.text.trim().to_string(), ..step })
        .collect();
    check_list_length(steps.len(), "steps")?;
    if steps.iter().any(|step| step.timer_min < 0) {
        return Err(EngineError::validation("timerMin must not be negative"));
    }
    Ok(steps)
}

fn check_list_length(length: usize, what: &str) -> Result<(), EngineError> {
    if length > MAX_POSITIONS {
        return Err(EngineError::validation(format!("too many {what}")));
    }
    Ok(())
}

fn non_empty_or(text: &str, fallback: &str) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() { fallback.to_string() } else { trimmed.to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::recipes::kinds::Aisle;
    use crate::recipes::recipe::tests::body;

    fn ingredient(name: &str, quantity: f64) -> IngredientInput {
        IngredientInput {
            name: name.into(),
            quantity,
            unit: "g".into(),
            aisle: Aisle::Other,
            cost_vnd: Money(0),
        }
    }

    fn input() -> RecipeInput {
        RecipeInput {
            body: body("Canh chua"),
            ingredients: vec![ingredient("Cá", 500.0)],
            steps: vec![StepInput { text: "Nấu".into(), timer_min: 5 }],
        }
    }

    fn rejected(change: impl FnOnce(&mut RecipeInput)) {
        let mut candidate = input();
        change(&mut candidate);
        assert!(validate_recipe(candidate).is_err());
    }

    #[test]
    fn a_complete_recipe_passes_unchanged() {
        assert_eq!(validate_recipe(input()).unwrap(), input());
    }

    #[test]
    fn blank_name_is_rejected() {
        rejected(|recipe| recipe.body.name = "   ".into());
    }

    #[test]
    fn servings_must_be_between_one_and_fifty() {
        rejected(|recipe| recipe.body.servings = 0);
        rejected(|recipe| recipe.body.servings = 51);
        for servings in [1, 50] {
            let mut recipe = input();
            recipe.body.servings = servings;
            assert!(validate_recipe(recipe).is_ok());
        }
    }

    #[test]
    fn a_recipe_with_only_a_name_is_valid() {
        let mut recipe = input();
        recipe.ingredients.clear();
        recipe.steps.clear();
        let clean = validate_recipe(recipe).unwrap();
        assert!(clean.ingredients.is_empty());
        assert!(clean.steps.is_empty());
    }

    #[test]
    fn only_blank_ingredient_rows_leave_an_empty_list() {
        let mut recipe = input();
        recipe.ingredients = vec![ingredient("  ", 0.0), ingredient("", -1.0)];
        assert!(validate_recipe(recipe).unwrap().ingredients.is_empty());
    }

    #[test]
    fn blank_ingredient_rows_are_dropped_when_another_one_is_named() {
        let mut recipe = input();
        recipe.ingredients.push(ingredient("", 3.0));
        assert_eq!(validate_recipe(recipe).unwrap().ingredients.len(), 1);
    }

    #[test]
    fn quantity_must_be_a_positive_finite_number() {
        rejected(|recipe| recipe.ingredients[0].quantity = 0.0);
        rejected(|recipe| recipe.ingredients[0].quantity = -1.0);
        rejected(|recipe| recipe.ingredients[0].quantity = f64::NAN);
        rejected(|recipe| recipe.ingredients[0].quantity = f64::INFINITY);
    }

    #[test]
    fn negative_numbers_are_rejected() {
        rejected(|recipe| recipe.steps[0].timer_min = -1);
        rejected(|recipe| recipe.body.prep_min = -1);
        rejected(|recipe| recipe.body.cook_min = -1);
        rejected(|recipe| recipe.body.kcal = Some(-5));
        rejected(|recipe| recipe.ingredients[0].cost_vnd = Money(-1));
    }

    #[test]
    fn a_zero_timer_and_zero_cost_are_valid() {
        let mut recipe = input();
        recipe.steps[0].timer_min = 0;
        assert!(validate_recipe(recipe).is_ok());
    }

    #[test]
    fn text_is_trimmed_and_defaults_fill_empty_unit_and_icon() {
        let mut recipe = input();
        recipe.body.name = "  Canh chua ".into();
        recipe.body.icon = " ".into();
        recipe.ingredients[0].unit = "".into();
        recipe.steps.push(StepInput { text: "   ".into(), timer_min: 0 });
        let clean = validate_recipe(recipe).unwrap();
        assert_eq!(clean.body.name, "Canh chua");
        assert_eq!(clean.body.icon, "cooking-pot");
        assert_eq!(clean.ingredients[0].unit, "phần");
        assert_eq!(clean.steps.len(), 1);
    }

    #[test]
    fn tags_are_trimmed_deduplicated_and_blank_ones_dropped() {
        let mut recipe = input();
        recipe.body.tags = vec![" Canh ".into(), "Canh".into(), "".into(), "Nhanh".into()];
        assert_eq!(validate_recipe(recipe).unwrap().body.tags, ["Canh", "Nhanh"]);
    }
}
