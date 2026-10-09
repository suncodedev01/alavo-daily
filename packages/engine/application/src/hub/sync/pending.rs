use alavo_domain::shared::error::EngineError;
use alavo_domain::sync::remote_event::SyncEvent;
use alavo_infrastructure::persistence::repositories::sync::events::{mark_synced, own_events};
use alavo_infrastructure::persistence::repositories::sync::peers::{list_peers, Peer};

use crate::context::Ctx;

/// Changes made on this device that have not been uploaded yet, oldest first.
pub fn pending_events(ctx: &Ctx, limit: Option<i64>) -> Result<Vec<SyncEvent>, EngineError> {
    own_events(ctx.db, true, limit)
}

/// Every change this device ever made, oldest first. The device's file on Drive holds all of it.
pub fn all_own_events(ctx: &Ctx) -> Result<Vec<SyncEvent>, EngineError> {
    own_events(ctx.db, false, None)
}

pub fn mark_uploaded(ctx: &Ctx, event_ids: &[String]) -> Result<u64, EngineError> {
    mark_synced(ctx.db, event_ids)
}

pub fn peers(ctx: &Ctx) -> Result<Vec<Peer>, EngineError> {
    list_peers(ctx.db)
}
