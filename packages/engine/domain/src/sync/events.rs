use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::shared::hlc::Hlc;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EventAction {
    Insert,
    Update,
    Delete,
}

impl EventAction {
    pub fn as_str(self) -> &'static str {
        match self {
            EventAction::Insert => "insert",
            EventAction::Update => "update",
            EventAction::Delete => "delete",
        }
    }
}

/// Returns the new `field_updated_at` JSON: every changed column is stamped with `hlc`, columns
/// that were not touched keep their previous stamp.
pub fn stamp_fields(existing: Option<&str>, changed: &[&str], hlc: Hlc) -> String {
    let mut stamps: Map<String, Value> = existing
        .and_then(|json| serde_json::from_str(json).ok())
        .unwrap_or_default();
    for column in changed {
        stamps.insert((*column).to_string(), Value::from(hlc.value()));
    }
    Value::Object(stamps).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stamp_keeps_untouched_columns() {
        let first = stamp_fields(None, &["name", "notes"], Hlc(10));
        let second = stamp_fields(Some(&first), &["notes"], Hlc(20));
        let parsed: Map<String, Value> = serde_json::from_str(&second).unwrap();
        assert_eq!(parsed["name"], Value::from(10));
        assert_eq!(parsed["notes"], Value::from(20));
    }
}
