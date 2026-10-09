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
    Migration {
        version: 6,
        name: "hub_morning_menu_rule",
        sql: include_str!("hub/v006_hub_morning_menu_rule.sql"),
    },
    Migration {
        version: 7,
        name: "hub_sync_peers",
        sql: include_str!("hub/v007_hub_sync_peers.sql"),
    },
    Migration {
        version: 8,
        name: "hub_sync_conflicts",
        sql: include_str!("hub/v008_hub_sync_conflicts.sql"),
    },
];
