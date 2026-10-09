use std::collections::HashMap;
use std::rc::Rc;

use alavo_domain::shared::error::EngineError;
use alavo_domain::sync::conflict::SyncConflict;
use alavo_domain::sync::entity_table::table_for;
use alavo_domain::sync::events::EventAction;
use alavo_domain::sync::incoming::Incoming;
use alavo_domain::sync::json_values::{integer, same_row, Row};
use alavo_domain::sync::merge_policy::{policy_for, MergePolicy};
use alavo_domain::sync::remote_event::SyncEvent;
use alavo_domain::sync::row_merge::merge;
use alavo_infrastructure::persistence::repositories::sync::conflicts::{
    find_conflict_for_row, save_conflict,
};
use alavo_infrastructure::persistence::repositories::sync::events::has_pending_change;
use alavo_infrastructure::persistence::repositories::sync::rows::{
    blank_row, find_row, save_row, table_columns, ColumnInfo,
};
use serde_json::Value;

use crate::context::Ctx;
use crate::events::{record, ChangeEvent};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    /// Changes from another device: a whole-row change that would replace an unsynced local
    /// change is kept aside as a conflict.
    Remote,
    /// Rows from an exported file: the person asked for them, and every row that changes is
    /// logged as a local change so other devices receive it.
    Import,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Applied,
    Unchanged,
    Conflict,
    Ignored,
}

#[derive(Clone, Copy)]
struct Target {
    table: &'static str,
    policy: MergePolicy,
}

pub struct RowApplier<'a, 'c> {
    ctx: &'a Ctx<'c>,
    mode: Mode,
    columns: HashMap<&'static str, Rc<Vec<ColumnInfo>>>,
}

impl<'a, 'c> RowApplier<'a, 'c> {
    pub fn new(ctx: &'a Ctx<'c>, mode: Mode) -> Self {
        Self { ctx, mode, columns: HashMap::new() }
    }

    pub fn apply(&mut self, event: &SyncEvent) -> Result<Outcome, EngineError> {
        let Some(target) = resolve_target(event) else { return Ok(Outcome::Ignored) };
        let columns = self.columns_of(target.table)?;
        let stored = find_row(self.ctx.db, target.table, &event.entity_id)?;
        let current = stored.clone().unwrap_or_else(|| blank_row(&columns, &event.entity_id));
        let merged = merge(target.policy, &current, &Incoming::from_event(event));
        if same_row(&merged, &current) {
            return Ok(Outcome::Unchanged);
        }
        if self.would_replace_unsynced_change(target, event, stored.is_some())? {
            self.keep_as_conflict(target, event, &current, merged)?;
            return Ok(Outcome::Conflict);
        }
        save_row(self.ctx.db, target.table, &columns, &merged)?;
        self.log_if_import(event, &merged)?;
        Ok(Outcome::Applied)
    }

    fn columns_of(&mut self, table: &'static str) -> Result<Rc<Vec<ColumnInfo>>, EngineError> {
        if let Some(known) = self.columns.get(table) {
            return Ok(Rc::clone(known));
        }
        let loaded = Rc::new(table_columns(self.ctx.db, table)?);
        self.columns.insert(table, Rc::clone(&loaded));
        Ok(loaded)
    }

    fn would_replace_unsynced_change(
        &self,
        target: Target,
        event: &SyncEvent,
        row_exists: bool,
    ) -> Result<bool, EngineError> {
        if self.mode != Mode::Remote || target.policy != MergePolicy::WholeRow || !row_exists {
            return Ok(false);
        }
        let entity = (event.module.as_str(), event.entity_type.as_str(), event.entity_id.as_str());
        has_pending_change(self.ctx.db, entity)
    }

    fn keep_as_conflict(
        &self,
        target: Target,
        event: &SyncEvent,
        local: &Row,
        remote: Row,
    ) -> Result<(), EngineError> {
        let open = find_conflict_for_row(self.ctx.db, target.table, &event.entity_id)?;
        if open.as_ref().is_some_and(|known| known.remote_hlc > event.hlc) {
            return Ok(());
        }
        let conflict = SyncConflict {
            id: open.map_or_else(|| self.ctx.new_id(), |known| known.id),
            module: event.module.clone(),
            entity_type: event.entity_type.clone(),
            entity_id: event.entity_id.clone(),
            local: Value::Object(local.clone()),
            remote: Value::Object(remote),
            remote_hlc: event.hlc,
            remote_device_id: event.device_id.clone(),
            created_at: self.ctx.now_ms(),
        };
        save_conflict(self.ctx.db, target.table, &conflict)
    }

    fn log_if_import(&self, event: &SyncEvent, merged: &Row) -> Result<(), EngineError> {
        if self.mode != Mode::Import {
            return Ok(());
        }
        let deleted = integer(merged.get("deleted_at")).is_some();
        let (action, changed): (EventAction, &[&str]) = if deleted {
            (EventAction::Delete, &["deleted_at"])
        } else {
            (EventAction::Insert, &[])
        };
        let payload = Value::Object(merged.clone());
        record(
            self.ctx,
            ChangeEvent {
                module: &event.module,
                entity_type: &event.entity_type,
                entity_id: &event.entity_id,
                action,
                changed_fields: changed,
                payload: &payload,
            },
        )
    }
}

fn resolve_target(event: &SyncEvent) -> Option<Target> {
    let table = table_for(&event.module, &event.entity_type)?;
    Some(Target { table, policy: policy_for(table)? })
}
