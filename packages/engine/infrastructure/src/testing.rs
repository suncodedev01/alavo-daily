//! Helpers for tests in every crate: an in-memory database with all migrations applied and a
//! deterministic environment (fixed clock, predictable ids).

use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Mutex;

use alavo_domain::ports::Env;

use crate::persistence::migrations;
use crate::persistence::native_db::NativeDb;

/// 2026-10-09T08:00:00Z, so tests never depend on the real clock.
pub const TEST_NOW_MS: i64 = 1_791_532_800_000;

pub struct TestEnv {
    now: Mutex<i64>,
    next_id: AtomicI64,
    prefix: String,
}

impl TestEnv {
    pub fn new() -> Self {
        Self::with_prefix("id")
    }

    /// An environment whose ids start with `prefix`, so two simulated devices never create the
    /// same id.
    pub fn with_prefix(prefix: &str) -> Self {
        Self {
            now: Mutex::new(TEST_NOW_MS),
            next_id: AtomicI64::new(1),
            prefix: prefix.to_string(),
        }
    }

    pub fn advance(&self, ms: i64) {
        *self.now.lock().unwrap_or_else(|poisoned| poisoned.into_inner()) += ms;
    }
}

impl Default for TestEnv {
    fn default() -> Self {
        Self::new()
    }
}

impl Env for TestEnv {
    fn now_ms(&self) -> i64 {
        *self.now.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn new_id(&self) -> String {
        format!("{}-{:04}", self.prefix, self.next_id.fetch_add(1, Ordering::SeqCst))
    }
}

pub fn migrated_memory_db() -> NativeDb {
    let db = NativeDb::in_memory().expect("open in-memory database");
    migrations::run(&db, TEST_NOW_MS).expect("run migrations");
    db
}
