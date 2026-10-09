//! The WebAssembly entry points. The JavaScript host (a Web Worker that also runs SQLite WASM)
//! must define three globals before calling anything here:
//!
//! - `__alavo_db(op, sql, paramsJson) -> string`, op is `batch`, `execute` or `query`
//! - `__alavo_uuid() -> string`

use std::cell::RefCell;
use std::sync::Arc;

use alavo_domain::ports::{Database, Env, Row, Value};
use alavo_domain::shared::error::EngineError;
use serde_json::Value as Json;
use wasm_bindgen::prelude::*;

use crate::engine::Engine;

#[wasm_bindgen(js_namespace = globalThis)]
extern "C" {
    #[wasm_bindgen(catch, js_name = __alavo_db)]
    fn host_db(op: &str, sql: &str, params_json: &str) -> Result<String, JsValue>;

    #[wasm_bindgen(js_name = __alavo_uuid)]
    fn host_uuid() -> String;
}

thread_local! {
    static ENGINE: RefCell<Option<Engine>> = const { RefCell::new(None) };
}

struct JsDb;

impl Database for JsDb {
    fn execute_batch(&self, sql: &str) -> Result<(), EngineError> {
        host("batch", sql, &[]).map(|_| ())
    }

    fn execute(&self, sql: &str, params: &[Value]) -> Result<u64, EngineError> {
        let reply = host("execute", sql, params)?;
        Ok(reply["changes"].as_u64().unwrap_or(0))
    }

    fn query(&self, sql: &str, params: &[Value]) -> Result<Vec<Row>, EngineError> {
        let reply = host("query", sql, params)?;
        let columns: Arc<Vec<String>> = Arc::new(
            reply["columns"]
                .as_array()
                .map(|names| names.iter().filter_map(|n| n.as_str().map(String::from)).collect())
                .unwrap_or_default(),
        );
        let rows = reply["rows"].as_array().cloned().unwrap_or_default();
        Ok(rows.iter().map(|row| to_row(&columns, row)).collect())
    }
}

struct WasmEnv;

impl Env for WasmEnv {
    fn now_ms(&self) -> i64 {
        js_sys::Date::now() as i64
    }

    fn new_id(&self) -> String {
        host_uuid()
    }
}

fn host(op: &str, sql: &str, params: &[Value]) -> Result<Json, EngineError> {
    let encoded = serde_json::to_string(&params.iter().map(to_json).collect::<Vec<_>>())?;
    let reply = host_db(op, sql, &encoded).map_err(|error| {
        EngineError::db(error.as_string().unwrap_or_else(|| "database call failed".to_string()))
    })?;
    Ok(serde_json::from_str(&reply)?)
}

fn to_json(value: &Value) -> Json {
    match value {
        Value::Null => Json::Null,
        Value::Int(number) => Json::from(*number),
        Value::Real(number) => Json::from(*number),
        Value::Text(text) => Json::from(text.as_str()),
    }
}

fn to_row(columns: &Arc<Vec<String>>, row: &Json) -> Row {
    let values = row.as_array().map(Vec::as_slice).unwrap_or_default().iter().map(from_json);
    Row::new(Arc::clone(columns), values.collect())
}

fn from_json(value: &Json) -> Value {
    match value {
        Json::Number(number) => match number.as_i64() {
            Some(int) => Value::Int(int),
            None => Value::Real(number.as_f64().unwrap_or_default()),
        },
        Json::String(text) => Value::Text(text.clone()),
        Json::Bool(flag) => Value::Int(i64::from(*flag)),
        _ => Value::Null,
    }
}

/// Migrates the database and loads this device's identity. Returns `{"deviceId": "..."}`.
#[wasm_bindgen]
pub fn engine_start() -> Result<String, JsValue> {
    let engine = Engine::start(&JsDb, &WasmEnv).map_err(to_js_error)?;
    let reply = serde_json::json!({ "deviceId": engine.device_id() }).to_string();
    ENGINE.with(|slot| *slot.borrow_mut() = Some(engine));
    Ok(reply)
}

/// Runs one command. Errors are JSON strings: `{"code": "...", "message": "..."}`.
#[wasm_bindgen]
pub fn engine_call(command: &str, payload: &str) -> Result<String, JsValue> {
    ENGINE.with(|slot| match slot.borrow().as_ref() {
        Some(engine) => engine.call(&JsDb, &WasmEnv, command, payload).map_err(to_js_error),
        None => Err(to_js_error(EngineError::internal("engine_start was not called"))),
    })
}

fn to_js_error(error: EngineError) -> JsValue {
    JsValue::from_str(&error.to_json())
}
