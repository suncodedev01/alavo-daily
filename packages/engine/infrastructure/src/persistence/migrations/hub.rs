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
    Migration {
        version: 9,
        name: "hub_light_theme_default",
        sql: include_str!("hub/v009_hub_light_theme_default.sql"),
    },
];

#[cfg(all(test, feature = "native"))]
mod tests {
    use alavo_domain::ports::{Database, Value};

    use super::*;
    use crate::persistence::native_db::NativeDb;
    use crate::testing::migrated_memory_db;

    fn save(db: &NativeDb, json: &str) {
        let sql = "INSERT OR REPLACE INTO hub_settings (id, value_json, updated_at) VALUES ('app', ?, 0)";
        db.execute(sql, &[Value::from(json)]).expect("save settings");
    }

    fn saved_theme(db: &NativeDb) -> String {
        let sql = "SELECT json_extract(value_json, '$.theme') AS theme FROM hub_settings WHERE id = 'app'";
        db.query(sql, &[]).expect("read the theme")[0].text("theme").expect("theme column")
    }

    fn run_light_theme_migration(db: &NativeDb) {
        let migration = MIGRATIONS.iter().find(|migration| migration.version == 9).expect("version 9");
        db.execute_batch(migration.sql).expect("run the migration");
    }

    #[test]
    fn a_saved_follow_the_device_theme_becomes_light() {
        let db = migrated_memory_db();
        save(&db, r#"{"language":"vi","theme":"system","householdSize":2}"#);
        run_light_theme_migration(&db);
        assert_eq!(saved_theme(&db), "light");
    }

    #[test]
    fn a_theme_the_person_chose_is_left_alone() {
        let db = migrated_memory_db();
        save(&db, r#"{"language":"vi","theme":"dark","householdSize":2}"#);
        run_light_theme_migration(&db);
        assert_eq!(saved_theme(&db), "dark");
    }

    #[test]
    fn the_other_settings_are_kept() {
        let db = migrated_memory_db();
        save(&db, r#"{"language":"en","theme":"system","householdSize":4}"#);
        run_light_theme_migration(&db);
        let sql = "SELECT json_extract(value_json, '$.householdSize') AS size FROM hub_settings WHERE id = 'app'";
        assert_eq!(db.query(sql, &[]).expect("read")[0].int("size").expect("size"), 4);
    }

    #[test]
    fn running_it_without_saved_settings_changes_nothing() {
        let db = migrated_memory_db();
        run_light_theme_migration(&db);
        let rows = db.query("SELECT id FROM hub_settings WHERE id = 'app'", &[]).expect("read");
        assert!(rows.is_empty());
    }
}
