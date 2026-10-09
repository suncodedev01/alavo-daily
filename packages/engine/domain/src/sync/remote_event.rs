use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::events::EventAction;

const MAX_SAFE_CLOCK: i64 = 1 << 53;

/// One change as it travels between devices: a row of `hub_delta_events` plus the device that
/// wrote it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncEvent {
    pub event_id: String,
    pub module: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: EventAction,
    #[serde(default)]
    pub changed_fields: Vec<String>,
    pub payload: Value,
    pub device_id: String,
    pub hlc: i64,
}

impl SyncEvent {
    /// Reads an event received from outside. Returns `None` for anything malformed, so one bad
    /// event never blocks the good ones around it.
    pub fn parse(value: Value) -> Option<SyncEvent> {
        let event: SyncEvent = serde_json::from_value(value).ok()?;
        event.is_well_formed().then_some(event)
    }

    fn is_well_formed(&self) -> bool {
        let ids = [&self.event_id, &self.module, &self.entity_type, &self.entity_id];
        (0..MAX_SAFE_CLOCK).contains(&self.hlc)
            && self.payload.is_object()
            && ids.iter().all(|id| !id.is_empty())
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn event(overrides: Value) -> Value {
        let mut base = json!({
            "eventId": "e1", "module": "spending", "entityType": "wallet", "entityId": "w1",
            "action": "update", "changedFields": ["name"], "payload": { "name": "A" },
            "deviceId": "d1", "hlc": 10,
        });
        base.as_object_mut().unwrap().extend(overrides.as_object().unwrap().clone());
        base
    }

    #[test]
    fn a_complete_event_is_accepted() {
        assert!(SyncEvent::parse(event(json!({}))).is_some());
    }

    #[test]
    fn malformed_events_are_rejected() {
        assert!(SyncEvent::parse(event(json!({ "action": "explode" }))).is_none());
        assert!(SyncEvent::parse(event(json!({ "payload": "text" }))).is_none());
        assert!(SyncEvent::parse(event(json!({ "hlc": -1 }))).is_none());
        assert!(SyncEvent::parse(event(json!({ "hlc": 9_007_199_254_740_993_i64 }))).is_none());
        assert!(SyncEvent::parse(event(json!({ "entityId": "" }))).is_none());
    }
}
