use alavo_infrastructure::persistence::native_db::NativeDb;
use alavo_infrastructure::testing::TestEnv;
use serde_json::{json, Value};

use crate::engine::Engine;

pub struct Harness {
    pub db: NativeDb,
    pub env: TestEnv,
    pub engine: Engine,
}

impl Harness {
    pub fn start() -> Harness {
        let db = NativeDb::in_memory().unwrap();
        let env = TestEnv::new();
        let engine = Engine::start(&db, &env).unwrap();
        Harness { db, env, engine }
    }

    pub fn call(&self, command: &str, payload: Value) -> Value {
        let text = if payload.is_null() { String::new() } else { payload.to_string() };
        let json = self.engine.call(&self.db, &self.env, command, &text).unwrap();
        serde_json::from_str(&json).unwrap()
    }

    pub fn fail(&self, command: &str, payload: Value) -> Value {
        let error = self.engine.call(&self.db, &self.env, command, &payload.to_string());
        serde_json::from_str(&error.unwrap_err().to_json()).unwrap()
    }

    pub fn record(&self, title: &str, amount: i64, date: &str) -> Value {
        let payload = json!({
            "title": title, "amountVnd": amount, "categoryId": "category-food",
            "walletId": "wallet-cash", "occurredOn": date,
        });
        self.call("spending.record_transaction", payload)
    }
}

pub fn titles(list: &Value) -> Vec<&str> {
    list.as_array().unwrap().iter().map(|item| item["title"].as_str().unwrap()).collect()
}
