use alavo_application::hub::{export, load_demo_data, notifications, rules, settings};
use alavo_application::Ctx;
use alavo_domain::hub::{UpdateNotificationRule, UpdateSettings};
use serde::Deserialize;
use serde_json::json;

use crate::sync;
use crate::util::{respond, with_input, Handled};

#[derive(Deserialize, Default)]
#[serde(default)]
struct MarkRead {
    ids: Option<Vec<String>>,
}

/// Commands named `hub.*` and `sync.*`.
pub fn handle(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    if let Some(handled) = sync::handle(ctx, command, payload) {
        return Some(handled);
    }
    Some(match command {
        "hub.get_settings" => respond(settings::get(ctx)),
        "hub.update_settings" => {
            with_input(payload, |input: UpdateSettings| settings::update(ctx, input))
        }
        "hub.list_notifications" => respond(notifications::list(ctx)),
        "hub.mark_notifications_read" => with_input(payload, |input: MarkRead| {
            notifications::mark_read(ctx, input.ids).map(|count| json!({ "count": count }))
        }),
        "hub.list_notification_rules" => respond(rules::list(ctx)),
        "hub.update_notification_rule" => {
            with_input(payload, |input: UpdateNotificationRule| rules::update(ctx, input))
        }
        "hub.export_data" => respond(export::export_data(ctx)),
        "hub.load_demo_data" => respond(load_demo_data(ctx).map(|_| json!({}))),
        "hub.device_info" => respond(Ok(json!({ "deviceId": ctx.device_id }))),
        _ => return None,
    })
}
