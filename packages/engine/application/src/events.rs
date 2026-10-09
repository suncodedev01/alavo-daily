use alavo_domain::shared::error::EngineError;
use alavo_domain::sync::events::EventAction;
use alavo_infrastructure::persistence::repositories::hub::{insert_event, EventRow};
use serde_json::Value;

use crate::context::Ctx;

pub struct ChangeEvent<'a> {
    pub module: &'a str,
    pub entity_type: &'a str,
    pub entity_id: &'a str,
    pub action: EventAction,
    pub changed_fields: &'a [&'a str],
    pub payload: &'a Value,
}

/// Appends one sync event. Call it inside the same transaction as the write it describes.
pub fn record(ctx: &Ctx, event: ChangeEvent) -> Result<(), EngineError> {
    let changed_fields = if event.changed_fields.is_empty() {
        None
    } else {
        Some(serde_json::to_string(event.changed_fields)?)
    };
    insert_event(
        ctx.db,
        &EventRow {
            event_id: ctx.new_id(),
            module: event.module.to_string(),
            entity_type: event.entity_type.to_string(),
            entity_id: event.entity_id.to_string(),
            action: event.action.as_str().to_string(),
            changed_fields,
            payload_json: event.payload.to_string(),
            device_id: ctx.device_id.to_string(),
            hlc: ctx.tick().value(),
        },
    )
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::hlc::HlcClock;
    use alavo_infrastructure::persistence::repositories::hub::count_pending_events;
    use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};
    use serde_json::json;

    use super::*;

    #[test]
    fn record_appends_an_unsynced_event() {
        let db = migrated_memory_db();
        let env = TestEnv::new();
        let clock = HlcClock::default();
        let ctx = Ctx::new(&db, &env, &clock, "device-a");
        let payload = json!({ "name": "Gà kho" });
        record(
            &ctx,
            ChangeEvent {
                module: "recipes",
                entity_type: "recipe",
                entity_id: "r1",
                action: EventAction::Insert,
                changed_fields: &[],
                payload: &payload,
            },
        )
        .unwrap();
        assert_eq!(count_pending_events(&db).unwrap(), 1);
    }
}
