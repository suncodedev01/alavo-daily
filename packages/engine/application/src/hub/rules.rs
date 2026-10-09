use alavo_domain::hub::{NotificationRule, UpdateNotificationRule};
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::hub::{find_rule, list_rules, update_rule};

use crate::context::Ctx;

pub fn list(ctx: &Ctx) -> Result<Vec<NotificationRule>, EngineError> {
    list_rules(ctx.db)
}

pub fn update(ctx: &Ctx, input: UpdateNotificationRule) -> Result<NotificationRule, EngineError> {
    let current =
        find_rule(ctx.db, &input.id)?.ok_or_else(|| EngineError::not_found("rule", &input.id))?;
    let time = validated_time(&current, input.time)?;
    let enabled = input.enabled.unwrap_or(current.enabled);
    update_rule(ctx.db, &current.id, enabled, time.as_deref())?;
    Ok(NotificationRule { enabled, time, ..current })
}

fn validated_time(
    current: &NotificationRule,
    requested: Option<String>,
) -> Result<Option<String>, EngineError> {
    match requested {
        None => Ok(current.time.clone()),
        Some(time) if current.kind == "time" && is_clock_time(&time) => Ok(Some(time)),
        Some(_) => Err(EngineError::validation("time must be HH:MM on a timed rule")),
    }
}

fn is_clock_time(value: &str) -> bool {
    let mut parts = value.split(':');
    let hours = parts.next().and_then(|part| part.parse::<u32>().ok());
    let minutes = parts.next().and_then(|part| part.parse::<u32>().ok());
    matches!((hours, minutes, parts.next()), (Some(h), Some(m), None) if h < 24 && m < 60)
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

    fn change(id: &str, enabled: Option<bool>, time: Option<&str>) -> UpdateNotificationRule {
        UpdateNotificationRule { id: id.into(), enabled, time: time.map(str::to_string) }
    }

    #[test]
    fn default_rules_are_seeded_for_both_modules() {
        with_ctx(|ctx| {
            let rules = list(ctx).unwrap();
            assert!(rules.iter().any(|rule| rule.module == "spending"));
            assert!(rules.iter().any(|rule| rule.module == "recipes"));
        });
    }

    #[test]
    fn the_morning_menu_rule_starts_at_six_and_is_on() {
        with_ctx(|ctx| {
            let rule = list(ctx).unwrap().into_iter().find(|rule| rule.id == "recipes.morning_menu");
            let rule = rule.expect("morning menu rule is seeded");
            assert_eq!((rule.enabled, rule.time.as_deref()), (true, Some("06:00")));
            assert_eq!(rule.kind, "time");
        });
    }

    #[test]
    fn update_changes_enabled_and_time() {
        with_ctx(|ctx| {
            let updated =
                update(ctx, change("recipes.cook_reminder", Some(false), Some("18:15"))).unwrap();
            assert!(!updated.enabled);
            assert_eq!(updated.time.as_deref(), Some("18:15"));
        });
    }

    #[test]
    fn invalid_time_is_rejected() {
        with_ctx(|ctx| {
            assert!(update(ctx, change("recipes.cook_reminder", None, Some("25:00"))).is_err());
            assert!(update(ctx, change("spending.budget_alert", None, Some("09:00"))).is_err());
        });
    }

    #[test]
    fn unknown_rule_is_not_found() {
        with_ctx(|ctx| assert!(update(ctx, change("nope", Some(true), None)).is_err()));
    }
}
