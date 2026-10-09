use alavo_application::hub::sync::apply::{apply_remote, RemoteBatch};
use alavo_application::hub::sync::{conflicts, import, pending};
use alavo_application::hub::sync_status;
use alavo_application::Ctx;
use alavo_domain::sync::conflict::Keep;
use alavo_domain::sync::state::ReportSyncState;
use serde::Deserialize;
use serde_json::json;

use crate::util::{respond, with_input, Handled};

#[derive(Deserialize, Default)]
#[serde(default)]
struct PendingInput {
    limit: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarkSynced {
    event_ids: Vec<String>,
}

#[derive(Deserialize)]
struct ResolveConflict {
    id: String,
    keep: Keep,
}

#[derive(Deserialize)]
struct ImportInput {
    json: String,
}

/// Commands named `sync.*`, and the data import that merges through the same path.
pub fn handle(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "sync.status" => respond(sync_status::status(ctx)),
        "sync.report_state" => {
            with_input(payload, |input: ReportSyncState| sync_status::report_state(ctx, input))
        }
        "sync.pending_events" => {
            with_input(payload, |input: PendingInput| pending::pending_events(ctx, input.limit))
        }
        "sync.list_own_events" => respond(pending::all_own_events(ctx)),
        "sync.mark_synced" => with_input(payload, |input: MarkSynced| {
            pending::mark_uploaded(ctx, &input.event_ids).map(|count| json!({ "count": count }))
        }),
        "sync.apply_remote" => with_input(payload, |batch: RemoteBatch| apply_remote(ctx, batch)),
        "sync.list_peers" => respond(pending::peers(ctx)),
        _ => return handle_conflicts_and_import(ctx, command, payload),
    })
}

fn handle_conflicts_and_import(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "sync.list_conflicts" => respond(conflicts::list(ctx)),
        "sync.resolve_conflict" => with_input(payload, |input: ResolveConflict| {
            conflicts::resolve(ctx, &input.id, input.keep).map(|_| json!({}))
        }),
        "hub.import_data" => {
            with_input(payload, |input: ImportInput| import::import_data(ctx, &input.json))
        }
        "hub.inspect_import" => {
            with_input(payload, |input: ImportInput| import::inspect(&input.json))
        }
        _ => return None,
    })
}
