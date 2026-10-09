use alavo_domain::hub::SyncStatus;
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::hub::count_pending_events;

use crate::context::Ctx;

/// Sync state as the engine knows it. The Google Drive transport is not connected yet, so the
/// state is always `off`; `pending_events` is how many local changes wait to be uploaded.
pub fn status(ctx: &Ctx) -> Result<SyncStatus, EngineError> {
    Ok(SyncStatus {
        state: "off".to_string(),
        pending_events: count_pending_events(ctx.db)?,
        last_synced_at: None,
        device_id: ctx.device_id.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::hlc::HlcClock;
    use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};

    use super::*;

    #[test]
    fn a_fresh_install_has_nothing_pending() {
        let db = migrated_memory_db();
        let env = TestEnv::new();
        let clock = HlcClock::default();
        let ctx = Ctx::new(&db, &env, &clock, "device-a");
        let status = status(&ctx).unwrap();
        assert_eq!(status.pending_events, 0);
        assert_eq!(status.device_id, "device-a");
    }
}
