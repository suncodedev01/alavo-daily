use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Two devices changed the same row of a whole-row table. Both versions are kept until the
/// person chooses.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConflict {
    pub id: String,
    pub module: String,
    pub entity_type: String,
    pub entity_id: String,
    pub local: Value,
    pub remote: Value,
    pub remote_hlc: i64,
    pub remote_device_id: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Keep {
    Local,
    Remote,
}
