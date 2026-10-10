use alavo_domain::ports::Database;
use alavo_domain::shared::hlc::HlcClock;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::NewTransaction;
use alavo_infrastructure::persistence::native_db::NativeDb;
use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};

use crate::context::Ctx;

pub const TODAY: &str = "2026-10-09";
pub const FOOD: &str = "category-food";
pub const INCOME: &str = "category-income";
pub const CASH: &str = "wallet-cash";

pub struct Fixture {
    db: NativeDb,
    env: TestEnv,
    clock: HlcClock,
}

impl Fixture {
    pub fn new() -> Fixture {
        Fixture { db: migrated_memory_db(), env: TestEnv::new(), clock: HlcClock::default() }
    }

    pub fn ctx(&self) -> Ctx<'_> {
        Ctx::new(&self.db, &self.env, &self.clock, "device-a")
    }

    pub fn advance(&self, ms: i64) {
        self.env.advance(ms);
    }

    pub fn db(&self) -> &NativeDb {
        &self.db
    }

    pub fn count(&self, sql: &str) -> i64 {
        self.db.query(sql, &[]).unwrap()[0].int("total").unwrap()
    }

    pub fn events(&self, entity_type: &str) -> Vec<SyncEvent> {
        let sql = r#"
            SELECT action, changed_fields, payload_json
            FROM hub_delta_events
            WHERE module = 'spending' AND entity_type = ?
            ORDER BY hlc
        "#;
        let rows = self.db.query(sql, &[entity_type.into()]).unwrap();
        rows.iter()
            .map(|row| SyncEvent {
                action: row.text("action").unwrap(),
                changed_fields: row.opt_text("changed_fields").unwrap().unwrap_or_default(),
                payload: serde_json::from_str(&row.text("payload_json").unwrap()).unwrap(),
            })
            .collect()
    }

    pub fn notifications(&self) -> Vec<String> {
        let rows = self.db.query("SELECT title FROM hub_notifications ORDER BY rowid", &[]);
        rows.unwrap().iter().map(|row| row.text("title").unwrap()).collect()
    }
}

pub struct SyncEvent {
    pub action: String,
    pub changed_fields: String,
    pub payload: serde_json::Value,
}

pub fn expense(title: &str, amount_vnd: i64, occurred_on: &str) -> NewTransaction {
    NewTransaction {
        payment_method_id: None,
        title: title.to_string(),
        amount_vnd: Money(-amount_vnd),
        category_id: FOOD.to_string(),
        wallet_id: CASH.to_string(),
        occurred_on: occurred_on.to_string(),
        note: String::new(),
        recurring_rule: None,
    }
}

pub fn income(title: &str, amount_vnd: i64, occurred_on: &str) -> NewTransaction {
    NewTransaction {
        amount_vnd: Money(amount_vnd),
        category_id: INCOME.to_string(),
        ..expense(title, 0, occurred_on)
    }
}
