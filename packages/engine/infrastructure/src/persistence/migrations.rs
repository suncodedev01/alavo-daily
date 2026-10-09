use alavo_domain::ports::{Database, Value};
use alavo_domain::shared::error::EngineError;

mod hub;
mod recipes;
mod spending;

pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    pub sql: &'static str,
}

/// Version ranges keep modules from colliding: hub 1-99, spending 100-199, recipes 200-299.
pub fn all() -> Vec<&'static Migration> {
    let mut migrations: Vec<&'static Migration> = hub::MIGRATIONS
        .iter()
        .chain(spending::MIGRATIONS.iter())
        .chain(recipes::MIGRATIONS.iter())
        .collect();
    migrations.sort_by_key(|migration| migration.version);
    migrations
}

pub fn run(db: &dyn Database, now_ms: i64) -> Result<(), EngineError> {
    db.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS hub_migrations (
            version INTEGER PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            applied_at INTEGER NOT NULL
        );
        "#,
    )?;
    let applied = applied_versions(db)?;
    for migration in all() {
        if !applied.contains(&migration.version) {
            apply(db, migration, now_ms)?;
        }
    }
    Ok(())
}

fn applied_versions(db: &dyn Database) -> Result<Vec<i64>, EngineError> {
    db.query("SELECT version FROM hub_migrations", &[])?
        .iter()
        .map(|row| row.int("version"))
        .collect()
}

fn apply(db: &dyn Database, migration: &Migration, now_ms: i64) -> Result<(), EngineError> {
    db.execute_batch("BEGIN")?;
    let result = db.execute_batch(migration.sql).and_then(|_| {
        db.execute(
            "INSERT INTO hub_migrations (version, name, applied_at) VALUES (?, ?, ?)",
            &[Value::from(migration.version), Value::from(migration.name), Value::from(now_ms)],
        )
        .map(|_| ())
    });
    match result {
        Ok(()) => db.execute_batch("COMMIT"),
        Err(error) => {
            let _ = db.execute_batch("ROLLBACK");
            Err(error)
        }
    }
}
