use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use serde::Serialize;

/// What this device knows about another device's event file.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Peer {
    pub device_id: String,
    /// Every event of the peer with a clock up to this value has been applied.
    pub high_water_hlc: i64,
    /// An identifier of the file version last read in full, so an unchanged file is skipped.
    pub marker: Option<String>,
    pub applied_at: i64,
}

pub fn find_peer(db: &dyn Database, device_id: &str) -> Result<Option<Peer>, EngineError> {
    let sql = r#"
        SELECT device_id, high_water_hlc, remote_marker, applied_at
        FROM hub_sync_peers
        WHERE device_id = ?
    "#;
    db.query(sql, &[Value::from(device_id)])?.first().map(peer_from_row).transpose()
}

pub fn list_peers(db: &dyn Database) -> Result<Vec<Peer>, EngineError> {
    let sql = r#"
        SELECT device_id, high_water_hlc, remote_marker, applied_at
        FROM hub_sync_peers
        ORDER BY device_id
    "#;
    db.query(sql, &[])?.iter().map(peer_from_row).collect()
}

/// Records progress. A `marker` of `None` keeps the one already stored.
pub fn save_peer(db: &dyn Database, peer: &Peer) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO hub_sync_peers (device_id, high_water_hlc, remote_marker, applied_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (device_id) DO UPDATE SET
            high_water_hlc = excluded.high_water_hlc,
            remote_marker = COALESCE(excluded.remote_marker, hub_sync_peers.remote_marker),
            applied_at = excluded.applied_at
    "#;
    let params = [
        Value::from(peer.device_id.as_str()),
        Value::from(peer.high_water_hlc),
        Value::from(peer.marker.clone()),
        Value::from(peer.applied_at),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn clear_peers(db: &dyn Database) -> Result<(), EngineError> {
    db.execute("DELETE FROM hub_sync_peers", &[]).map(|_| ())
}

fn peer_from_row(row: &Row) -> Result<Peer, EngineError> {
    Ok(Peer {
        device_id: row.text("device_id")?,
        high_water_hlc: row.int("high_water_hlc")?,
        marker: row.opt_text("remote_marker")?,
        applied_at: row.int("applied_at")?,
    })
}
