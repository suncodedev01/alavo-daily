use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::hlc::Hlc;
use alavo_domain::sync::entity_table::entity_for_table;
use alavo_domain::sync::events::EventAction;
use alavo_domain::sync::json_values::integer;
use alavo_domain::sync::merge_policy::policy_for;
use alavo_domain::sync::remote_event::SyncEvent;
use serde::Serialize;
use serde_json::{Map, Value};

use super::row_apply::{Mode, Outcome, RowApplier};
use crate::context::Ctx;

pub const EXPORT_FORMAT: &str = "alavo-daily-export";
pub const EXPORT_VERSION: i64 = 1;
const MAX_SAFE_CLOCK: i64 = 1 << 53;

#[derive(Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    pub rows: u32,
    pub tables: u32,
    pub exported_at: Option<i64>,
}

#[derive(Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub rows: u32,
    pub applied: u32,
    pub unchanged: u32,
    /// Rows or tables the app does not understand.
    pub skipped: u32,
}

/// Reads an exported file without changing anything, so the person can confirm the import.
pub fn inspect(json: &str) -> Result<ImportPreview, EngineError> {
    let file = parse_export(json)?;
    let (events, _) = export_events(&file.tables);
    let tables = file.tables.keys().filter(|table| policy_for(table).is_some()).count();
    Ok(ImportPreview {
        rows: events.len() as u32,
        tables: tables as u32,
        exported_at: file.exported_at,
    })
}

/// Merges an exported file into this device with the same rules as changes from another device.
/// Importing the same file twice changes nothing the second time.
pub fn import_data(ctx: &Ctx, json: &str) -> Result<ImportSummary, EngineError> {
    let file = parse_export(json)?;
    let (events, skipped) = export_events(&file.tables);
    let mut summary = ImportSummary { rows: events.len() as u32, skipped, ..Default::default() };
    ctx.transaction(|| {
        let mut applier = RowApplier::new(ctx, Mode::Import);
        for event in &events {
            ctx.clock.observe(Hlc(event.hlc));
            tally(&mut summary, applier.apply(event)?);
        }
        Ok(())
    })?;
    Ok(summary)
}

fn tally(summary: &mut ImportSummary, outcome: Outcome) {
    match outcome {
        Outcome::Applied => summary.applied += 1,
        Outcome::Unchanged | Outcome::Conflict => summary.unchanged += 1,
        Outcome::Ignored => summary.skipped += 1,
    }
}

struct ExportFile {
    tables: Map<String, Value>,
    exported_at: Option<i64>,
}

fn parse_export(json: &str) -> Result<ExportFile, EngineError> {
    let document: Value = serde_json::from_str(json)
        .map_err(|_| EngineError::validation("the file is not a data export"))?;
    let object = document.as_object().ok_or_else(not_an_export)?;
    if let Some(format) = object.get("format") {
        if format != EXPORT_FORMAT {
            return Err(not_an_export());
        }
    }
    check_version(integer(object.get("version")))?;
    let tables = object.get("tables").and_then(Value::as_object).ok_or_else(not_an_export)?;
    Ok(ExportFile { tables: tables.clone(), exported_at: integer(object.get("exportedAt")) })
}

fn check_version(version: Option<i64>) -> Result<(), EngineError> {
    match version {
        Some(found) if (1..=EXPORT_VERSION).contains(&found) => Ok(()),
        Some(_) => Err(EngineError::validation("the file comes from a newer version of the app")),
        None => Err(not_an_export()),
    }
}

fn not_an_export() -> EngineError {
    EngineError::validation("the file is not a data export")
}

/// One event per row of every table the app syncs, plus the number of rows it could not use.
fn export_events(tables: &Map<String, Value>) -> (Vec<SyncEvent>, u32) {
    let mut events = Vec::new();
    let mut skipped = 0;
    for (table, rows) in tables {
        let rows = rows.as_array().map_or(&[][..], Vec::as_slice);
        if policy_for(table).is_none() {
            skipped += rows.len() as u32;
            continue;
        }
        for row in rows {
            match row_event(table, row) {
                Some(event) => events.push(event),
                None => skipped += 1,
            }
        }
    }
    (events, skipped)
}

fn row_event(table: &str, row: &Value) -> Option<SyncEvent> {
    let (module, entity_type) = entity_for_table(table)?;
    let fields = row.as_object()?;
    let entity_id = fields.get("id")?.as_str().filter(|id| !id.is_empty())?.to_string();
    let hlc = integer(fields.get("updated_at")).unwrap_or(0);
    if !(0..MAX_SAFE_CLOCK).contains(&hlc) {
        return None;
    }
    let deleted = integer(fields.get("deleted_at")).is_some();
    Some(SyncEvent {
        event_id: format!("import-{table}-{entity_id}"),
        module,
        entity_type,
        entity_id,
        action: if deleted { EventAction::Delete } else { EventAction::Insert },
        changed_fields: Vec::new(),
        payload: row.clone(),
        device_id: "import".to_string(),
        hlc,
    })
}
