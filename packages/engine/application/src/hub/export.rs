use alavo_domain::ports::{Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::hub::{dump_table, exportable_tables};
use serde_json::{json, Map, Value as Json};

use crate::context::Ctx;

const EXPORT_VERSION: i64 = 1;

/// Every row of every module table as one JSON document, for the "export my data" button.
pub fn export_data(ctx: &Ctx) -> Result<Json, EngineError> {
    let mut tables = Map::new();
    for table in exportable_tables(ctx.db)? {
        let rows = dump_table(ctx.db, &table)?;
        tables.insert(table, Json::Array(rows.iter().map(row_to_json).collect()));
    }
    Ok(json!({
        "version": EXPORT_VERSION,
        "exportedAt": ctx.now_ms(),
        "deviceId": ctx.device_id,
        "tables": tables,
    }))
}

fn row_to_json(row: &Row) -> Json {
    let fields = row.columns().iter().zip(row.values()).map(|(name, value)| {
        let json = match value {
            Value::Null => Json::Null,
            Value::Int(number) => json!(number),
            Value::Real(number) => json!(number),
            Value::Text(text) => json!(text),
        };
        (name.clone(), json)
    });
    Json::Object(fields.collect())
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::hlc::HlcClock;
    use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};

    use super::*;

    #[test]
    fn export_has_a_version_and_a_tables_object() {
        let db = migrated_memory_db();
        let env = TestEnv::new();
        let clock = HlcClock::default();
        let ctx = Ctx::new(&db, &env, &clock, "device-a");
        let exported = export_data(&ctx).unwrap();
        assert_eq!(exported["version"], 1);
        assert!(exported["tables"].is_object());
    }
}
