use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::Entity;
use serde_json::{json, Map, Value as Json};

#[derive(Debug, Clone)]
pub struct Stamp {
    pub updated_at: i64,
    pub field_updated_at: String,
}

pub fn money_value(amount: Money) -> Value {
    Value::Int(amount.vnd())
}

pub fn query_rows<T>(
    db: &dyn Database,
    sql: &str,
    params: &[Value],
    read: impl Fn(&Row) -> Result<T, EngineError>,
) -> Result<Vec<T>, EngineError> {
    db.query(sql, params)?.iter().map(read).collect()
}

pub fn query_one<T>(
    db: &dyn Database,
    sql: &str,
    params: &[Value],
    read: impl Fn(&Row) -> Result<T, EngineError>,
) -> Result<Option<T>, EngineError> {
    db.query(sql, params)?.first().map(read).transpose()
}

pub fn query_total(db: &dyn Database, sql: &str, params: &[Value]) -> Result<i64, EngineError> {
    Ok(query_one(db, sql, params, |row| row.int("total"))?.unwrap_or(0))
}

pub fn field_stamps(
    db: &dyn Database,
    entity: Entity,
    id: &str,
) -> Result<Option<String>, EngineError> {
    let sql = format!(
        r#"
        SELECT field_updated_at
        FROM {}
        WHERE id = ?
        "#,
        entity.table()
    );
    query_one(db, &sql, &[Value::from(id)], |row| row.text("field_updated_at"))
}

pub fn soft_delete(
    db: &dyn Database,
    entity: Entity,
    id: &str,
    stamp: &Stamp,
) -> Result<bool, EngineError> {
    let sql = format!(
        r#"
        UPDATE {}
        SET deleted_at = ?, updated_at = ?, field_updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
        "#,
        entity.table()
    );
    let params = [
        Value::from(stamp.updated_at),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(id),
    ];
    Ok(db.execute(&sql, &params)? > 0)
}

pub fn next_position(db: &dyn Database, entity: Entity) -> Result<i64, EngineError> {
    let sql = format!("SELECT COALESCE(MAX(position), 0) + 1 AS total FROM {}", entity.table());
    query_total(db, &sql, &[])
}

pub fn row_json(db: &dyn Database, entity: Entity, id: &str) -> Result<Json, EngineError> {
    let sql = format!("SELECT * FROM {} WHERE id = ?", entity.table());
    let rows = db.query(&sql, &[Value::from(id)])?;
    let row = rows.first().ok_or_else(|| EngineError::not_found(entity.entity_type(), id))?;
    let fields: Map<String, Json> = row
        .columns()
        .iter()
        .zip(row.values())
        .map(|(name, value)| (name.clone(), json_value(value)))
        .collect();
    Ok(Json::Object(fields))
}

fn json_value(value: &Value) -> Json {
    match value {
        Value::Null => Json::Null,
        Value::Int(number) => json!(number),
        Value::Real(number) => json!(number),
        Value::Text(text) => json!(text),
    }
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    fn stamp(clock: i64) -> Stamp {
        Stamp { updated_at: clock, field_updated_at: r#"{"deleted_at":1}"#.to_string() }
    }

    #[test]
    fn next_position_follows_the_largest_one() {
        let db = migrated_memory_db();
        assert_eq!(next_position(&db, Entity::Category).unwrap(), 9);
        assert_eq!(next_position(&db, Entity::Wallet).unwrap(), 2);
    }

    #[test]
    fn row_json_uses_column_names_and_keeps_nulls() {
        let db = migrated_memory_db();
        let row = row_json(&db, Entity::Category, "category-home").unwrap();
        assert_eq!(row["name"], "Nhà ở");
        assert_eq!(row["is_fixed"], 1);
        assert!(row["budget_vnd"].is_null());
        assert!(row["deleted_at"].is_null());
    }

    #[test]
    fn row_json_of_a_missing_row_is_not_found() {
        let db = migrated_memory_db();
        assert!(row_json(&db, Entity::Wallet, "nope").is_err());
    }

    #[test]
    fn soft_delete_hides_a_row_once_and_keeps_it_in_the_table() {
        let db = migrated_memory_db();
        assert!(soft_delete(&db, Entity::Wallet, "wallet-cash", &stamp(77)).unwrap());
        assert!(!soft_delete(&db, Entity::Wallet, "wallet-cash", &stamp(78)).unwrap());
        let row = row_json(&db, Entity::Wallet, "wallet-cash").unwrap();
        assert_eq!(row["deleted_at"], 77);
        assert_eq!(row["updated_at"], 77);
    }

    #[test]
    fn field_stamps_reads_the_stored_json() {
        let db = migrated_memory_db();
        let stamps = field_stamps(&db, Entity::Category, "category-food").unwrap();
        assert_eq!(stamps.as_deref(), Some("{}"));
        assert_eq!(field_stamps(&db, Entity::Category, "nope").unwrap(), None);
    }
}
