use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::Entity;
use alavo_domain::sync::events::{stamp_fields, EventAction};
use alavo_infrastructure::persistence::repositories::spending::rows::{
    self, field_stamps, row_json, Stamp,
};

use crate::context::Ctx;
use crate::events::{record, ChangeEvent};

const MODULE: &str = "spending";
const DELETED_COLUMN: &[&str] = &["deleted_at"];

pub fn stamp_insert(ctx: &Ctx, entity: Entity) -> Stamp {
    let clock = ctx.tick();
    Stamp {
        updated_at: clock.value(),
        field_updated_at: stamp_fields(None, entity.columns(), clock),
    }
}

pub fn stamp_update(
    ctx: &Ctx,
    entity: Entity,
    id: &str,
    columns: &[&str],
) -> Result<Stamp, EngineError> {
    let existing = field_stamps(ctx.db, entity, id)?;
    let clock = ctx.tick();
    Ok(Stamp {
        updated_at: clock.value(),
        field_updated_at: stamp_fields(existing.as_deref(), columns, clock),
    })
}

pub fn log_insert(ctx: &Ctx, entity: Entity, id: &str) -> Result<(), EngineError> {
    let columns = entity.columns();
    log_change(ctx, Change { entity, id, action: EventAction::Insert, columns })
}

pub fn log_update(
    ctx: &Ctx,
    entity: Entity,
    id: &str,
    columns: &[&str],
) -> Result<(), EngineError> {
    log_change(ctx, Change { entity, id, action: EventAction::Update, columns })
}

pub fn delete_row(ctx: &Ctx, entity: Entity, id: &str) -> Result<(), EngineError> {
    let stamp = stamp_update(ctx, entity, id, DELETED_COLUMN)?;
    if !rows::soft_delete(ctx.db, entity, id, &stamp)? {
        return Err(EngineError::not_found(entity.entity_type(), id));
    }
    let columns = DELETED_COLUMN;
    log_change(ctx, Change { entity, id, action: EventAction::Delete, columns })
}

struct Change<'a> {
    entity: Entity,
    id: &'a str,
    action: EventAction,
    columns: &'a [&'a str],
}

fn log_change(ctx: &Ctx, change: Change) -> Result<(), EngineError> {
    let payload = row_json(ctx.db, change.entity, change.id)?;
    record(
        ctx,
        ChangeEvent {
            module: MODULE,
            entity_type: change.entity.entity_type(),
            entity_id: change.id,
            action: change.action,
            changed_fields: change.columns,
            payload: &payload,
        },
    )
}
