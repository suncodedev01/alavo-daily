use alavo_domain::ports::{Database, Row as DbRow, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::sync::json_values::Row;
use serde_json::{json, Value as Json};

pub struct ColumnInfo {
    pub name: String,
    pub not_null: bool,
    pub sql_type: String,
    pub default: Option<Json>,
}

/// The columns of a synced table. `table` must come from `merge_policy::TABLE_POLICIES`, never
/// from user input, because table names cannot be bound as parameters.
pub fn table_columns(db: &dyn Database, table: &str) -> Result<Vec<ColumnInfo>, EngineError> {
    let sql = r#"
        SELECT name, type, "notnull" AS not_null, dflt_value
        FROM pragma_table_info(?)
        ORDER BY cid
    "#;
    db.query(sql, &[Value::from(table)])?.iter().map(column_from_row).collect()
}

pub fn find_row(db: &dyn Database, table: &str, id: &str) -> Result<Option<Row>, EngineError> {
    let rows = db.query(&format!("SELECT * FROM {table} WHERE id = ?"), &[Value::from(id)])?;
    Ok(rows.first().map(row_to_map))
}

/// Writes every column of `row`, replacing the stored row with the same id.
pub fn save_row(
    db: &dyn Database,
    table: &str,
    columns: &[ColumnInfo],
    row: &Row,
) -> Result<(), EngineError> {
    let names: Vec<&str> = columns.iter().map(|column| column.name.as_str()).collect();
    let values: Vec<Value> = names.iter().map(|name| to_db_value(row.get(*name))).collect();
    db.execute(&upsert_sql(table, &names), &values).map(|_| ())
}

/// A row with no content yet, for an event that arrives before the row it changes. Columns
/// without a default hold an empty value so NOT NULL constraints pass.
pub fn blank_row(columns: &[ColumnInfo], id: &str) -> Row {
    let mut row = Row::new();
    for column in columns {
        row.insert(column.name.clone(), blank_value(column));
    }
    row.insert("id".to_string(), Json::from(id));
    row
}

fn upsert_sql(table: &str, names: &[&str]) -> String {
    let marks = vec!["?"; names.len()].join(", ");
    let updates: Vec<String> = names
        .iter()
        .filter(|name| **name != "id")
        .map(|name| format!("{name} = excluded.{name}"))
        .collect();
    format!(
        "INSERT INTO {table} ({}) VALUES ({marks}) ON CONFLICT (id) DO UPDATE SET {}",
        names.join(", "),
        updates.join(", ")
    )
}

fn blank_value(column: &ColumnInfo) -> Json {
    if let Some(default) = &column.default {
        return default.clone();
    }
    if !column.not_null {
        return Json::Null;
    }
    match column.sql_type.to_uppercase().as_str() {
        "INTEGER" => json!(0),
        "REAL" => json!(0.0),
        _ => json!(""),
    }
}

fn column_from_row(row: &DbRow) -> Result<ColumnInfo, EngineError> {
    Ok(ColumnInfo {
        name: row.text("name")?,
        not_null: row.bool("not_null")?,
        sql_type: row.text("type")?,
        default: row.opt_text("dflt_value")?.map(|literal| parse_default(&literal)),
    })
}

/// SQLite reports a default as SQL text: `'medium'`, `'[]'`, `0`.
fn parse_default(literal: &str) -> Json {
    if let Some(inner) = literal.strip_prefix('\'').and_then(|rest| rest.strip_suffix('\'')) {
        return Json::from(inner.replace("''", "'"));
    }
    serde_json::from_str(literal).unwrap_or_else(|_| Json::from(literal))
}

fn row_to_map(row: &DbRow) -> Row {
    let fields = row.columns().iter().zip(row.values()).map(|(name, value)| {
        let json = match value {
            Value::Null => Json::Null,
            Value::Int(number) => json!(number),
            Value::Real(number) => json!(number),
            Value::Text(text) => json!(text),
        };
        (name.clone(), json)
    });
    fields.collect()
}

fn to_db_value(value: Option<&Json>) -> Value {
    match value {
        None | Some(Json::Null) => Value::Null,
        Some(Json::Bool(flag)) => Value::from(*flag),
        Some(Json::Number(number)) => number
            .as_i64()
            .map_or_else(|| Value::Real(number.as_f64().unwrap_or_default()), Value::Int),
        Some(Json::String(text)) => Value::Text(text.clone()),
        Some(other) => Value::Text(other.to_string()),
    }
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    #[test]
    fn table_columns_report_not_null_and_defaults() {
        let db = migrated_memory_db();
        let columns = table_columns(&db, "recipes_recipes").unwrap();
        let level = columns.iter().find(|column| column.name == "level").unwrap();
        assert_eq!(level.default, Some(json!("medium")));
        let name = columns.iter().find(|column| column.name == "name").unwrap();
        assert!(name.not_null && name.default.is_none());
    }

    #[test]
    fn a_blank_row_satisfies_the_not_null_columns() {
        let db = migrated_memory_db();
        let columns = table_columns(&db, "recipes_recipes").unwrap();
        save_row(&db, "recipes_recipes", &columns, &blank_row(&columns, "r1")).unwrap();
        let stored = find_row(&db, "recipes_recipes", "r1").unwrap().unwrap();
        assert_eq!(stored["tags"], json!("[]"));
        assert_eq!(stored["servings"], json!(0));
        assert!(stored["deleted_at"].is_null());
    }

    #[test]
    fn saving_twice_replaces_the_row() {
        let db = migrated_memory_db();
        let columns = table_columns(&db, "spending_wallets").unwrap();
        let mut row = find_row(&db, "spending_wallets", "wallet-cash").unwrap().unwrap();
        row.insert("name".into(), json!("Ví"));
        save_row(&db, "spending_wallets", &columns, &row).unwrap();
        save_row(&db, "spending_wallets", &columns, &row).unwrap();
        let stored = find_row(&db, "spending_wallets", "wallet-cash").unwrap().unwrap();
        assert_eq!(stored["name"], json!("Ví"));
    }

    #[test]
    fn a_missing_row_is_none() {
        let db = migrated_memory_db();
        assert!(find_row(&db, "spending_wallets", "nope").unwrap().is_none());
    }
}
