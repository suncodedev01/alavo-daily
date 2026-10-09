use alavo_infrastructure::persistence::native_db::NativeDb;
use alavo_infrastructure::testing::TestEnv;
use serde_json::{json, Value};

use crate::engine::Engine;

struct Phone {
    db: NativeDb,
    env: TestEnv,
    engine: Engine,
}

impl Phone {
    fn new(prefix: &str) -> Phone {
        let db = NativeDb::in_memory().unwrap();
        let env = TestEnv::with_prefix(prefix);
        let engine = Engine::start(&db, &env).unwrap();
        Phone { db, env, engine }
    }

    fn call(&self, command: &str, payload: Value) -> Value {
        let text = self.engine.call(&self.db, &self.env, command, &payload.to_string()).unwrap();
        serde_json::from_str(&text).unwrap()
    }

    fn fail(&self, command: &str, payload: Value) -> Value {
        let error = self.engine.call(&self.db, &self.env, command, &payload.to_string());
        serde_json::from_str(&error.unwrap_err().to_json()).unwrap()
    }

    fn device_id(&self) -> String {
        self.engine.device_id().to_string()
    }
}

#[test]
fn a_reported_state_shows_up_in_the_status_with_camel_case_names() {
    let phone = Phone::new("a");
    phone.call("sync.report_state", json!({ "state": "idle", "accountEmail": "a@b.c" }));
    let status = phone.call("sync.status", json!({}));
    assert_eq!(status["state"], "idle");
    assert_eq!(status["accountEmail"], "a@b.c");
    assert_eq!(status["conflictCount"], 0);
    assert_eq!(status["deviceId"], phone.device_id());
}

#[test]
fn an_unknown_state_is_a_validation_error() {
    let error = Phone::new("a").fail("sync.report_state", json!({ "state": "connected" }));
    assert_eq!(error["code"], "validation");
}

#[test]
fn pending_events_can_be_listed_and_marked_as_uploaded() {
    let phone = Phone::new("a");
    phone.call("hub.load_demo_data", json!({}));
    let events = phone.call("sync.pending_events", json!({ "limit": 3 }));
    assert_eq!(events.as_array().unwrap().len(), 3);
    assert!(events[0]["eventId"].is_string() && events[0]["payload"].is_object());
    let ids: Vec<Value> = events.as_array().unwrap().iter().map(|e| e["eventId"].clone()).collect();
    assert_eq!(phone.call("sync.mark_synced", json!({ "eventIds": ids }))["count"], 3);
    let all = phone.call("sync.list_own_events", json!({}));
    let pending = phone.call("sync.pending_events", json!({}));
    assert_eq!(pending.as_array().unwrap().len(), all.as_array().unwrap().len() - 3);
}

#[test]
fn events_travel_from_one_phone_to_another_through_the_commands() {
    let (a, b) = (Phone::new("a"), Phone::new("b"));
    a.call("hub.load_demo_data", json!({}));
    let events = a.call("sync.list_own_events", json!({}));
    let report =
        b.call("sync.apply_remote", json!({ "deviceId": a.device_id(), "events": events }));
    assert!(report["applied"].as_u64().unwrap() > 0);
    assert_eq!(report["conflicts"], 0);
    let peers = b.call("sync.list_peers", json!({}));
    assert_eq!(peers[0]["deviceId"], a.device_id());
    assert_eq!(peers[0]["highWaterHlc"], report["highWater"]);
    assert_eq!(b.call("sync.pending_events", json!({})), json!([]));
}

#[test]
fn applying_events_from_this_phone_is_a_validation_error() {
    let phone = Phone::new("a");
    let own = json!({ "deviceId": phone.device_id(), "events": [] });
    assert_eq!(phone.fail("sync.apply_remote", own)["code"], "validation");
}

#[test]
fn conflicts_start_empty_and_resolving_an_unknown_one_is_not_found() {
    let phone = Phone::new("a");
    assert_eq!(phone.call("sync.list_conflicts", json!({})), json!([]));
    let error = phone.fail("sync.resolve_conflict", json!({ "id": "nope", "keep": "local" }));
    assert_eq!(error["code"], "not_found");
}

#[test]
fn an_export_can_be_inspected_and_imported_once_with_nothing_left_to_change() {
    let (a, b) = (Phone::new("a"), Phone::new("b"));
    a.call("hub.load_demo_data", json!({}));
    let json_text = a.call("hub.export_data", json!({})).to_string();
    let preview = b.call("hub.inspect_import", json!({ "json": json_text }));
    assert!(preview["rows"].as_u64().unwrap() > 0);
    let first = b.call("hub.import_data", json!({ "json": json_text }));
    assert!(first["applied"].as_u64().unwrap() > 0);
    let second = b.call("hub.import_data", json!({ "json": json_text }));
    assert_eq!(second["applied"], 0);
    assert_eq!(
        b.call("hub.export_data", json!({}))["tables"],
        a.call("hub.export_data", json!({}))["tables"]
    );
}

#[test]
fn a_file_that_is_not_an_export_is_a_validation_error() {
    let error = Phone::new("a").fail("hub.import_data", json!({ "json": "{\"hello\": 1}" }));
    assert_eq!(error["code"], "validation");
}

#[test]
fn the_export_names_its_format_and_version() {
    let export = Phone::new("a").call("hub.export_data", json!({}));
    assert_eq!(
        (export["format"].as_str(), export["version"].as_i64()),
        (Some("alavo-daily-export"), Some(1))
    );
}
