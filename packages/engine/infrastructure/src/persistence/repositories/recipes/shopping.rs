use std::collections::HashMap;

use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::recipes::kinds::Aisle;
use alavo_domain::recipes::shopping::CustomItem;
use alavo_domain::shared::error::EngineError;

pub fn insert_custom_item(
    db: &dyn Database,
    item: &CustomItem,
    updated_at: i64,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO recipes_shopping_items (id, name, quantity, unit, aisle, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
    "#;
    db.execute(
        sql,
        &[
            Value::from(item.id.as_str()),
            Value::from(item.name.as_str()),
            Value::from(item.quantity),
            Value::from(item.unit.as_str()),
            Value::from(item.aisle.as_str()),
            Value::from(updated_at),
        ],
    )
    .map(|_| ())
}

/// Hand-added items in the order they were added.
pub fn list_custom_items(db: &dyn Database) -> Result<Vec<CustomItem>, EngineError> {
    let sql = r#"
        SELECT id, name, quantity, unit, aisle
        FROM recipes_shopping_items
        WHERE deleted_at IS NULL
        ORDER BY updated_at, id
    "#;
    db.query(sql, &[])?.iter().map(item_from_row).collect()
}

pub fn soft_delete_custom_item(db: &dyn Database, id: &str, hlc: i64) -> Result<(), EngineError> {
    let sql = "UPDATE recipes_shopping_items SET deleted_at = ?, updated_at = ? WHERE id = ?";
    db.execute(sql, &[Value::from(hlc), Value::from(hlc), Value::from(id)]).map(|_| ())
}

pub fn upsert_have_flag(
    db: &dyn Database,
    key: &str,
    have: bool,
    updated_at: i64,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO recipes_shopping_state (id, have, updated_at, deleted_at)
        VALUES (?, ?, ?, NULL)
        ON CONFLICT (id) DO UPDATE SET have = excluded.have,
                                       updated_at = excluded.updated_at,
                                       deleted_at = NULL
    "#;
    db.execute(sql, &[Value::from(key), Value::from(have), Value::from(updated_at)]).map(|_| ())
}

pub fn find_have_flag(db: &dyn Database, key: &str) -> Result<Option<bool>, EngineError> {
    let sql = "SELECT have FROM recipes_shopping_state WHERE id = ? AND deleted_at IS NULL";
    db.query(sql, &[Value::from(key)])?.first().map(|row| row.bool("have")).transpose()
}

pub fn list_have_flags(db: &dyn Database) -> Result<HashMap<String, bool>, EngineError> {
    let sql = "SELECT id, have FROM recipes_shopping_state WHERE deleted_at IS NULL";
    let mut flags = HashMap::new();
    for row in db.query(sql, &[])? {
        flags.insert(row.text("id")?, row.bool("have")?);
    }
    Ok(flags)
}

fn item_from_row(row: &Row) -> Result<CustomItem, EngineError> {
    Ok(CustomItem {
        id: row.text("id")?,
        name: row.text("name")?,
        quantity: row.real("quantity")?,
        unit: row.text("unit")?,
        aisle: Aisle::parse(&row.text("aisle")?)?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use super::*;
    use crate::testing::migrated_memory_db;

    fn item(id: &str, name: &str) -> CustomItem {
        CustomItem {
            id: id.into(),
            name: name.into(),
            quantity: 1.5,
            unit: "hộp".into(),
            aisle: Aisle::Other,
        }
    }

    #[test]
    fn a_hand_added_item_round_trips_with_a_fractional_quantity() {
        let db = migrated_memory_db();
        insert_custom_item(&db, &item("c1", "Sữa"), 5).unwrap();
        assert_eq!(list_custom_items(&db).unwrap(), [item("c1", "Sữa")]);
    }

    #[test]
    fn items_come_back_in_the_order_they_were_added() {
        let db = migrated_memory_db();
        insert_custom_item(&db, &item("c2", "Trứng"), 6).unwrap();
        insert_custom_item(&db, &item("c1", "Sữa"), 5).unwrap();
        let names: Vec<_> = list_custom_items(&db).unwrap().into_iter().map(|i| i.name).collect();
        assert_eq!(names, ["Sữa", "Trứng"]);
    }

    #[test]
    fn a_soft_deleted_item_is_not_listed() {
        let db = migrated_memory_db();
        insert_custom_item(&db, &item("c1", "Sữa"), 5).unwrap();
        soft_delete_custom_item(&db, "c1", 9).unwrap();
        assert!(list_custom_items(&db).unwrap().is_empty());
    }

    #[test]
    fn a_have_flag_is_created_then_overwritten() {
        let db = migrated_memory_db();
        assert_eq!(find_have_flag(&db, "Sữa|hộp").unwrap(), None);
        upsert_have_flag(&db, "Sữa|hộp", true, 5).unwrap();
        assert_eq!(find_have_flag(&db, "Sữa|hộp").unwrap(), Some(true));
        upsert_have_flag(&db, "Sữa|hộp", false, 6).unwrap();
        assert_eq!(find_have_flag(&db, "Sữa|hộp").unwrap(), Some(false));
        assert_eq!(list_have_flags(&db).unwrap().len(), 1);
    }

    #[test]
    fn have_flags_are_listed_by_key() {
        let db = migrated_memory_db();
        upsert_have_flag(&db, "Sữa|hộp", true, 5).unwrap();
        upsert_have_flag(&db, "Gừng|g", false, 5).unwrap();
        let flags = list_have_flags(&db).unwrap();
        assert_eq!((flags["Sữa|hộp"], flags["Gừng|g"]), (true, false));
    }

    #[test]
    fn writing_a_flag_revives_a_tombstoned_one() {
        let db = migrated_memory_db();
        upsert_have_flag(&db, "Sữa|hộp", true, 5).unwrap();
        db.execute("UPDATE recipes_shopping_state SET deleted_at = 6", &[]).unwrap();
        assert_eq!(find_have_flag(&db, "Sữa|hộp").unwrap(), None);
        upsert_have_flag(&db, "Sữa|hộp", true, 7).unwrap();
        assert_eq!(find_have_flag(&db, "Sữa|hộp").unwrap(), Some(true));
    }
}
