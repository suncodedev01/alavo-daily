use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{
    today_utc, BudgetAlert, BudgetLine, BudgetTone, Category, MonthContext,
};
use alavo_infrastructure::persistence::repositories::hub::find_rule;
use alavo_infrastructure::persistence::repositories::spending::reports::category_spent;

use crate::context::Ctx;
use crate::hub::notifications;

const BUDGET_ALERT_RULE: &str = "spending.budget_alert";

pub struct BudgetWatch {
    category: Category,
    month: String,
    before: BudgetTone,
}

impl BudgetWatch {
    pub fn start(ctx: &Ctx, category: Category, month: String) -> Result<BudgetWatch, EngineError> {
        let before = tone_in_month(ctx, &category, &month)?;
        Ok(BudgetWatch { category, month, before })
    }

    pub fn finish(self, ctx: &Ctx) -> Result<(), EngineError> {
        let Some(line) = line_in_month(ctx, &self.category, &self.month)? else {
            return Ok(());
        };
        if line.tone <= self.before || !alerts_enabled(ctx)? {
            return Ok(());
        }
        let days_left = MonthContext::new(&self.month, today_utc(ctx.now_ms()))?.days_left();
        match BudgetAlert::for_line(&line, &self.month, days_left) {
            Some(alert) => add_notification(ctx, &alert),
            None => Ok(()),
        }
    }
}

fn tone_in_month(ctx: &Ctx, category: &Category, month: &str) -> Result<BudgetTone, EngineError> {
    let line = line_in_month(ctx, category, month)?;
    Ok(line.map_or(BudgetTone::Normal, |line| line.tone))
}

fn line_in_month(
    ctx: &Ctx,
    category: &Category,
    month: &str,
) -> Result<Option<BudgetLine>, EngineError> {
    if category.budget_vnd.is_none() {
        return Ok(None);
    }
    let spent = category_spent(ctx.db, &category.id, month)?;
    Ok(BudgetLine::for_category(category, spent))
}

fn alerts_enabled(ctx: &Ctx) -> Result<bool, EngineError> {
    Ok(find_rule(ctx.db, BUDGET_ALERT_RULE)?.is_none_or(|rule| rule.enabled))
}

fn add_notification(ctx: &Ctx, alert: &BudgetAlert) -> Result<(), EngineError> {
    notifications::add(ctx, "spending", &alert.title, &alert.body, Some(&alert.dedupe_key))
        .map(|_| ())
}

#[cfg(test)]
mod tests {
    use alavo_domain::hub::UpdateNotificationRule;
    use alavo_domain::shared::money::Money;
    use alavo_domain::spending::UpdateCategory;

    use crate::hub::rules;
    use crate::spending::test_support::{expense, income, Fixture, FOOD, TODAY};
    use crate::spending::{categories, transactions};

    use super::*;

    const MONTH_START: &str = "2026-10-01";

    fn set_food_budget(fixture: &Fixture, budget: i64) {
        let change = UpdateCategory {
            position: None,
            id: FOOD.into(),
            name: None,
            icon: None,
            budget_vnd: Some(Some(Money(budget))),
        };
        categories::update(&fixture.ctx(), change).unwrap();
    }

    fn spend(fixture: &Fixture, amount: i64, date: &str) {
        transactions::record(&fixture.ctx(), expense("Ăn", amount, date)).unwrap();
    }

    #[test]
    fn nothing_is_sent_below_85_percent() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        spend(&fixture, 849_000, TODAY);
        assert!(fixture.notifications().is_empty());
    }

    #[test]
    fn exactly_85_percent_sends_one_warning_with_the_remaining_money() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        spend(&fixture, 850_000, TODAY);
        assert_eq!(fixture.notifications(), vec!["Ăn uống đã dùng 85% ngân sách"]);
        let body = notifications::list(&fixture.ctx()).unwrap().remove(0).body;
        assert_eq!(body, "Còn 150.000 ₫ cho 22 ngày tới.");
    }

    #[test]
    fn the_warning_names_the_category_it_is_about() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        spend(&fixture, 850_000, TODAY);
        let notice = notifications::list(&fixture.ctx()).unwrap().remove(0);
        assert_eq!(notice.subject_id.as_deref(), Some(FOOD));
    }

    #[test]
    fn the_warning_is_not_repeated_by_later_expenses_below_the_budget() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        spend(&fixture, 850_000, TODAY);
        spend(&fixture, 10_000, TODAY);
        spend(&fixture, 10_000, TODAY);
        assert_eq!(fixture.notifications().len(), 1);
    }

    #[test]
    fn exactly_100_percent_is_still_a_warning_and_one_more_dong_is_over() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        spend(&fixture, 1_000_000, TODAY);
        assert_eq!(fixture.notifications(), vec!["Ăn uống đã dùng 100% ngân sách"]);
        spend(&fixture, 1, TODAY);
        assert_eq!(fixture.notifications().len(), 2);
        assert_eq!(fixture.notifications()[1], "Ăn uống đã vượt ngân sách");
    }

    #[test]
    fn jumping_straight_over_the_budget_sends_only_the_over_notification() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        spend(&fixture, 1_200_000, TODAY);
        assert_eq!(fixture.notifications(), vec!["Ăn uống đã vượt ngân sách"]);
        spend(&fixture, 50_000, TODAY);
        assert_eq!(fixture.notifications().len(), 1);
    }

    #[test]
    fn warn_then_over_sends_two_distinct_notifications_with_their_own_keys() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        spend(&fixture, 900_000, TODAY);
        spend(&fixture, 200_000, TODAY);
        let keys =
            fixture.count("SELECT COUNT(DISTINCT dedupe_key) AS total FROM hub_notifications");
        assert_eq!(keys, 2);
        let warn_key = r#"
            SELECT COUNT(*) AS total
            FROM hub_notifications
            WHERE dedupe_key = 'budget:category-food:2026-10:warn'
        "#;
        assert_eq!(fixture.count(warn_key), 1);
    }

    #[test]
    fn deleting_and_re_recording_the_same_crossing_does_not_duplicate_it() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        let ctx = fixture.ctx();
        let first = transactions::record(&ctx, expense("Ăn", 900_000, TODAY)).unwrap();
        transactions::delete(&ctx, &first.id).unwrap();
        transactions::record(&ctx, expense("Ăn", 900_000, TODAY)).unwrap();
        assert_eq!(fixture.notifications().len(), 1);
    }

    #[test]
    fn the_budget_is_counted_per_month() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        spend(&fixture, 900_000, "2026-09-30");
        spend(&fixture, 100_000, MONTH_START);
        assert_eq!(fixture.notifications().len(), 1);
        spend(&fixture, 800_000, MONTH_START);
        let sql =
            "SELECT COUNT(*) AS total FROM hub_notifications WHERE dedupe_key LIKE '%:2026-09:%'";
        assert_eq!(fixture.count(sql), 1);
        assert_eq!(fixture.notifications().len(), 2);
    }

    #[test]
    fn a_category_without_a_budget_never_notifies() {
        let fixture = Fixture::new();
        spend(&fixture, 999_000_000, TODAY);
        assert!(fixture.notifications().is_empty());
    }

    #[test]
    fn income_never_notifies() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000);
        transactions::record(&fixture.ctx(), income("Lương", 5_000_000, TODAY)).unwrap();
        assert!(fixture.notifications().is_empty());
    }

    #[test]
    fn a_disabled_budget_alert_rule_silences_the_notification() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        let off = UpdateNotificationRule {
            id: BUDGET_ALERT_RULE.into(),
            enabled: Some(false),
            time: None,
        };
        rules::update(&fixture.ctx(), off).unwrap();
        spend(&fixture, 900_000, TODAY);
        assert!(fixture.notifications().is_empty());
    }

    #[test]
    fn a_past_month_says_how_much_is_left_without_a_day_count() {
        let fixture = Fixture::new();
        set_food_budget(&fixture, 1_000_000);
        spend(&fixture, 900_000, "2026-09-12");
        let body = notifications::list(&fixture.ctx()).unwrap().remove(0).body;
        assert_eq!(body, "Còn 100.000 ₫.");
    }
}
