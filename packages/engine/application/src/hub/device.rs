use alavo_domain::ports::{Database, Env};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::hlc::{Hlc, HlcClock};
use alavo_infrastructure::persistence::repositories::hub::{find_device, insert_device, save_last_hlc};

pub struct DeviceState {
    pub device_id: String,
    pub clock: HlcClock,
}

/// Loads this device's identity and clock, creating both on the first run.
pub fn load_or_create(db: &dyn Database, env: &dyn Env) -> Result<DeviceState, EngineError> {
    match find_device(db)? {
        Some(row) => Ok(DeviceState {
            device_id: row.device_id,
            clock: HlcClock::new(Hlc(row.last_hlc)),
        }),
        None => {
            let device_id = env.new_id();
            insert_device(db, &device_id, env.now_ms())?;
            Ok(DeviceState { device_id, clock: HlcClock::default() })
        }
    }
}

pub fn persist_clock(db: &dyn Database, clock: &HlcClock) -> Result<(), EngineError> {
    save_last_hlc(db, clock.last().value())
}

#[cfg(test)]
mod tests {
    use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};

    use super::*;

    #[test]
    fn first_run_creates_a_device_and_second_run_reuses_it() {
        let db = migrated_memory_db();
        let env = TestEnv::new();
        let first = load_or_create(&db, &env).unwrap();
        let second = load_or_create(&db, &env).unwrap();
        assert_eq!(first.device_id, second.device_id);
    }

    #[test]
    fn clock_survives_a_restart() {
        let db = migrated_memory_db();
        let env = TestEnv::new();
        let first = load_or_create(&db, &env).unwrap();
        let written = first.clock.tick(env.now_ms());
        persist_clock(&db, &first.clock).unwrap();
        let restored = load_or_create(&db, &env).unwrap();
        assert_eq!(restored.clock.last(), written);
    }
}
