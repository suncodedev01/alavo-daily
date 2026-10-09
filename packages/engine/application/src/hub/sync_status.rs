use alavo_domain::hub::SyncStatus;
use alavo_domain::shared::error::EngineError;
use alavo_domain::sync::state::{is_sync_state, ReportSyncState, SyncStateRecord};
use alavo_infrastructure::persistence::repositories::hub::{
    count_pending_events, get_setting, set_setting,
};
use alavo_infrastructure::persistence::repositories::sync::conflicts::count_conflicts;
use alavo_infrastructure::persistence::repositories::sync::events::mark_all_unsynced;
use alavo_infrastructure::persistence::repositories::sync::peers::clear_peers;

use crate::context::Ctx;

const STATE_KEY: &str = "sync_state";
const LAST_ACCOUNT_KEY: &str = "sync_last_account";

/// Sync state as the client last reported it, with the counts the engine knows itself: changes
/// waiting to be uploaded and conflicts waiting for a choice.
pub fn status(ctx: &Ctx) -> Result<SyncStatus, EngineError> {
    let record = load_record(ctx)?;
    Ok(SyncStatus {
        state: record.state,
        pending_events: count_pending_events(ctx.db)?,
        last_synced_at: record.last_synced_at,
        device_id: ctx.device_id.to_string(),
        account_email: record.account_email,
        error: record.error,
        conflict_count: count_conflicts(ctx.db)?,
    })
}

/// The client tells the engine where sync stands so every screen shows the same thing.
pub fn report_state(ctx: &Ctx, report: ReportSyncState) -> Result<SyncStatus, EngineError> {
    if !is_sync_state(&report.state) {
        return Err(EngineError::validation(format!("unknown sync state {}", report.state)));
    }
    ctx.transaction(|| {
        if let Some(email) = report.account_email.as_deref() {
            start_over_when_account_changed(ctx, email)?;
        }
        let next = load_record(ctx)?.apply(report, ctx.now_ms());
        set_setting(ctx.db, STATE_KEY, &serde_json::to_string(&next)?, ctx.now_ms())
    })?;
    status(ctx)
}

/// A different Google account has none of this device's earlier changes, so everything is sent
/// again and what was read from the other account is forgotten.
fn start_over_when_account_changed(ctx: &Ctx, email: &str) -> Result<(), EngineError> {
    let previous = get_setting(ctx.db, LAST_ACCOUNT_KEY)?;
    if previous.as_deref().is_some_and(|known| known != email) {
        mark_all_unsynced(ctx.db)?;
        clear_peers(ctx.db)?;
    }
    set_setting(ctx.db, LAST_ACCOUNT_KEY, email, ctx.now_ms())
}

fn load_record(ctx: &Ctx) -> Result<SyncStateRecord, EngineError> {
    Ok(match get_setting(ctx.db, STATE_KEY)? {
        Some(json) => serde_json::from_str(&json).unwrap_or_default(),
        None => SyncStateRecord::default(),
    })
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::hlc::HlcClock;
    use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};

    use super::super::sync::pending::{mark_uploaded, pending_events};
    use super::*;

    fn with_ctx<T>(work: impl FnOnce(&Ctx) -> T) -> T {
        let db = migrated_memory_db();
        let env = TestEnv::new();
        let clock = HlcClock::default();
        work(&Ctx::new(&db, &env, &clock, "device-a"))
    }

    fn report(state: &str) -> ReportSyncState {
        ReportSyncState { state: state.into(), ..Default::default() }
    }

    #[test]
    fn a_fresh_install_has_sync_off_and_nothing_pending() {
        with_ctx(|ctx| {
            let status = status(ctx).unwrap();
            assert_eq!((status.state.as_str(), status.pending_events), ("off", 0));
            assert_eq!((status.device_id.as_str(), status.conflict_count), ("device-a", 0));
        });
    }

    #[test]
    fn a_reported_state_is_what_every_screen_reads_next() {
        with_ctx(|ctx| {
            let signed_in =
                ReportSyncState { account_email: Some("a@b.c".into()), ..report("idle") };
            report_state(ctx, signed_in).unwrap();
            report_state(ctx, ReportSyncState { synced: true, ..report("syncing") }).unwrap();
            let status = status(ctx).unwrap();
            assert_eq!(status.state, "syncing");
            assert_eq!(status.account_email.as_deref(), Some("a@b.c"));
            assert!(status.last_synced_at.is_some());
        });
    }

    #[test]
    fn an_unknown_state_is_rejected() {
        with_ctx(|ctx| assert!(report_state(ctx, report("connected")).is_err()));
    }

    #[test]
    fn signing_in_with_another_account_sends_everything_again() {
        with_ctx(|ctx| {
            let first = ReportSyncState { account_email: Some("a@b.c".into()), ..report("idle") };
            report_state(ctx, first).unwrap();
            crate::spending::demo::load(ctx).unwrap();
            let all = pending_events(ctx, None).unwrap();
            let ids: Vec<String> = all.iter().map(|event| event.event_id.clone()).collect();
            mark_uploaded(ctx, &ids).unwrap();
            let same = ReportSyncState { account_email: Some("a@b.c".into()), ..report("idle") };
            assert_eq!(report_state(ctx, same).unwrap().pending_events, 0);
            let other = ReportSyncState { account_email: Some("x@y.z".into()), ..report("idle") };
            assert_eq!(report_state(ctx, other).unwrap().pending_events as usize, ids.len());
        });
    }

    #[test]
    fn turning_sync_off_clears_the_account() {
        with_ctx(|ctx| {
            let signed_in =
                ReportSyncState { account_email: Some("a@b.c".into()), ..report("idle") };
            report_state(ctx, signed_in).unwrap();
            let status = report_state(ctx, report("off")).unwrap();
            assert_eq!((status.state.as_str(), status.account_email), ("off", None));
        });
    }
}
