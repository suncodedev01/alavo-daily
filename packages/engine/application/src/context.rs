use std::cell::Cell;

use alavo_domain::ports::{Database, Env};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::hlc::{Hlc, HlcClock};

/// Everything a use case needs: the database, the platform, the clock and this device's id.
/// One `Ctx` lives for exactly one engine call.
pub struct Ctx<'a> {
    pub db: &'a dyn Database,
    pub env: &'a dyn Env,
    pub clock: &'a HlcClock,
    pub device_id: &'a str,
    depth: Cell<u32>,
}

impl<'a> Ctx<'a> {
    pub fn new(
        db: &'a dyn Database,
        env: &'a dyn Env,
        clock: &'a HlcClock,
        device_id: &'a str,
    ) -> Self {
        Self { db, env, clock, device_id, depth: Cell::new(0) }
    }

    pub fn now_ms(&self) -> i64 {
        self.env.now_ms()
    }

    pub fn new_id(&self) -> String {
        self.env.new_id()
    }

    /// A fresh clock value for stamping a write.
    pub fn tick(&self) -> Hlc {
        self.clock.tick(self.env.now_ms())
    }

    /// Runs `work` inside one SQLite transaction. Calls nest: only the outermost one begins and
    /// commits, so a use case can call another use case without opening a second transaction.
    pub fn transaction<T>(
        &self,
        work: impl FnOnce() -> Result<T, EngineError>,
    ) -> Result<T, EngineError> {
        if self.depth.get() > 0 {
            return work();
        }
        self.db.execute_batch("BEGIN")?;
        self.depth.set(1);
        let result = work();
        self.depth.set(0);
        match result {
            Ok(value) => {
                self.db.execute_batch("COMMIT")?;
                Ok(value)
            }
            Err(error) => {
                let _ = self.db.execute_batch("ROLLBACK");
                Err(error)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};

    use super::*;

    #[test]
    fn transaction_rolls_back_when_work_fails() {
        let db = migrated_memory_db();
        let env = TestEnv::new();
        let clock = HlcClock::default();
        let ctx = Ctx::new(&db, &env, &clock, "device-a");
        let failed: Result<(), EngineError> = ctx.transaction(|| {
            db.execute("INSERT INTO hub_settings VALUES ('k', '1', 0)", &[])?;
            Err(EngineError::validation("boom"))
        });
        assert!(failed.is_err());
        let rows = db.query("SELECT id FROM hub_settings", &[]).unwrap();
        assert!(rows.is_empty());
    }

    #[test]
    fn nested_transactions_commit_once() {
        let db = migrated_memory_db();
        let env = TestEnv::new();
        let clock = HlcClock::default();
        let ctx = Ctx::new(&db, &env, &clock, "device-a");
        ctx.transaction(|| {
            ctx.transaction(|| db.execute("INSERT INTO hub_settings VALUES ('k', '1', 0)", &[]))
        })
        .unwrap();
        assert_eq!(db.query("SELECT id FROM hub_settings", &[]).unwrap().len(), 1);
    }
}
