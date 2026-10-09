use alavo_domain::shared::error::EngineError;
use alavo_domain::sync::conflict::{Keep, SyncConflict};
use alavo_domain::sync::entity_table::table_for;
use alavo_domain::sync::events::EventAction;
use alavo_domain::sync::json_values::{integer, Row};
use alavo_infrastructure::persistence::repositories::sync::conflicts::{
    delete_conflict, find_conflict, list_conflicts,
};
use alavo_infrastructure::persistence::repositories::sync::rows::{
    find_row, save_row, table_columns,
};
use serde_json::Value;

use crate::context::Ctx;
use crate::events::{record, ChangeEvent};

pub fn list(ctx: &Ctx) -> Result<Vec<SyncConflict>, EngineError> {
    list_conflicts(ctx.db)
}

/// Settles a conflict with the chosen version. The choice is written as a new change with a
/// fresh clock, so every device ends on the same version whatever it saw first.
pub fn resolve(ctx: &Ctx, id: &str, keep: Keep) -> Result<(), EngineError> {
    ctx.transaction(|| {
        let conflict =
            find_conflict(ctx.db, id)?.ok_or_else(|| EngineError::not_found("conflict", id))?;
        let table = table_for(&conflict.module, &conflict.entity_type)
            .ok_or_else(|| EngineError::internal("conflict on an unknown table"))?;
        let chosen = chosen_version(ctx, table, &conflict, keep)?;
        let stamped = restamp(chosen, ctx.tick().value());
        save_row(ctx.db, table, &table_columns(ctx.db, table)?, &stamped)?;
        log_choice(ctx, &conflict, &stamped)?;
        delete_conflict(ctx.db, id)
    })
}

fn chosen_version(
    ctx: &Ctx,
    table: &str,
    conflict: &SyncConflict,
    keep: Keep,
) -> Result<Row, EngineError> {
    match keep {
        Keep::Local => find_row(ctx.db, table, &conflict.entity_id)?
            .ok_or_else(|| EngineError::not_found(&conflict.entity_type, &conflict.entity_id)),
        Keep::Remote => conflict
            .remote
            .as_object()
            .cloned()
            .ok_or_else(|| EngineError::internal("conflict has no remote version")),
    }
}

fn restamp(mut row: Row, clock: i64) -> Row {
    let deleted = integer(row.get("deleted_at")).is_some();
    row.insert("updated_at".to_string(), Value::from(clock));
    row.insert("deleted_at".to_string(), if deleted { Value::from(clock) } else { Value::Null });
    row
}

fn log_choice(ctx: &Ctx, conflict: &SyncConflict, row: &Row) -> Result<(), EngineError> {
    let deleted = integer(row.get("deleted_at")).is_some();
    let (action, changed): (EventAction, &[&str]) =
        if deleted { (EventAction::Delete, &["deleted_at"]) } else { (EventAction::Update, &[]) };
    record(
        ctx,
        ChangeEvent {
            module: &conflict.module,
            entity_type: &conflict.entity_type,
            entity_id: &conflict.entity_id,
            action,
            changed_fields: changed,
            payload: &Value::Object(row.clone()),
        },
    )
}
