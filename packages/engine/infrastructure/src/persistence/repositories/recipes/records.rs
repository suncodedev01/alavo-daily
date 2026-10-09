use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::recipes::kinds::RecipeLevel;
use alavo_domain::recipes::recipe::{RecipeBody, RecipeRecord};
use alavo_domain::shared::error::EngineError;

pub fn insert_recipe(db: &dyn Database, record: &RecipeRecord) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO recipes_recipes
            (id, name, tags, prep_min, cook_min, servings, level, favorite, icon, kcal, note,
             created_at, updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let body = &record.body;
    db.execute(
        sql,
        &[
            Value::from(record.id.as_str()),
            Value::from(body.name.as_str()),
            Value::from(tags_json(body)?),
            Value::from(body.prep_min),
            Value::from(body.cook_min),
            Value::from(body.servings),
            Value::from(body.level.as_str()),
            Value::from(record.favorite),
            Value::from(body.icon.as_str()),
            Value::from(body.kcal),
            Value::from(body.note.as_str()),
            Value::from(record.created_at),
            Value::from(record.updated_at),
            Value::from(record.field_updated_at.as_str()),
        ],
    )
    .map(|_| ())
}

pub fn update_recipe(db: &dyn Database, record: &RecipeRecord) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE recipes_recipes
        SET name = ?, tags = ?, prep_min = ?, cook_min = ?, servings = ?, level = ?,
            favorite = ?, icon = ?, kcal = ?, note = ?, updated_at = ?, field_updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
    "#;
    let body = &record.body;
    db.execute(
        sql,
        &[
            Value::from(body.name.as_str()),
            Value::from(tags_json(body)?),
            Value::from(body.prep_min),
            Value::from(body.cook_min),
            Value::from(body.servings),
            Value::from(body.level.as_str()),
            Value::from(record.favorite),
            Value::from(body.icon.as_str()),
            Value::from(body.kcal),
            Value::from(body.note.as_str()),
            Value::from(record.updated_at),
            Value::from(record.field_updated_at.as_str()),
            Value::from(record.id.as_str()),
        ],
    )
    .map(|_| ())
}

pub fn find_recipe(db: &dyn Database, id: &str) -> Result<Option<RecipeRecord>, EngineError> {
    let sql = r#"
        SELECT id, name, tags, prep_min, cook_min, servings, level, favorite, icon, kcal, note,
               created_at, updated_at, field_updated_at
        FROM recipes_recipes
        WHERE id = ? AND deleted_at IS NULL
    "#;
    db.query(sql, &[Value::from(id)])?.first().map(record_from_row).transpose()
}

pub fn list_recipes(db: &dyn Database) -> Result<Vec<RecipeRecord>, EngineError> {
    let sql = r#"
        SELECT id, name, tags, prep_min, cook_min, servings, level, favorite, icon, kcal, note,
               created_at, updated_at, field_updated_at
        FROM recipes_recipes
        WHERE deleted_at IS NULL
        ORDER BY name, id
    "#;
    db.query(sql, &[])?.iter().map(record_from_row).collect()
}

pub fn soft_delete_recipe(db: &dyn Database, id: &str, hlc: i64) -> Result<(), EngineError> {
    let sql = "UPDATE recipes_recipes SET deleted_at = ?, updated_at = ? WHERE id = ?";
    db.execute(sql, &[Value::from(hlc), Value::from(hlc), Value::from(id)]).map(|_| ())
}

fn tags_json(body: &RecipeBody) -> Result<String, EngineError> {
    serde_json::to_string(&body.tags).map_err(EngineError::from)
}

fn record_from_row(row: &Row) -> Result<RecipeRecord, EngineError> {
    let tags: Vec<String> = serde_json::from_str(&row.text("tags")?)
        .map_err(|error| EngineError::db(format!("recipe tags are not a JSON list: {error}")))?;
    Ok(RecipeRecord {
        id: row.text("id")?,
        body: RecipeBody {
            name: row.text("name")?,
            tags,
            prep_min: row.int("prep_min")?,
            cook_min: row.int("cook_min")?,
            servings: row.int("servings")?,
            level: RecipeLevel::parse(&row.text("level")?)?,
            icon: row.text("icon")?,
            kcal: row.opt_int("kcal")?,
            note: row.text("note")?,
        },
        favorite: row.bool("favorite")?,
        created_at: row.int("created_at")?,
        updated_at: row.int("updated_at")?,
        field_updated_at: row.text("field_updated_at")?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use super::*;
    use crate::testing::migrated_memory_db;

    fn record(id: &str, name: &str) -> RecipeRecord {
        RecipeRecord {
            id: id.into(),
            body: RecipeBody {
                name: name.into(),
                tags: vec!["Món chính".into(), "Nhanh".into()],
                prep_min: 15,
                cook_min: 40,
                servings: 4,
                level: RecipeLevel::Hard,
                icon: "cooking-pot".into(),
                kcal: Some(420),
                note: "ghi chú".into(),
            },
            favorite: true,
            created_at: 100,
            updated_at: 200,
            field_updated_at: r#"{"name":200}"#.into(),
        }
    }

    #[test]
    fn a_recipe_survives_a_round_trip_through_the_table() {
        let db = migrated_memory_db();
        insert_recipe(&db, &record("r1", "Gà kho")).unwrap();
        assert_eq!(find_recipe(&db, "r1").unwrap(), Some(record("r1", "Gà kho")));
    }

    #[test]
    fn a_missing_kcal_comes_back_as_none() {
        let db = migrated_memory_db();
        let mut plain = record("r1", "Gà kho");
        plain.body.kcal = None;
        insert_recipe(&db, &plain).unwrap();
        assert_eq!(find_recipe(&db, "r1").unwrap().unwrap().body.kcal, None);
    }

    #[test]
    fn update_rewrites_the_editable_columns_and_keeps_created_at() {
        let db = migrated_memory_db();
        insert_recipe(&db, &record("r1", "Gà kho")).unwrap();
        let mut changed = record("r1", "Gà rang");
        changed.favorite = false;
        changed.created_at = 999;
        changed.updated_at = 300;
        update_recipe(&db, &changed).unwrap();
        let stored = find_recipe(&db, "r1").unwrap().unwrap();
        assert_eq!((stored.body.name.as_str(), stored.favorite, stored.updated_at), ("Gà rang", false, 300));
        assert_eq!(stored.created_at, 100);
    }

    #[test]
    fn a_soft_deleted_recipe_is_hidden_from_find_and_list() {
        let db = migrated_memory_db();
        insert_recipe(&db, &record("r1", "Gà kho")).unwrap();
        insert_recipe(&db, &record("r2", "Bún chả")).unwrap();
        soft_delete_recipe(&db, "r1", 500).unwrap();
        assert!(find_recipe(&db, "r1").unwrap().is_none());
        assert_eq!(list_recipes(&db).unwrap().len(), 1);
        let rows = db.query("SELECT deleted_at FROM recipes_recipes WHERE id = 'r1'", &[]);
        assert_eq!(rows.unwrap()[0].int("deleted_at").unwrap(), 500);
    }

    #[test]
    fn update_does_not_touch_a_deleted_recipe() {
        let db = migrated_memory_db();
        insert_recipe(&db, &record("r1", "Gà kho")).unwrap();
        soft_delete_recipe(&db, "r1", 500).unwrap();
        update_recipe(&db, &record("r1", "Đổi tên")).unwrap();
        let rows = db.query("SELECT name FROM recipes_recipes WHERE id = 'r1'", &[]).unwrap();
        assert_eq!(rows[0].text("name").unwrap(), "Gà kho");
    }

    #[test]
    fn list_orders_by_name() {
        let db = migrated_memory_db();
        insert_recipe(&db, &record("r1", "Phở")).unwrap();
        insert_recipe(&db, &record("r2", "Bún")).unwrap();
        let names: Vec<_> = list_recipes(&db).unwrap().into_iter().map(|r| r.body.name).collect();
        assert_eq!(names, ["Bún", "Phở"]);
    }

    #[test]
    fn an_unknown_stored_level_is_reported_instead_of_hidden() {
        let db = migrated_memory_db();
        insert_recipe(&db, &record("r1", "Gà kho")).unwrap();
        db.execute("UPDATE recipes_recipes SET level = 'Khó'", &[]).unwrap();
        assert!(find_recipe(&db, "r1").is_err());
    }
}
