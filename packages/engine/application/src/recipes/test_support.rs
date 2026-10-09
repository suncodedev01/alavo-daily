use alavo_domain::ports::Value;
use alavo_domain::recipes::kinds::{Aisle, MealSlot};
use alavo_domain::recipes::plan::{NewPlanEntry, PlanEntry};
use alavo_domain::recipes::recipe::{
    IngredientInput, Recipe, RecipeBody, RecipeInput, StepInput, DEFAULT_ICON,
};
use alavo_domain::shared::error::{EngineError, ErrorCode};
use alavo_domain::shared::hlc::HlcClock;
use alavo_domain::shared::money::Money;
use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};

use crate::context::Ctx;
use crate::recipes::{catalog, plan};

pub fn with_ctx<T>(work: impl FnOnce(&Ctx) -> T) -> T {
    let db = migrated_memory_db();
    let env = TestEnv::new();
    let clock = HlcClock::default();
    work(&Ctx::new(&db, &env, &clock, "device-a"))
}

pub fn ingredient(name: &str, amount: (f64, &str), aisle: Aisle, cost: i64) -> IngredientInput {
    let (quantity, unit) = amount;
    IngredientInput {
        name: name.into(),
        quantity,
        unit: unit.into(),
        aisle,
        cost_vnd: Money(cost),
    }
}

/// Four servings, 600 g of chicken (54.000 ₫) and 2 tablespoons of fish sauce (3.000 ₫).
pub fn recipe_input(name: &str) -> RecipeInput {
    RecipeInput {
        body: RecipeBody {
            name: name.into(),
            tags: vec!["Món chính".into()],
            prep_min: 15,
            cook_min: 40,
            servings: 4,
            level: Default::default(),
            icon: DEFAULT_ICON.into(),
            kcal: Some(420),
            note: String::new(),
        },
        ingredients: vec![
            ingredient("Đùi gà", (600.0, "g"), Aisle::MeatFish, 54_000),
            ingredient("Nước mắm", (2.0, "muỗng canh"), Aisle::Spices, 3_000),
        ],
        steps: vec![
            StepInput { text: "Ướp gà".into(), timer_min: 15 },
            StepInput { text: "Kho".into(), timer_min: 30 },
        ],
    }
}

pub fn create_recipe(ctx: &Ctx, name: &str) -> Recipe {
    catalog::create(ctx, recipe_input(name)).unwrap()
}

pub fn plan_meal(ctx: &Ctx, date: &str, slot: MealSlot, recipe_id: &str) -> PlanEntry {
    let entry = NewPlanEntry {
        date: date.into(),
        slot,
        recipe_id: recipe_id.into(),
        servings: None,
    };
    plan::add_to_plan(ctx, entry).unwrap()
}

pub fn event_count(ctx: &Ctx, entity_type: &str, action: &str) -> usize {
    let sql = r#"
        SELECT event_id
        FROM hub_delta_events
        WHERE module = 'recipes' AND entity_type = ? AND action = ?
    "#;
    let params = [Value::from(entity_type), Value::from(action)];
    ctx.db.query(sql, &params).unwrap().len()
}

pub fn all_event_count(ctx: &Ctx) -> usize {
    ctx.db.query("SELECT event_id FROM hub_delta_events", &[]).unwrap().len()
}

pub fn assert_code(result: Result<impl std::fmt::Debug, EngineError>, expected: ErrorCode) {
    match result {
        Err(error) => assert_eq!(error.code, expected, "{}", error.message),
        Ok(value) => panic!("expected {expected:?}, got Ok({value:?})"),
    }
}
