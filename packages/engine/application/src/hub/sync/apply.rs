use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::hlc::Hlc;
use alavo_domain::sync::json_values::integer;
use alavo_domain::sync::remote_event::SyncEvent;
use alavo_infrastructure::persistence::repositories::sync::peers::{find_peer, save_peer, Peer};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::row_apply::{Mode, Outcome, RowApplier};
use crate::context::Ctx;

/// Events read from another device's file. `marker` identifies that file version and is only
/// sent with the last batch of a file, so an interrupted read is repeated rather than skipped.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteBatch {
    pub device_id: String,
    #[serde(default)]
    pub events: Vec<Value>,
    #[serde(default)]
    pub marker: Option<String>,
}

#[derive(Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ApplyReport {
    pub applied: u32,
    pub unchanged: u32,
    pub conflicts: u32,
    /// Events that were malformed, from a newer app version, or already applied earlier.
    pub ignored: u32,
    pub high_water: i64,
}

/// Applies another device's events in one transaction. Applying the same events again, or in
/// another order, leaves the data as it was. No change log entry is written for them.
pub fn apply_remote(ctx: &Ctx, batch: RemoteBatch) -> Result<ApplyReport, EngineError> {
    if batch.device_id.is_empty() || batch.device_id == ctx.device_id {
        return Err(EngineError::validation("events must come from another device"));
    }
    ctx.transaction(|| apply_in_transaction(ctx, batch))
}

fn apply_in_transaction(ctx: &Ctx, batch: RemoteBatch) -> Result<ApplyReport, EngineError> {
    let mark = find_peer(ctx.db, &batch.device_id)?.map_or(0, |peer| peer.high_water_hlc);
    let mut report = ApplyReport::default();
    let events = fresh_events(&batch, mark, &mut report);
    let mut applier = RowApplier::new(ctx, Mode::Remote);
    for event in &events {
        tally(&mut report, applier.apply(event)?);
    }
    observe_clocks(ctx, &events);
    report.high_water = events.last().map_or(mark, |event| event.hlc.max(mark));
    save_progress(ctx, &batch, report.high_water)?;
    Ok(report)
}

/// The well-formed events newer than the high-water mark, oldest clock first.
fn fresh_events(batch: &RemoteBatch, mark: i64, report: &mut ApplyReport) -> Vec<SyncEvent> {
    let mut events = Vec::new();
    for value in &batch.events {
        match SyncEvent::parse(value.clone()) {
            Some(event) if event.device_id == batch.device_id && event.hlc > mark => {
                events.push(event)
            }
            _ => report.ignored += 1,
        }
    }
    events.sort_by(|a, b| (a.hlc, &a.event_id).cmp(&(b.hlc, &b.event_id)));
    events
}

fn tally(report: &mut ApplyReport, outcome: Outcome) {
    match outcome {
        Outcome::Applied => report.applied += 1,
        Outcome::Unchanged => report.unchanged += 1,
        Outcome::Conflict => report.conflicts += 1,
        Outcome::Ignored => report.ignored += 1,
    }
}

/// Moves this device's clock past everything received, so a later local edit is never ranked
/// older than a change it has already seen.
fn observe_clocks(ctx: &Ctx, events: &[SyncEvent]) {
    for event in events {
        let stamped = integer(event.payload.get("updated_at")).unwrap_or(0);
        ctx.clock.observe(Hlc(event.hlc.max(stamped)));
    }
}

fn save_progress(ctx: &Ctx, batch: &RemoteBatch, high_water: i64) -> Result<(), EngineError> {
    save_peer(
        ctx.db,
        &Peer {
            device_id: batch.device_id.clone(),
            high_water_hlc: high_water,
            marker: batch.marker.clone(),
            applied_at: ctx.now_ms(),
        },
    )
}
