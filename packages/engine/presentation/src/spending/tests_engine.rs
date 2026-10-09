use serde_json::{json, Value};

use super::harness::Harness;
use crate::engine::Engine;

#[test]
fn unknown_spending_commands_and_bad_payloads_fail_with_typed_errors() {
    let harness = Harness::start();
    assert_eq!(harness.fail("spending.nope", json!({}))["code"], "unknown_command");
    let malformed =
        harness.engine.call(&harness.db, &harness.env, "spending.get_transaction", "{oops");
    assert!(malformed.unwrap_err().to_json().contains("validation"));
    assert_eq!(harness.fail("spending.get_transaction", json!({}))["code"], "validation");
}

#[test]
fn loading_demo_data_twice_fills_spending_once() {
    let harness = Harness::start();
    harness.call("hub.load_demo_data", Value::Null);
    harness.call("hub.load_demo_data", Value::Null);
    assert_eq!(
        harness.call("spending.list_transactions", Value::Null).as_array().unwrap().len(),
        23
    );
    assert_eq!(harness.call("spending.list_wallets", Value::Null).as_array().unwrap().len(), 3);
    assert_eq!(harness.call("spending.list_goals", Value::Null).as_array().unwrap().len(), 3);
    assert_eq!(harness.call("spending.list_bills", Value::Null).as_array().unwrap().len(), 3);
    let export = harness.call("hub.export_data", Value::Null);
    assert_eq!(export["tables"]["spending_transactions"].as_array().unwrap().len(), 23);
}

#[test]
fn restarting_the_engine_reruns_migrations_without_touching_spending_data() {
    let harness = Harness::start();
    harness.record("Phở", -70_000, "2026-10-06");
    let restarted = Engine::start(&harness.db, &harness.env).unwrap();
    let json = restarted.call(&harness.db, &harness.env, "spending.list_transactions", "").unwrap();
    assert_eq!(serde_json::from_str::<Value>(&json).unwrap().as_array().unwrap().len(), 1);
    let json = restarted.call(&harness.db, &harness.env, "spending.list_categories", "").unwrap();
    assert_eq!(serde_json::from_str::<Value>(&json).unwrap().as_array().unwrap().len(), 8);
    assert_eq!(restarted.device_id(), harness.engine.device_id());
}

#[test]
fn every_spending_write_shows_up_as_a_pending_sync_event() {
    let harness = Harness::start();
    assert_eq!(harness.call("sync.status", Value::Null)["pendingEvents"], 0);
    let saved = harness.record("Phở", -70_000, "2026-10-06");
    harness.call("spending.delete_transaction", json!({ "id": saved["id"] }));
    assert_eq!(harness.call("sync.status", Value::Null)["pendingEvents"], 2);
}
