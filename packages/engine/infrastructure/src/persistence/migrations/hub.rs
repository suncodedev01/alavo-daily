use super::Migration;

pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "hub_device",
        sql: include_str!("hub/v001_hub_device.sql"),
    },
    Migration {
        version: 2,
        name: "hub_settings",
        sql: include_str!("hub/v002_hub_settings.sql"),
    },
    Migration {
        version: 3,
        name: "hub_delta_events",
        sql: include_str!("hub/v003_hub_delta_events.sql"),
    },
    Migration {
        version: 4,
        name: "hub_notifications",
        sql: include_str!("hub/v004_hub_notifications.sql"),
    },
    Migration {
        version: 5,
        name: "hub_notification_rules",
        sql: include_str!("hub/v005_hub_notification_rules.sql"),
    },
];
