use alavo_domain::shared::error::EngineError;
use alavo_domain::sync::events::EventAction;
use serde_json::{json, Value};

use crate::context::Ctx;
use crate::events::{record, ChangeEvent};

const MODULE: &str = "recipes";

/// The kind and id of the row a sync event is about.
#[derive(Clone, Copy)]
pub struct Entity<'a> {
    kind: &'static str,
    id: &'a str,
}

impl<'a> Entity<'a> {
    pub fn recipe(id: &'a str) -> Self {
        Self { kind: "recipe", id }
    }

    pub fn ingredient(id: &'a str) -> Self {
        Self { kind: "ingredient", id }
    }

    pub fn step(id: &'a str) -> Self {
        Self { kind: "step", id }
    }

    pub fn plan_entry(id: &'a str) -> Self {
        Self { kind: "plan_entry", id }
    }

    pub fn shopping_item(id: &'a str) -> Self {
        Self { kind: "shopping_item", id }
    }

    pub fn shopping_state(key: &'a str) -> Self {
        Self { kind: "shopping_state", id: key }
    }

    pub fn photo(recipe_id: &'a str) -> Self {
        Self { kind: "photo", id: recipe_id }
    }
}

pub fn record_insert(ctx: &Ctx, entity: Entity, payload: &Value) -> Result<(), EngineError> {
    send(ctx, Change { entity, action: EventAction::Insert, changed_fields: &[] }, payload)
}

pub fn record_update(
    ctx: &Ctx,
    entity: Entity,
    changed_fields: &[&str],
    payload: &Value,
) -> Result<(), EngineError> {
    send(ctx, Change { entity, action: EventAction::Update, changed_fields }, payload)
}

pub fn record_delete(ctx: &Ctx, entity: Entity, deleted_at: i64) -> Result<(), EngineError> {
    let payload = json!({ "id": entity.id, "deleted_at": deleted_at, "updated_at": deleted_at });
    send(ctx, Change { entity, action: EventAction::Delete, changed_fields: &[] }, &payload)
}

struct Change<'a> {
    entity: Entity<'a>,
    action: EventAction,
    changed_fields: &'a [&'a str],
}

fn send(ctx: &Ctx, change: Change, payload: &Value) -> Result<(), EngineError> {
    record(
        ctx,
        ChangeEvent {
            module: MODULE,
            entity_type: change.entity.kind,
            entity_id: change.entity.id,
            action: change.action,
            changed_fields: change.changed_fields,
            payload,
        },
    )
}
