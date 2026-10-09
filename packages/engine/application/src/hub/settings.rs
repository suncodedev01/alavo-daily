use alavo_domain::hub::{Settings, UpdateSettings};
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::hub::{get_setting, set_setting};

use crate::context::Ctx;

const SETTINGS_KEY: &str = "app";

pub fn get(ctx: &Ctx) -> Result<Settings, EngineError> {
    match get_setting(ctx.db, SETTINGS_KEY)? {
        Some(json) => Ok(serde_json::from_str(&json).unwrap_or_default()),
        None => Ok(Settings::default()),
    }
}

pub fn update(ctx: &Ctx, update: UpdateSettings) -> Result<Settings, EngineError> {
    let next = get(ctx)?.apply(update);
    set_setting(ctx.db, SETTINGS_KEY, &serde_json::to_string(&next)?, ctx.now_ms())?;
    Ok(next)
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::hlc::HlcClock;
    use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};

    use super::*;

    fn with_ctx<T>(work: impl FnOnce(&Ctx) -> T) -> T {
        let db = migrated_memory_db();
        let env = TestEnv::new();
        let clock = HlcClock::default();
        work(&Ctx::new(&db, &env, &clock, "device-a"))
    }

    #[test]
    fn defaults_are_returned_before_anything_is_saved() {
        with_ctx(|ctx| assert_eq!(get(ctx).unwrap(), Settings::default()));
    }

    #[test]
    fn update_persists_only_the_given_fields() {
        with_ctx(|ctx| {
            update(ctx, UpdateSettings { theme: Some("dark".into()), ..Default::default() })
                .unwrap();
            let saved = get(ctx).unwrap();
            assert_eq!(saved.theme, "dark");
            assert_eq!(saved.household_size, 2);
        });
    }

    #[test]
    fn recent_modules_keep_at_most_four() {
        with_ctx(|ctx| {
            let many = (0..9).map(|n| format!("m{n}")).collect();
            let saved = update(
                ctx,
                UpdateSettings { recent_modules: Some(many), ..Default::default() },
            )
            .unwrap();
            assert_eq!(saved.recent_modules.len(), 4);
        });
    }
}
