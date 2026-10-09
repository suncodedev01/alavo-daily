use alavo_application::hub::device;
use alavo_application::Ctx;
use alavo_domain::ports::{Database, Env};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::hlc::HlcClock;
use alavo_infrastructure::persistence::migrations;

use crate::dispatch;

/// The running engine: this device's identity and clock. It owns no database, because the web
/// build and the native build hand it a different one on every call.
pub struct Engine {
    device_id: String,
    clock: HlcClock,
}

impl Engine {
    /// Migrates the database and loads (or creates) this device's identity.
    pub fn start(db: &dyn Database, env: &dyn Env) -> Result<Engine, EngineError> {
        migrations::run(db, env.now_ms())?;
        let state = device::load_or_create(db, env)?;
        Ok(Engine { device_id: state.device_id, clock: state.clock })
    }

    pub fn device_id(&self) -> &str {
        &self.device_id
    }

    /// Runs one command and returns its JSON result, or an error whose `to_json()` is what
    /// JavaScript receives.
    pub fn call(
        &self,
        db: &dyn Database,
        env: &dyn Env,
        command: &str,
        payload: &str,
    ) -> Result<String, EngineError> {
        let ctx = Ctx::new(db, env, &self.clock, &self.device_id);
        let before = self.clock.last();
        let result = dispatch::handle(&ctx, command, payload);
        if self.clock.last() != before {
            device::persist_clock(db, &self.clock)?;
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use alavo_infrastructure::persistence::native_db::NativeDb;
    use alavo_infrastructure::testing::TestEnv;
    use serde_json::Value;

    use super::*;

    fn started() -> (NativeDb, TestEnv, Engine) {
        let db = NativeDb::in_memory().unwrap();
        let env = TestEnv::new();
        let engine = Engine::start(&db, &env).unwrap();
        (db, env, engine)
    }

    fn call(parts: &(NativeDb, TestEnv, Engine), command: &str, payload: &str) -> Value {
        let (db, env, engine) = parts;
        let json = engine.call(db, env, command, payload).unwrap();
        serde_json::from_str(&json).unwrap()
    }

    #[test]
    fn start_is_idempotent_and_keeps_the_device_id() {
        let (db, env, first) = started();
        let second = Engine::start(&db, &env).unwrap();
        assert_eq!(first.device_id(), second.device_id());
    }

    #[test]
    fn unknown_commands_fail_with_a_typed_error() {
        let (db, env, engine) = started();
        let error = engine.call(&db, &env, "nope.nothing", "{}").unwrap_err();
        assert_eq!(error.to_json(), r#"{"code":"unknown_command","message":"unknown command nope.nothing"}"#);
    }

    #[test]
    fn malformed_payloads_are_validation_errors() {
        let (db, env, engine) = started();
        let error = engine.call(&db, &env, "hub.update_settings", "{not json").unwrap_err();
        assert!(error.to_json().contains("validation"));
    }

    #[test]
    fn settings_round_trip_through_the_command_interface() {
        let parts = started();
        let saved = call(&parts, "hub.update_settings", r#"{"theme":"dark","householdSize":3}"#);
        assert_eq!(saved["theme"], "dark");
        let loaded = call(&parts, "hub.get_settings", "");
        assert_eq!(loaded["householdSize"], 3);
        assert_eq!(loaded["pinnedModules"][0], "spending");
    }

    #[test]
    fn notification_rules_can_be_listed_and_updated() {
        let parts = started();
        let rules = call(&parts, "hub.list_notification_rules", "");
        assert!(rules.as_array().unwrap().len() >= 7);
        let updated = call(
            &parts,
            "hub.update_notification_rule",
            r#"{"id":"recipes.cook_reminder","enabled":false}"#,
        );
        assert_eq!(updated["enabled"], false);
    }

    #[test]
    fn export_and_sync_status_answer_on_a_fresh_database() {
        let parts = started();
        assert_eq!(call(&parts, "hub.export_data", "")["version"], 1);
        assert_eq!(call(&parts, "sync.status", "")["state"], "off");
        assert!(call(&parts, "hub.device_info", "")["deviceId"].is_string());
    }

    #[test]
    fn marking_notifications_read_reports_a_count() {
        let parts = started();
        assert_eq!(call(&parts, "hub.mark_notifications_read", "")["count"], 0);
    }
}
