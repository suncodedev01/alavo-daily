use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::recipes::kinds::MealSlot;
use alavo_domain::recipes::plan::PlanEntry;
use alavo_domain::shared::error::EngineError;

pub fn insert_plan_entry(
    db: &dyn Database,
    entry: &PlanEntry,
    updated_at: i64,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO recipes_plan_entries
            (id, planned_on, slot, recipe_id, servings, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
    "#;
    db.execute(
        sql,
        &[
            Value::from(entry.id.as_str()),
            Value::from(entry.date.as_str()),
            Value::from(entry.slot.as_str()),
            Value::from(entry.recipe_id.as_str()),
            Value::from(entry.servings),
            Value::from(updated_at),
        ],
    )
    .map(|_| ())
}

pub fn find_plan_entry(db: &dyn Database, id: &str) -> Result<Option<PlanEntry>, EngineError> {
    let sql = r#"
        SELECT e.id, e.planned_on, e.slot, e.recipe_id, e.servings,
               r.name AS recipe_name, r.icon AS recipe_icon
        FROM recipes_plan_entries e
        JOIN recipes_recipes r ON r.id = e.recipe_id AND r.deleted_at IS NULL
        WHERE e.id = ? AND e.deleted_at IS NULL
    "#;
    db.query(sql, &[Value::from(id)])?.first().map(entry_from_row).transpose()
}

pub fn find_same_meal(
    db: &dyn Database,
    date: &str,
    slot: MealSlot,
    recipe_id: &str,
) -> Result<Option<PlanEntry>, EngineError> {
    let sql = r#"
        SELECT e.id, e.planned_on, e.slot, e.recipe_id, e.servings,
               r.name AS recipe_name, r.icon AS recipe_icon
        FROM recipes_plan_entries e
        JOIN recipes_recipes r ON r.id = e.recipe_id AND r.deleted_at IS NULL
        WHERE e.planned_on = ? AND e.slot = ? AND e.recipe_id = ? AND e.deleted_at IS NULL
        ORDER BY e.updated_at, e.id
    "#;
    let params = [Value::from(date), Value::from(slot.as_str()), Value::from(recipe_id)];
    db.query(sql, &params)?.first().map(entry_from_row).transpose()
}

/// Entries with `first <= date <= last`, by date, then breakfast, lunch, dinner, then the order
/// they were added in.
pub fn list_plan_between(
    db: &dyn Database,
    first: &str,
    last: &str,
) -> Result<Vec<PlanEntry>, EngineError> {
    let sql = r#"
        SELECT e.id, e.planned_on, e.slot, e.recipe_id, e.servings,
               r.name AS recipe_name, r.icon AS recipe_icon
        FROM recipes_plan_entries e
        JOIN recipes_recipes r ON r.id = e.recipe_id AND r.deleted_at IS NULL
        WHERE e.planned_on >= ? AND e.planned_on <= ? AND e.deleted_at IS NULL
        ORDER BY e.planned_on,
                 CASE e.slot WHEN 'breakfast' THEN 0 WHEN 'lunch' THEN 1 ELSE 2 END,
                 e.updated_at, e.id
    "#;
    db.query(sql, &[Value::from(first), Value::from(last)])?
        .iter()
        .map(entry_from_row)
        .collect()
}

pub fn list_plan_entry_ids_of_recipe(
    db: &dyn Database,
    recipe_id: &str,
) -> Result<Vec<String>, EngineError> {
    let sql = r#"
        SELECT id
        FROM recipes_plan_entries
        WHERE recipe_id = ? AND deleted_at IS NULL
        ORDER BY id
    "#;
    db.query(sql, &[Value::from(recipe_id)])?.iter().map(|row| row.text("id")).collect()
}

pub fn soft_delete_plan_entry(db: &dyn Database, id: &str, hlc: i64) -> Result<(), EngineError> {
    let sql = "UPDATE recipes_plan_entries SET deleted_at = ?, updated_at = ? WHERE id = ?";
    db.execute(sql, &[Value::from(hlc), Value::from(hlc), Value::from(id)]).map(|_| ())
}

fn entry_from_row(row: &Row) -> Result<PlanEntry, EngineError> {
    Ok(PlanEntry {
        id: row.text("id")?,
        date: row.text("planned_on")?,
        slot: MealSlot::parse(&row.text("slot")?)?,
        recipe_id: row.text("recipe_id")?,
        recipe_name: row.text("recipe_name")?,
        recipe_icon: row.text("recipe_icon")?,
        servings: row.int("servings")?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use alavo_domain::recipes::recipe::{RecipeBody, RecipeRecord};

    use super::*;
    use crate::persistence::repositories::recipes::records::{insert_recipe, soft_delete_recipe};
    use crate::testing::migrated_memory_db;

    fn add_recipe(db: &dyn Database, id: &str, name: &str) {
        let body = RecipeBody {
            name: name.into(),
            tags: vec![],
            prep_min: 0,
            cook_min: 0,
            servings: 2,
            level: Default::default(),
            icon: "fork-knife".into(),
            kcal: None,
            note: String::new(),
        };
        let record = RecipeRecord {
            id: id.into(),
            body,
            favorite: false,
            created_at: 1,
            updated_at: 1,
            field_updated_at: "{}".into(),
        };
        insert_recipe(db, &record).unwrap();
    }

    fn entry(id: &str, date: &str, slot: MealSlot, recipe_id: &str) -> PlanEntry {
        PlanEntry {
            id: id.into(),
            date: date.into(),
            slot,
            recipe_id: recipe_id.into(),
            recipe_name: String::new(),
            recipe_icon: String::new(),
            servings: 2,
        }
    }

    fn ids(entries: Vec<PlanEntry>) -> Vec<String> {
        entries.into_iter().map(|entry| entry.id).collect()
    }

    #[test]
    fn an_entry_is_read_back_with_the_recipe_name_and_icon_joined_in() {
        let db = migrated_memory_db();
        add_recipe(&db, "r1", "Cơm tấm");
        insert_plan_entry(&db, &entry("e1", "2026-10-05", MealSlot::Lunch, "r1"), 5).unwrap();
        let found = find_plan_entry(&db, "e1").unwrap().unwrap();
        assert_eq!((found.recipe_name.as_str(), found.recipe_icon.as_str()), ("Cơm tấm", "fork-knife"));
        assert_eq!((found.slot, found.servings), (MealSlot::Lunch, 2));
    }

    #[test]
    fn the_range_is_inclusive_on_both_ends() {
        let db = migrated_memory_db();
        add_recipe(&db, "r1", "A");
        for (id, date) in [("e0", "2026-10-04"), ("e1", "2026-10-05"), ("e2", "2026-10-11"), ("e3", "2026-10-12")] {
            insert_plan_entry(&db, &entry(id, date, MealSlot::Dinner, "r1"), 5).unwrap();
        }
        let found = list_plan_between(&db, "2026-10-05", "2026-10-11").unwrap();
        assert_eq!(ids(found), ["e1", "e2"]);
    }

    #[test]
    fn entries_sort_by_date_then_slot_then_insertion_order() {
        let db = migrated_memory_db();
        add_recipe(&db, "r1", "A");
        let rows = [
            ("e1", "2026-10-06", MealSlot::Breakfast, 1),
            ("e2", "2026-10-05", MealSlot::Dinner, 2),
            ("e3", "2026-10-05", MealSlot::Lunch, 3),
            ("e4", "2026-10-05", MealSlot::Dinner, 4),
            ("e5", "2026-10-05", MealSlot::Breakfast, 5),
        ];
        for (id, date, slot, stamp) in rows {
            insert_plan_entry(&db, &entry(id, date, slot, "r1"), stamp).unwrap();
        }
        let found = list_plan_between(&db, "2026-10-05", "2026-10-06").unwrap();
        assert_eq!(ids(found), ["e5", "e3", "e2", "e4", "e1"]);
    }

    #[test]
    fn find_same_meal_matches_date_slot_and_recipe() {
        let db = migrated_memory_db();
        add_recipe(&db, "r1", "A");
        insert_plan_entry(&db, &entry("e1", "2026-10-05", MealSlot::Lunch, "r1"), 5).unwrap();
        assert!(find_same_meal(&db, "2026-10-05", MealSlot::Lunch, "r1").unwrap().is_some());
        assert!(find_same_meal(&db, "2026-10-05", MealSlot::Dinner, "r1").unwrap().is_none());
        assert!(find_same_meal(&db, "2026-10-06", MealSlot::Lunch, "r1").unwrap().is_none());
        assert!(find_same_meal(&db, "2026-10-05", MealSlot::Lunch, "r2").unwrap().is_none());
    }

    #[test]
    fn a_soft_deleted_entry_is_hidden_everywhere() {
        let db = migrated_memory_db();
        add_recipe(&db, "r1", "A");
        insert_plan_entry(&db, &entry("e1", "2026-10-05", MealSlot::Lunch, "r1"), 5).unwrap();
        soft_delete_plan_entry(&db, "e1", 9).unwrap();
        assert!(find_plan_entry(&db, "e1").unwrap().is_none());
        assert!(find_same_meal(&db, "2026-10-05", MealSlot::Lunch, "r1").unwrap().is_none());
        assert!(list_plan_between(&db, "2026-10-01", "2026-10-31").unwrap().is_empty());
        assert!(list_plan_entry_ids_of_recipe(&db, "r1").unwrap().is_empty());
    }

    #[test]
    fn entries_of_a_deleted_recipe_are_not_listed() {
        let db = migrated_memory_db();
        add_recipe(&db, "r1", "A");
        insert_plan_entry(&db, &entry("e1", "2026-10-05", MealSlot::Lunch, "r1"), 5).unwrap();
        soft_delete_recipe(&db, "r1", 9).unwrap();
        assert!(list_plan_between(&db, "2026-10-01", "2026-10-31").unwrap().is_empty());
        assert!(find_plan_entry(&db, "e1").unwrap().is_none());
    }

    #[test]
    fn entry_ids_of_a_recipe_exclude_other_recipes() {
        let db = migrated_memory_db();
        add_recipe(&db, "r1", "A");
        add_recipe(&db, "r2", "B");
        insert_plan_entry(&db, &entry("e1", "2026-10-05", MealSlot::Lunch, "r1"), 5).unwrap();
        insert_plan_entry(&db, &entry("e2", "2026-10-05", MealSlot::Lunch, "r2"), 5).unwrap();
        assert_eq!(list_plan_entry_ids_of_recipe(&db, "r1").unwrap(), ["e1"]);
    }
}
