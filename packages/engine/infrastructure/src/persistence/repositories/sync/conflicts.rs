use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::sync::conflict::SyncConflict;

const COLUMNS: &str = r#"
    SELECT id, module, entity_type, entity_id, local_json, remote_json,
           remote_hlc, remote_device_id, created_at
    FROM hub_sync_conflicts
"#;

pub fn list_conflicts(db: &dyn Database) -> Result<Vec<SyncConflict>, EngineError> {
    let sql = format!("{COLUMNS} ORDER BY created_at, id");
    db.query(&sql, &[])?.iter().map(conflict_from_row).collect()
}

pub fn find_conflict(db: &dyn Database, id: &str) -> Result<Option<SyncConflict>, EngineError> {
    let sql = format!("{COLUMNS} WHERE id = ?");
    db.query(&sql, &[Value::from(id)])?.first().map(conflict_from_row).transpose()
}

pub fn find_conflict_for_row(
    db: &dyn Database,
    table: &str,
    entity_id: &str,
) -> Result<Option<SyncConflict>, EngineError> {
    let sql = format!("{COLUMNS} WHERE table_name = ? AND entity_id = ?");
    let params = [Value::from(table), Value::from(entity_id)];
    db.query(&sql, &params)?.first().map(conflict_from_row).transpose()
}

pub fn count_conflicts(db: &dyn Database) -> Result<i64, EngineError> {
    let rows = db.query("SELECT COUNT(*) AS total FROM hub_sync_conflicts", &[])?;
    rows.first().map(|row| row.int("total")).transpose().map(|total| total.unwrap_or(0))
}

/// Stores a conflict, or replaces the open one for the same row so each row has at most one.
pub fn save_conflict(
    db: &dyn Database,
    table: &str,
    conflict: &SyncConflict,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO hub_sync_conflicts
            (id, table_name, module, entity_type, entity_id, local_json, remote_json,
             remote_hlc, remote_device_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (table_name, entity_id) DO UPDATE SET
            local_json = excluded.local_json,
            remote_json = excluded.remote_json,
            remote_hlc = excluded.remote_hlc,
            remote_device_id = excluded.remote_device_id
    "#;
    let params = [
        Value::from(conflict.id.as_str()),
        Value::from(table),
        Value::from(conflict.module.as_str()),
        Value::from(conflict.entity_type.as_str()),
        Value::from(conflict.entity_id.as_str()),
        Value::from(conflict.local.to_string()),
        Value::from(conflict.remote.to_string()),
        Value::from(conflict.remote_hlc),
        Value::from(conflict.remote_device_id.as_str()),
        Value::from(conflict.created_at),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn delete_conflict(db: &dyn Database, id: &str) -> Result<(), EngineError> {
    db.execute("DELETE FROM hub_sync_conflicts WHERE id = ?", &[Value::from(id)]).map(|_| ())
}

fn conflict_from_row(row: &Row) -> Result<SyncConflict, EngineError> {
    Ok(SyncConflict {
        id: row.text("id")?,
        module: row.text("module")?,
        entity_type: row.text("entity_type")?,
        entity_id: row.text("entity_id")?,
        local: serde_json::from_str(&row.text("local_json")?)?,
        remote: serde_json::from_str(&row.text("remote_json")?)?,
        remote_hlc: row.int("remote_hlc")?,
        remote_device_id: row.text("remote_device_id")?,
        created_at: row.int("created_at")?,
    })
}
