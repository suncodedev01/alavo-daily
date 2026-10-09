use std::collections::HashMap;

use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::recipes::kinds::Aisle;
use alavo_domain::recipes::recipe::{Ingredient, IngredientTotals};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;

pub fn insert_ingredient(
    db: &dyn Database,
    recipe_id: &str,
    ingredient: &Ingredient,
    updated_at: i64,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO recipes_ingredients
            (id, recipe_id, name, quantity, unit, aisle, cost_vnd, position, updated_at,
             deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    "#;
    db.execute(
        sql,
        &[
            Value::from(ingredient.id.as_str()),
            Value::from(recipe_id),
            Value::from(ingredient.name.as_str()),
            Value::from(ingredient.quantity),
            Value::from(ingredient.unit.as_str()),
            Value::from(ingredient.aisle.as_str()),
            Value::from(ingredient.cost_vnd.vnd()),
            Value::from(ingredient.position.as_str()),
            Value::from(updated_at),
        ],
    )
    .map(|_| ())
}

pub fn list_ingredients(db: &dyn Database, recipe_id: &str) -> Result<Vec<Ingredient>, EngineError> {
    let sql = r#"
        SELECT id, name, quantity, unit, aisle, cost_vnd, position
        FROM recipes_ingredients
        WHERE recipe_id = ? AND deleted_at IS NULL
        ORDER BY position, id
    "#;
    db.query(sql, &[Value::from(recipe_id)])?.iter().map(ingredient_from_row).collect()
}

/// Cost and number of ingredients per recipe id, for recipes that have any.
pub fn ingredient_totals(db: &dyn Database) -> Result<HashMap<String, IngredientTotals>, EngineError> {
    let sql = r#"
        SELECT recipe_id, COUNT(*) AS item_count, COALESCE(SUM(cost_vnd), 0) AS total_cost
        FROM recipes_ingredients
        WHERE deleted_at IS NULL
        GROUP BY recipe_id
    "#;
    let mut totals = HashMap::new();
    for row in db.query(sql, &[])? {
        let value = IngredientTotals {
            cost: Money(row.int("total_cost")?),
            count: row.int("item_count")?,
        };
        totals.insert(row.text("recipe_id")?, value);
    }
    Ok(totals)
}

pub fn soft_delete_ingredient(db: &dyn Database, id: &str, hlc: i64) -> Result<(), EngineError> {
    let sql = "UPDATE recipes_ingredients SET deleted_at = ?, updated_at = ? WHERE id = ?";
    db.execute(sql, &[Value::from(hlc), Value::from(hlc), Value::from(id)]).map(|_| ())
}

fn ingredient_from_row(row: &Row) -> Result<Ingredient, EngineError> {
    Ok(Ingredient {
        id: row.text("id")?,
        name: row.text("name")?,
        quantity: row.real("quantity")?,
        unit: row.text("unit")?,
        aisle: Aisle::parse(&row.text("aisle")?)?,
        cost_vnd: Money(row.int("cost_vnd")?),
        position: row.text("position")?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use super::*;
    use crate::testing::migrated_memory_db;

    fn ingredient(id: &str, position: &str, cost: i64) -> Ingredient {
        Ingredient {
            id: id.into(),
            name: format!("Nguyên liệu {id}"),
            quantity: 0.5,
            unit: "muỗng cà phê".into(),
            aisle: Aisle::Spices,
            cost_vnd: Money(cost),
            position: position.into(),
        }
    }

    #[test]
    fn fractional_quantities_and_aisles_round_trip() {
        let db = migrated_memory_db();
        insert_ingredient(&db, "r1", &ingredient("a", "0001", 1000), 7).unwrap();
        assert_eq!(list_ingredients(&db, "r1").unwrap(), [ingredient("a", "0001", 1000)]);
    }

    #[test]
    fn ingredients_come_back_in_position_order_for_their_own_recipe_only() {
        let db = migrated_memory_db();
        insert_ingredient(&db, "r1", &ingredient("b", "0002", 0), 7).unwrap();
        insert_ingredient(&db, "r1", &ingredient("a", "0001", 0), 7).unwrap();
        insert_ingredient(&db, "r2", &ingredient("c", "0001", 0), 7).unwrap();
        let ids: Vec<_> = list_ingredients(&db, "r1").unwrap().into_iter().map(|i| i.id).collect();
        assert_eq!(ids, ["a", "b"]);
    }

    #[test]
    fn a_soft_deleted_ingredient_is_not_listed_or_counted() {
        let db = migrated_memory_db();
        insert_ingredient(&db, "r1", &ingredient("a", "0001", 1000), 7).unwrap();
        insert_ingredient(&db, "r1", &ingredient("b", "0002", 2000), 7).unwrap();
        soft_delete_ingredient(&db, "a", 9).unwrap();
        assert_eq!(list_ingredients(&db, "r1").unwrap().len(), 1);
        assert_eq!(ingredient_totals(&db).unwrap()["r1"], IngredientTotals { cost: Money(2000), count: 1 });
    }

    #[test]
    fn totals_are_grouped_per_recipe() {
        let db = migrated_memory_db();
        insert_ingredient(&db, "r1", &ingredient("a", "0001", 1000), 7).unwrap();
        insert_ingredient(&db, "r1", &ingredient("b", "0002", 500), 7).unwrap();
        insert_ingredient(&db, "r2", &ingredient("c", "0001", 300), 7).unwrap();
        let totals = ingredient_totals(&db).unwrap();
        assert_eq!(totals["r1"], IngredientTotals { cost: Money(1500), count: 2 });
        assert_eq!(totals["r2"], IngredientTotals { cost: Money(300), count: 1 });
        assert_eq!(totals.len(), 2);
    }
}
