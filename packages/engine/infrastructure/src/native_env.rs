use std::time::{SystemTime, UNIX_EPOCH};

use alavo_domain::ports::Env;

/// The real clock and real random ids, for the native app.
pub struct NativeEnv;

impl Env for NativeEnv {
    fn now_ms(&self) -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|elapsed| elapsed.as_millis() as i64)
            .unwrap_or_default()
    }

    fn new_id(&self) -> String {
        uuid::Uuid::new_v4().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_unique_uuids_and_the_clock_is_recent() {
        let env = NativeEnv;
        let (first, second) = (env.new_id(), env.new_id());
        assert_ne!(first, second);
        assert_eq!(first.len(), 36);
        assert!(env.now_ms() > 1_767_225_600_000);
    }
}
