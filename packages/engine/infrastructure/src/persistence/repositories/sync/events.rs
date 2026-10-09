use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::sync::events::EventAction;
use alavo_domain::sync::remote_event::SyncEvent;

/// This device's events, oldest clock first. `only_pending` leaves out the ones already
/// uploaded; `limit` caps how many come back.
pub fn own_events(
    db: &dyn Database,
    only_pending: bool,
    limit: Option<i64>,
) -> Result<Vec<SyncEvent>, EngineError> {
    let sql = format!(
        r#"
        SELECT event_id, module, entity_type, entity_id, action, changed_fields,
               payload_json, device_id, hlc
        FROM hub_delta_events
        {}
        ORDER BY hlc, event_id
        LIMIT ?
        "#,
        if only_pending { "WHERE is_synced = 0" } else { "" }
    );
    let rows = db.query(&sql, &[Value::from(limit.unwrap_or(-1))])?;
    rows.iter().map(event_from_row).collect()
}

pub fn mark_synced(db: &dyn Database, event_ids: &[String]) -> Result<u64, EngineError> {
    let mut changed = 0;
    for id in event_ids {
        let sql = "UPDATE hub_delta_events SET is_synced = 1 WHERE event_id = ? AND is_synced = 0";
        changed += db.execute(sql, &[Value::from(id.as_str())])?;
    }
    Ok(changed)
}

/// Makes every change of this device count as not uploaded, so the next sync sends all of it.
pub fn mark_all_unsynced(db: &dyn Database) -> Result<(), EngineError> {
    db.execute("UPDATE hub_delta_events SET is_synced = 0", &[]).map(|_| ())
}

/// True when this device wrote a change to the entity that has not been uploaded yet.
pub fn has_pending_change(
    db: &dyn Database,
    entity: (&str, &str, &str),
) -> Result<bool, EngineError> {
    let (module, entity_type, entity_id) = entity;
    let sql = r#"
        SELECT 1 AS found
        FROM hub_delta_events
        WHERE is_synced = 0 AND module = ? AND entity_type = ? AND entity_id = ?
        LIMIT 1
    "#;
    let params = [Value::from(module), Value::from(entity_type), Value::from(entity_id)];
    Ok(!db.query(sql, &params)?.is_empty())
}

fn event_from_row(row: &Row) -> Result<SyncEvent, EngineError> {
    let changed_fields: Vec<String> = match row.opt_text("changed_fields")? {
        Some(json) => serde_json::from_str(&json)?,
        None => Vec::new(),
    };
    Ok(SyncEvent {
        event_id: row.text("event_id")?,
        module: row.text("module")?,
        entity_type: row.text("entity_type")?,
        entity_id: row.text("entity_id")?,
        action: parse_action(&row.text("action")?)?,
        changed_fields,
        payload: serde_json::from_str(&row.text("payload_json")?)?,
        device_id: row.text("device_id")?,
        hlc: row.int("hlc")?,
    })
}

fn parse_action(action: &str) -> Result<EventAction, EngineError> {
    serde_json::from_value(serde_json::Value::from(action))
        .map_err(|_| EngineError::db(format!("unknown event action {action}")))
}
