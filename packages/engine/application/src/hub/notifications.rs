use alavo_domain::hub::Notification;
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::hub::{
    insert_notification, list_notifications, mark_notifications_read,
};

use crate::context::Ctx;

const LIST_LIMIT: i64 = 50;

pub fn list(ctx: &Ctx) -> Result<Vec<Notification>, EngineError> {
    list_notifications(ctx.db, LIST_LIMIT)
}

pub fn mark_read(ctx: &Ctx, ids: Option<Vec<String>>) -> Result<u64, EngineError> {
    mark_notifications_read(ctx.db, ids.as_deref(), ctx.now_ms())
}

/// Adds a notification. When `dedupe_key` is given, the same key is never added twice, which
/// lets a module say "budget alert for food in 2026-10" without checking first.
pub fn add(
    ctx: &Ctx,
    module: &str,
    title: &str,
    body: &str,
    dedupe_key: Option<&str>,
) -> Result<bool, EngineError> {
    let notification = Notification {
        id: ctx.new_id(),
        module: module.to_string(),
        title: title.to_string(),
        body: body.to_string(),
        subject_id: None,
        created_at: ctx.now_ms(),
        read: false,
    };
    insert_notification(ctx.db, &notification, dedupe_key)
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
    fn a_repeated_dedupe_key_adds_only_one_notification() {
        with_ctx(|ctx| {
            assert!(add(ctx, "spending", "a", "b", Some("k")).unwrap());
            assert!(!add(ctx, "spending", "a", "b", Some("k")).unwrap());
            assert_eq!(list(ctx).unwrap().len(), 1);
        });
    }

    #[test]
    fn mark_read_without_ids_marks_everything() {
        with_ctx(|ctx| {
            add(ctx, "spending", "one", "x", None).unwrap();
            add(ctx, "recipes", "two", "y", None).unwrap();
            assert_eq!(mark_read(ctx, None).unwrap(), 2);
            assert!(list(ctx).unwrap().iter().all(|item| item.read));
        });
    }

    #[test]
    fn mark_read_with_ids_touches_only_those() {
        with_ctx(|ctx| {
            add(ctx, "spending", "one", "x", None).unwrap();
            add(ctx, "recipes", "two", "y", None).unwrap();
            let first = list(ctx).unwrap().remove(0);
            mark_read(ctx, Some(vec![first.id.clone()])).unwrap();
            let unread = list(ctx).unwrap().into_iter().filter(|item| !item.read).count();
            assert_eq!(unread, 1);
        });
    }
}
