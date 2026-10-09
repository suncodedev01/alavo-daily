use alavo_domain::hub::{Notification, NotificationRule};
use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::budget_category_id;

pub struct DeviceRow {
    pub device_id: String,
    pub last_hlc: i64,
}

pub struct EventRow {
    pub event_id: String,
    pub module: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: String,
    pub changed_fields: Option<String>,
    pub payload_json: String,
    pub device_id: String,
    pub hlc: i64,
}

pub fn find_device(db: &dyn Database) -> Result<Option<DeviceRow>, EngineError> {
    let rows = db.query("SELECT device_id, last_hlc FROM hub_device WHERE id = 'device'", &[])?;
    rows.first()
        .map(|row| Ok(DeviceRow { device_id: row.text("device_id")?, last_hlc: row.int("last_hlc")? }))
        .transpose()
}

pub fn insert_device(db: &dyn Database, device_id: &str, now_ms: i64) -> Result<(), EngineError> {
    db.execute(
        "INSERT INTO hub_device (id, device_id, created_at, last_hlc) VALUES ('device', ?, ?, 0)",
        &[Value::from(device_id), Value::from(now_ms)],
    )
    .map(|_| ())
}

pub fn save_last_hlc(db: &dyn Database, hlc: i64) -> Result<(), EngineError> {
    db.execute("UPDATE hub_device SET last_hlc = ? WHERE id = 'device'", &[Value::from(hlc)])
        .map(|_| ())
}

pub fn get_setting(db: &dyn Database, key: &str) -> Result<Option<String>, EngineError> {
    let rows = db.query("SELECT value_json FROM hub_settings WHERE id = ?", &[Value::from(key)])?;
    rows.first().map(|row| row.text("value_json")).transpose()
}

pub fn set_setting(
    db: &dyn Database,
    key: &str,
    value_json: &str,
    now_ms: i64,
) -> Result<(), EngineError> {
    db.execute(
        r#"
        INSERT INTO hub_settings (id, value_json, updated_at) VALUES (?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET value_json = excluded.value_json,
                                       updated_at = excluded.updated_at
        "#,
        &[Value::from(key), Value::from(value_json), Value::from(now_ms)],
    )
    .map(|_| ())
}

pub fn list_notifications(db: &dyn Database, limit: i64) -> Result<Vec<Notification>, EngineError> {
    let sql = r#"
        SELECT id, module, title, body, dedupe_key, created_at, read_at
        FROM hub_notifications
        ORDER BY created_at DESC
        LIMIT ?
    "#;
    db.query(sql, &[Value::from(limit)])?.iter().map(notification_from_row).collect()
}

/// Returns false when a notification with the same `dedupe_key` already exists.
pub fn insert_notification(
    db: &dyn Database,
    notification: &Notification,
    dedupe_key: Option<&str>,
) -> Result<bool, EngineError> {
    let sql = r#"
        INSERT OR IGNORE INTO hub_notifications
            (id, module, title, body, dedupe_key, created_at, read_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
    "#;
    let changed = db.execute(
        sql,
        &[
            Value::from(notification.id.as_str()),
            Value::from(notification.module.as_str()),
            Value::from(notification.title.as_str()),
            Value::from(notification.body.as_str()),
            Value::from(dedupe_key),
            Value::from(notification.created_at),
        ],
    )?;
    Ok(changed > 0)
}

pub fn mark_notifications_read(
    db: &dyn Database,
    ids: Option<&[String]>,
    now_ms: i64,
) -> Result<u64, EngineError> {
    match ids {
        None => db.execute(
            "UPDATE hub_notifications SET read_at = ? WHERE read_at IS NULL",
            &[Value::from(now_ms)],
        ),
        Some(ids) => {
            let mut changed = 0;
            for id in ids {
                changed += db.execute(
                    "UPDATE hub_notifications SET read_at = ? WHERE id = ? AND read_at IS NULL",
                    &[Value::from(now_ms), Value::from(id.as_str())],
                )?;
            }
            Ok(changed)
        }
    }
}

pub fn list_rules(db: &dyn Database) -> Result<Vec<NotificationRule>, EngineError> {
    let sql = r#"
        SELECT id, module, label, description, kind, time, enabled
        FROM hub_notification_rules
        ORDER BY module, position
    "#;
    db.query(sql, &[])?.iter().map(rule_from_row).collect()
}

pub fn find_rule(db: &dyn Database, id: &str) -> Result<Option<NotificationRule>, EngineError> {
    let sql = r#"
        SELECT id, module, label, description, kind, time, enabled
        FROM hub_notification_rules
        WHERE id = ?
    "#;
    db.query(sql, &[Value::from(id)])?.first().map(rule_from_row).transpose()
}

pub fn update_rule(
    db: &dyn Database,
    id: &str,
    enabled: bool,
    time: Option<&str>,
) -> Result<(), EngineError> {
    db.execute(
        "UPDATE hub_notification_rules SET enabled = ?, time = ? WHERE id = ?",
        &[Value::from(enabled), Value::from(time), Value::from(id)],
    )
    .map(|_| ())
}

pub fn insert_event(db: &dyn Database, event: &EventRow) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO hub_delta_events
            (event_id, module, entity_type, entity_id, action, changed_fields,
             payload_json, device_id, hlc, is_synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    "#;
    db.execute(
        sql,
        &[
            Value::from(event.event_id.as_str()),
            Value::from(event.module.as_str()),
            Value::from(event.entity_type.as_str()),
            Value::from(event.entity_id.as_str()),
            Value::from(event.action.as_str()),
            Value::from(event.changed_fields.clone()),
            Value::from(event.payload_json.as_str()),
            Value::from(event.device_id.as_str()),
            Value::from(event.hlc),
        ],
    )
    .map(|_| ())
}

pub fn count_pending_events(db: &dyn Database) -> Result<i64, EngineError> {
    let rows = db.query("SELECT COUNT(*) AS total FROM hub_delta_events WHERE is_synced = 0", &[])?;
    rows.first().map(|row| row.int("total")).transpose().map(|total| total.unwrap_or(0))
}

/// Names of every table the export covers, in a stable order.
pub fn exportable_tables(db: &dyn Database) -> Result<Vec<String>, EngineError> {
    let sql = r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND (name LIKE 'spending\_%' ESCAPE '\' OR name LIKE 'recipes\_%' ESCAPE '\')
        ORDER BY name
    "#;
    db.query(sql, &[])?.iter().map(|row| row.text("name")).collect()
}

pub fn dump_table(db: &dyn Database, table: &str) -> Result<Vec<Row>, EngineError> {
    // `table` comes from sqlite_master through `exportable_tables`, never from user input.
    db.query(&format!("SELECT * FROM {table}"), &[])
}

fn notification_from_row(row: &Row) -> Result<Notification, EngineError> {
    Ok(Notification {
        id: row.text("id")?,
        module: row.text("module")?,
        title: row.text("title")?,
        body: row.text("body")?,
        subject_id: subject_of(row.opt_text("dedupe_key")?),
        created_at: row.int("created_at")?,
        read: row.opt_int("read_at")?.is_some(),
    })
}

fn subject_of(dedupe_key: Option<String>) -> Option<String> {
    let key = dedupe_key?;
    budget_category_id(&key).map(String::from)
}

fn rule_from_row(row: &Row) -> Result<NotificationRule, EngineError> {
    Ok(NotificationRule {
        id: row.text("id")?,
        module: row.text("module")?,
        label: row.text("label")?,
        description: row.text("description")?,
        kind: row.text("kind")?,
        time: row.opt_text("time")?,
        enabled: row.bool("enabled")?,
    })
}
