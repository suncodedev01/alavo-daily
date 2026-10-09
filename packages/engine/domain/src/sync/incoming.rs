use serde_json::{Map, Value};

use super::events::EventAction;
use super::json_values::{integer, read_stamps};
use super::remote_event::SyncEvent;

/// Columns that describe the row's history rather than its content.
pub const META_COLUMNS: [&str; 4] = ["id", "updated_at", "field_updated_at", "deleted_at"];

#[derive(Debug, Clone, PartialEq)]
pub struct ColumnWrite {
    pub column: String,
    pub value: Value,
    pub stamp: i64,
}

/// What one event says about one row, independent of how the table merges it.
///
/// A column whose stamp is 0 was never stamped by the device that wrote it (for example a
/// creation time). It only fills a column that has no stamp yet.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct Incoming {
    /// Content columns the event sets, each with the clock of its last edit.
    pub writes: Vec<ColumnWrite>,
    /// The clock of a delete. When set, `writes` is empty.
    pub tombstone: Option<i64>,
    /// The clock of the whole version, used by tables that merge whole rows.
    pub version: i64,
}

impl Incoming {
    pub fn from_event(event: &SyncEvent) -> Incoming {
        let payload = event.payload.as_object().cloned().unwrap_or_default();
        let stamps = read_stamps(payload.get("field_updated_at"));
        let unstamped = if stamps.is_empty() { event.hlc } else { 0 };
        let tombstone = tombstone_of(event, &payload, &stamps);
        let writes = match tombstone {
            Some(_) => Vec::new(),
            None => column_writes(event, &payload, (&stamps, unstamped)),
        };
        let version = integer(payload.get("updated_at")).unwrap_or(event.hlc);
        Incoming { writes, tombstone, version }
    }
}

fn tombstone_of(
    event: &SyncEvent,
    payload: &Map<String, Value>,
    stamps: &Map<String, Value>,
) -> Option<i64> {
    let deleted_at = integer(payload.get("deleted_at"));
    if event.action != EventAction::Delete && deleted_at.is_none() {
        return None;
    }
    let fallback = integer(stamps.get("deleted_at")).or(integer(payload.get("updated_at")));
    Some(deleted_at.or(fallback).unwrap_or(event.hlc))
}

fn column_writes(
    event: &SyncEvent,
    payload: &Map<String, Value>,
    (stamps, unstamped): (&Map<String, Value>, i64),
) -> Vec<ColumnWrite> {
    payload
        .iter()
        .filter(|(name, _)| !META_COLUMNS.contains(&name.as_str()) && is_touched(event, name))
        .map(|(name, value)| ColumnWrite {
            column: name.clone(),
            value: stored_form(value),
            stamp: integer(stamps.get(name)).unwrap_or(unstamped),
        })
        .collect()
}

fn is_touched(event: &SyncEvent, column: &str) -> bool {
    event.action == EventAction::Insert
        || event.changed_fields.is_empty()
        || event.changed_fields.iter().any(|changed| changed == column)
}

/// Payloads may carry booleans and lists, which SQLite keeps as 0/1 and as JSON text.
fn stored_form(value: &Value) -> Value {
    match value {
        Value::Bool(flag) => Value::from(i64::from(*flag)),
        Value::Array(_) | Value::Object(_) => Value::String(value.to_string()),
        other => other.clone(),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn event(action: EventAction, changed: &[&str], payload: Value) -> SyncEvent {
        SyncEvent {
            event_id: "e".into(),
            module: "spending".into(),
            entity_type: "wallet".into(),
            entity_id: "w1".into(),
            action,
            changed_fields: changed.iter().map(|name| name.to_string()).collect(),
            payload,
            device_id: "d".into(),
            hlc: 100,
        }
    }

    #[test]
    fn an_update_writes_only_the_changed_columns_with_their_own_stamps() {
        let payload = json!({
            "id": "w1", "name": "A", "kind": "cash", "updated_at": 100,
            "field_updated_at": r#"{"name":100,"kind":40}"#, "deleted_at": null,
        });
        let incoming = Incoming::from_event(&event(EventAction::Update, &["name"], payload));
        assert_eq!(incoming.writes.len(), 1);
        assert_eq!((incoming.writes[0].column.as_str(), incoming.writes[0].stamp), ("name", 100));
        assert_eq!(incoming.tombstone, None);
    }

    #[test]
    fn a_column_missing_from_the_stamps_the_sender_keeps_is_unstamped() {
        let payload = json!({ "id": "w1", "name": "A", "created_at": 9, "field_updated_at": r#"{"name":100}"# });
        let incoming = Incoming::from_event(&event(EventAction::Insert, &[], payload));
        let stamp_of =
            |name: &str| incoming.writes.iter().find(|w| w.column == name).unwrap().stamp;
        assert_eq!((stamp_of("name"), stamp_of("created_at")), (100, 0));
    }

    #[test]
    fn an_insert_writes_every_content_column_and_falls_back_to_the_event_clock() {
        let payload = json!({ "id": "w1", "name": "A", "kind": "cash", "field_updated_at": "{}" });
        let incoming = Incoming::from_event(&event(EventAction::Insert, &[], payload));
        assert_eq!(incoming.writes.len(), 2);
        assert!(incoming.writes.iter().all(|write| write.stamp == 100));
    }

    #[test]
    fn a_delete_carries_only_a_tombstone() {
        let payload = json!({ "id": "w1", "name": "A", "deleted_at": 77, "updated_at": 77 });
        let incoming = Incoming::from_event(&event(EventAction::Delete, &["deleted_at"], payload));
        assert_eq!(incoming.tombstone, Some(77));
        assert!(incoming.writes.is_empty());
    }

    #[test]
    fn a_row_that_arrives_already_deleted_is_a_tombstone_too() {
        let payload = json!({ "id": "w1", "name": "A", "deleted_at": 55 });
        let incoming = Incoming::from_event(&event(EventAction::Insert, &[], payload));
        assert_eq!(incoming.tombstone, Some(55));
    }

    #[test]
    fn booleans_and_lists_take_the_form_sqlite_stores() {
        let payload = json!({ "id": "r1", "favorite": true, "tags": ["a", "b"] });
        let incoming = Incoming::from_event(&event(EventAction::Insert, &[], payload));
        let value_of =
            |name: &str| incoming.writes.iter().find(|w| w.column == name).unwrap().value.clone();
        assert_eq!(value_of("favorite"), json!(1));
        assert_eq!(value_of("tags"), json!(r#"["a","b"]"#));
    }
}
