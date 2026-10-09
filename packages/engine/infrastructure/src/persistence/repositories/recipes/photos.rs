use alavo_domain::ports::{Database, Value};
use alavo_domain::shared::error::EngineError;

/// A recipe has at most one photo and the row uses the recipe's id as its own id, so two devices
/// that photograph the same recipe write the same row.
pub fn upsert_photo(
    db: &dyn Database,
    recipe_id: &str,
    data_url: &str,
    updated_at: i64,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO recipes_photos (id, data_url, updated_at, deleted_at)
        VALUES (?, ?, ?, NULL)
        ON CONFLICT (id) DO UPDATE SET data_url = excluded.data_url,
                                       updated_at = excluded.updated_at,
                                       deleted_at = NULL
    "#;
    let params = [Value::from(recipe_id), Value::from(data_url), Value::from(updated_at)];
    db.execute(sql, &params).map(|_| ())
}

pub fn find_photo(db: &dyn Database, recipe_id: &str) -> Result<Option<String>, EngineError> {
    let sql = "SELECT data_url FROM recipes_photos WHERE id = ? AND deleted_at IS NULL";
    db.query(sql, &[Value::from(recipe_id)])?.first().map(|row| row.text("data_url")).transpose()
}

pub fn soft_delete_photo(db: &dyn Database, recipe_id: &str, hlc: i64) -> Result<(), EngineError> {
    let sql = "UPDATE recipes_photos SET deleted_at = ?, updated_at = ? WHERE id = ?";
    db.execute(sql, &[Value::from(hlc), Value::from(hlc), Value::from(recipe_id)]).map(|_| ())
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use super::*;
    use crate::testing::migrated_memory_db;

    const PHOTO: &str = "data:image/jpeg;base64,/9j/4AAQ";

    #[test]
    fn a_photo_round_trips_by_recipe_id() {
        let db = migrated_memory_db();
        assert_eq!(find_photo(&db, "r1").unwrap(), None);
        upsert_photo(&db, "r1", PHOTO, 5).unwrap();
        assert_eq!(find_photo(&db, "r1").unwrap().as_deref(), Some(PHOTO));
        assert_eq!(find_photo(&db, "r2").unwrap(), None);
    }

    #[test]
    fn a_second_photo_replaces_the_first_in_the_same_row() {
        let db = migrated_memory_db();
        upsert_photo(&db, "r1", PHOTO, 5).unwrap();
        upsert_photo(&db, "r1", "data:image/png;base64,iVBOR", 6).unwrap();
        let rows = db.query("SELECT id FROM recipes_photos", &[]).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(find_photo(&db, "r1").unwrap().as_deref(), Some("data:image/png;base64,iVBOR"));
    }

    #[test]
    fn a_soft_deleted_photo_is_hidden_and_can_be_set_again() {
        let db = migrated_memory_db();
        upsert_photo(&db, "r1", PHOTO, 5).unwrap();
        soft_delete_photo(&db, "r1", 9).unwrap();
        assert_eq!(find_photo(&db, "r1").unwrap(), None);
        upsert_photo(&db, "r1", PHOTO, 10).unwrap();
        assert_eq!(find_photo(&db, "r1").unwrap().as_deref(), Some(PHOTO));
    }
}
