use super::Migration;

// Spending owns versions 100-199. Add one `Migration` per new SQL file in `spending/`.
pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 100,
        name: "spending_categories",
        sql: include_str!("spending/v100_spending_categories.sql"),
    },
    Migration {
        version: 101,
        name: "spending_wallets",
        sql: include_str!("spending/v101_spending_wallets.sql"),
    },
    Migration {
        version: 102,
        name: "spending_transactions",
        sql: include_str!("spending/v102_spending_transactions.sql"),
    },
    Migration {
        version: 103,
        name: "spending_goals",
        sql: include_str!("spending/v103_spending_goals.sql"),
    },
    Migration {
        version: 104,
        name: "spending_bills",
        sql: include_str!("spending/v104_spending_bills.sql"),
    },
];

#[cfg(all(test, feature = "native"))]
mod tests {
    use alavo_domain::ports::Database;

    use crate::persistence::migrations;
    use crate::persistence::native_db::NativeDb;
    use crate::testing::{migrated_memory_db, TEST_NOW_MS};

    const SPENDING_TABLES: [&str; 5] = [
        "spending_bills",
        "spending_categories",
        "spending_goals",
        "spending_transactions",
        "spending_wallets",
    ];

    fn count(db: &NativeDb, sql: &str) -> i64 {
        db.query(sql, &[]).unwrap()[0].int("total").unwrap()
    }

    #[test]
    fn versions_stay_inside_the_spending_range() {
        for migration in super::MIGRATIONS {
            assert!((100..=199).contains(&migration.version), "{}", migration.name);
        }
    }

    #[test]
    fn migrations_create_every_spending_table_on_a_fresh_database() {
        let db = migrated_memory_db();
        for table in SPENDING_TABLES {
            let sql = format!("SELECT COUNT(*) AS total FROM sqlite_master WHERE name = '{table}'");
            assert_eq!(count(&db, &sql), 1, "{table}");
        }
    }

    #[test]
    fn every_spending_table_has_the_sync_columns() {
        let db = migrated_memory_db();
        for table in SPENDING_TABLES {
            let rows = db.query(&format!("PRAGMA table_info({table})"), &[]).unwrap();
            let columns: Vec<String> = rows.iter().map(|row| row.text("name").unwrap()).collect();
            for required in ["id", "updated_at", "deleted_at", "field_updated_at"] {
                assert!(columns.iter().any(|name| name == required), "{table}.{required}");
            }
        }
    }

    #[test]
    fn running_the_migrations_twice_keeps_the_seed_rows_unique() {
        let db = migrated_memory_db();
        migrations::run(&db, TEST_NOW_MS).unwrap();
        assert_eq!(count(&db, "SELECT COUNT(*) AS total FROM spending_categories"), 8);
        assert_eq!(count(&db, "SELECT COUNT(*) AS total FROM spending_wallets"), 1);
    }

    #[test]
    fn seed_ids_are_fixed_and_the_house_category_is_a_fixed_cost() {
        let db = migrated_memory_db();
        let sql = "SELECT is_fixed, kind FROM spending_categories WHERE id = 'category-home'";
        let home = &db.query(sql, &[]).unwrap()[0];
        assert!(home.bool("is_fixed").unwrap());
        assert_eq!(home.text("kind").unwrap(), "expense");
        let income = "SELECT kind FROM spending_categories WHERE id = 'category-income'";
        assert_eq!(db.query(income, &[]).unwrap()[0].text("kind").unwrap(), "income");
        let cash = "SELECT name FROM spending_wallets WHERE id = 'wallet-cash'";
        assert_eq!(db.query(cash, &[]).unwrap()[0].text("name").unwrap(), "Tiền mặt");
    }

    #[test]
    fn migrations_are_recorded_so_they_do_not_run_again() {
        let db = migrated_memory_db();
        let sql = "SELECT COUNT(*) AS total FROM hub_migrations WHERE version BETWEEN 100 AND 199";
        assert_eq!(count(&db, sql), SPENDING_TABLES.len() as i64);
    }
}
