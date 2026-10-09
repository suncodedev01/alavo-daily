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
        let text = if payload.is_null() { String::new() } else { payload.to_string() };
        let error = self.engine.call(&self.db, &self.env, command, &text).unwrap_err();
        serde_json::from_str(&error.to_json()).unwrap()
    }

    pub fn create(&self, name: &str) -> Value {
        self.call("recipes.create", recipe_payload(name))
    }
}

pub fn recipe_payload(name: &str) -> Value {
    json!({
        "name": name,
        "tags": ["Món chính"],
        "prepMin": 15,
        "cookMin": 40,
        "servings": 4,
        "level": "easy",
        "icon": "cooking-pot",
        "kcal": 420,
        "note": "ít mặn",
        "ingredients": [
            { "name": "Đùi gà", "quantity": 600, "unit": "g", "aisle": "meat_fish", "costVnd": 54000 },
            { "name": "Nước mắm", "quantity": 2, "unit": "muỗng canh", "aisle": "spices" }
        ],
        "steps": [{ "text": "Ướp gà", "timerMin": 15 }, { "text": "Kho" }]
    })
}

pub fn error_code(error: &Value) -> &str {
    error["code"].as_str().unwrap()
}
