use super::Migration;

// Recipes owns versions 200-299. Add one `Migration` per new SQL file in `recipes/`.
pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 200,
        name: "recipes_recipes",
        sql: include_str!("recipes/v200_recipes_recipes.sql"),
    },
    Migration {
        version: 201,
        name: "recipes_ingredients",
        sql: include_str!("recipes/v201_recipes_ingredients.sql"),
    },
    Migration {
        version: 202,
        name: "recipes_steps",
        sql: include_str!("recipes/v202_recipes_steps.sql"),
    },
    Migration {
        version: 203,
        name: "recipes_plan_entries",
        sql: include_str!("recipes/v203_recipes_plan_entries.sql"),
    },
    Migration {
        version: 204,
        name: "recipes_shopping_items",
        sql: include_str!("recipes/v204_recipes_shopping_items.sql"),
    },
    Migration {
        version: 205,
        name: "recipes_shopping_state",
        sql: include_str!("recipes/v205_recipes_shopping_state.sql"),
    },
];

#[cfg(all(test, feature = "native"))]
mod tests {
    use alavo_domain::ports::Database;
    use alavo_domain::sync::merge_policy::policy_for;

    use super::*;
    use crate::persistence::migrations::{all, run};
    use crate::persistence::native_db::NativeDb;
    use crate::testing::TEST_NOW_MS;

    const TABLES: &[&str] = &[
        "recipes_recipes",
        "recipes_ingredients",
        "recipes_steps",
        "recipes_plan_entries",
        "recipes_shopping_items",
        "recipes_shopping_state",
    ];

    fn table_names(db: &NativeDb) -> Vec<String> {
        let sql = "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'recipes_%'";
        db.query(sql, &[]).unwrap().iter().map(|row| row.text("name").unwrap()).collect()
    }

    fn column_names(db: &NativeDb, table: &str) -> Vec<String> {
        let rows = db.query(&format!("PRAGMA table_info({table})"), &[]).unwrap();
        rows.iter().map(|row| row.text("name").unwrap()).collect()
    }

    #[test]
    fn versions_stay_inside_the_recipes_range_and_are_unique() {
        let versions: Vec<i64> = MIGRATIONS.iter().map(|migration| migration.version).collect();
        assert!(versions.iter().all(|version| (200..=299).contains(version)));
        let mut sorted = versions.clone();
        sorted.dedup();
        assert_eq!(sorted, versions);
    }

    #[test]
    fn a_fresh_database_gets_every_recipes_table() {
        let db = NativeDb::in_memory().unwrap();
        run(&db, TEST_NOW_MS).unwrap();
        let mut names = table_names(&db);
        names.sort();
        let mut expected: Vec<String> = TABLES.iter().map(|name| name.to_string()).collect();
        expected.sort();
        assert_eq!(names, expected);
    }

    #[test]
    fn running_twice_changes_nothing() {
        let db = NativeDb::in_memory().unwrap();
        run(&db, TEST_NOW_MS).unwrap();
        db.execute("INSERT INTO recipes_shopping_state VALUES ('Sữa|hộp', 1, 5, NULL)", &[])
            .unwrap();
        run(&db, TEST_NOW_MS).unwrap();
        assert_eq!(db.query("SELECT id FROM recipes_shopping_state", &[]).unwrap().len(), 1);
        let applied = db.query("SELECT version FROM hub_migrations WHERE version >= 200", &[]);
        assert_eq!(applied.unwrap().len(), MIGRATIONS.len());
    }

    #[test]
    fn every_sql_file_can_be_applied_again_without_error() {
        let db = NativeDb::in_memory().unwrap();
        run(&db, TEST_NOW_MS).unwrap();
        for migration in all().into_iter().filter(|migration| migration.version >= 200) {
            db.execute_batch(migration.sql).unwrap();
        }
    }

    #[test]
    fn synced_tables_carry_the_sync_columns() {
        let db = NativeDb::in_memory().unwrap();
        run(&db, TEST_NOW_MS).unwrap();
        for table in TABLES {
            let columns = column_names(&db, table);
            for required in ["id", "updated_at", "deleted_at"] {
                assert!(columns.iter().any(|name| name == required), "{table} lacks {required}");
            }
        }
        assert!(column_names(&db, "recipes_recipes").contains(&"field_updated_at".to_string()));
    }

    #[test]
    fn ordered_children_have_a_text_position() {
        let db = NativeDb::in_memory().unwrap();
        run(&db, TEST_NOW_MS).unwrap();
        for table in ["recipes_ingredients", "recipes_steps"] {
            assert!(column_names(&db, table).contains(&"position".to_string()));
        }
    }

    #[test]
    fn declared_tables_have_merge_policies_except_the_have_flags() {
        for table in &TABLES[..5] {
            assert!(policy_for(table).is_some(), "{table}");
        }
    }
}
