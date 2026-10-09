use serde::{Deserialize, Serialize};

pub const SYNC_STATES: [&str; 6] = ["off", "idle", "syncing", "needs_login", "offline", "error"];

pub fn is_sync_state(state: &str) -> bool {
    SYNC_STATES.contains(&state)
}

/// What the client last said about sync. Kept in settings so every screen reads the same thing.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SyncStateRecord {
    pub state: String,
    pub last_synced_at: Option<i64>,
    pub account_email: Option<String>,
    pub error: Option<String>,
}

impl Default for SyncStateRecord {
    fn default() -> Self {
        Self { state: "off".into(), last_synced_at: None, account_email: None, error: None }
    }
}

/// The client's report of a state change. `synced` marks a finished round of sync.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ReportSyncState {
    pub state: String,
    pub account_email: Option<String>,
    pub error: Option<String>,
    pub synced: bool,
}

impl Default for ReportSyncState {
    fn default() -> Self {
        Self { state: "off".into(), account_email: None, error: None, synced: false }
    }
}

impl SyncStateRecord {
    /// Turning sync off forgets the account, the last error and the last sync, because the next
    /// connection starts from scratch.
    pub fn apply(self, report: ReportSyncState, now_ms: i64) -> SyncStateRecord {
        if report.state == "off" {
            return SyncStateRecord::default();
        }
        SyncStateRecord {
            last_synced_at: if report.synced { Some(now_ms) } else { self.last_synced_at },
            account_email: report.account_email.or(self.account_email),
            error: report.error,
            state: report.state,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn report(state: &str) -> ReportSyncState {
        ReportSyncState { state: state.into(), ..Default::default() }
    }

    #[test]
    fn only_the_six_states_are_valid() {
        assert!(is_sync_state("needs_login"));
        assert!(!is_sync_state("connected"));
    }

    #[test]
    fn a_finished_round_stamps_the_time_and_keeps_the_account() {
        let signed_in = ReportSyncState { account_email: Some("a@b.c".into()), ..report("idle") };
        let first = SyncStateRecord::default().apply(signed_in, 5);
        let synced = first.apply(ReportSyncState { synced: true, ..report("idle") }, 9);
        assert_eq!(synced.last_synced_at, Some(9));
        assert_eq!(synced.account_email.as_deref(), Some("a@b.c"));
    }

    #[test]
    fn an_error_is_cleared_by_the_next_report_without_one() {
        let failed = SyncStateRecord::default()
            .apply(ReportSyncState { error: Some("boom".into()), ..report("error") }, 1);
        assert_eq!(failed.error.as_deref(), Some("boom"));
        assert_eq!(failed.apply(report("idle"), 2).error, None);
    }

    #[test]
    fn turning_sync_off_forgets_everything() {
        let signed_in =
            ReportSyncState { account_email: Some("a@b.c".into()), synced: true, ..report("idle") };
        let on = SyncStateRecord::default().apply(signed_in, 5);
        assert_eq!(on.apply(report("off"), 6), SyncStateRecord::default());
    }
}
