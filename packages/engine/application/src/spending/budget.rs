use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::summary::daily_series;
use alavo_domain::spending::{
    BudgetLine, BudgetStatus, CategoryKind, MonthQuery, MonthSummary, SummaryParts,
};
use alavo_infrastructure::persistence::repositories::spending::categories::list_categories;
use alavo_infrastructure::persistence::repositories::spending::reports::{
    daily_expense_totals, month_totals, spent_by_category,
};
use alavo_infrastructure::persistence::repositories::spending::wallets::list_wallets;

use crate::context::Ctx;

pub fn month_summary(ctx: &Ctx, query: MonthQuery) -> Result<MonthSummary, EngineError> {
    let when = query.resolve()?;
    let daily_totals = daily_expense_totals(ctx.db, &when.month)?;
    let wallets = list_wallets(ctx.db)?;
    Ok(MonthSummary::build(SummaryParts {
        totals: month_totals(ctx.db, &when.month)?,
        previous_expense: month_totals(ctx.db, &when.previous_month()?)?.expense,
        total_balance: wallets.iter().map(|wallet| wallet.balance_vnd).sum(),
        daily_expense: daily_series(&daily_totals, when.daily_length()),
        month: when.month,
    }))
}

pub fn budget_status(ctx: &Ctx, query: MonthQuery) -> Result<BudgetStatus, EngineError> {
    let when = query.resolve()?;
    let spent = spent_by_category(ctx.db, &when.month)?;
    let categories = list_categories(ctx.db, Some(CategoryKind::Expense))?;
    let lines = categories
        .iter()
        .filter_map(|category| {
            let spent_here = spent.get(&category.id).copied().unwrap_or(Money(0));
            BudgetLine::for_category(category, spent_here)
        })
        .collect();
    Ok(BudgetStatus::from_lines(when.month.clone(), lines, when.days_left()))
}

#[cfg(test)]
mod tests {
    use alavo_domain::spending::{BudgetTone, NewTransaction, UpdateCategory};

    use crate::spending::test_support::{expense, income, Fixture, FOOD, TODAY};
    use crate::spending::{categories, transactions};

    use super::*;

    fn query(month: &str, today: &str) -> MonthQuery {
        MonthQuery { month: month.into(), today: today.into() }
    }

    fn record(fixture: &Fixture, input: NewTransaction) {
        transactions::record(&fixture.ctx(), input).unwrap();
    }

    fn in_category(category: &str, input: NewTransaction) -> NewTransaction {
        NewTransaction { category_id: category.into(), ..input }
    }

    fn set_budget(fixture: &Fixture, category: &str, budget: Option<i64>) {
        let change = UpdateCategory {
            position: None,
            id: category.into(),
            name: None,
            icon: None,
            budget_vnd: Some(budget.map(Money)),
        };
        categories::update(&fixture.ctx(), change).unwrap();
    }

    fn summary(fixture: &Fixture, month: &str, today: &str) -> MonthSummary {
        month_summary(&fixture.ctx(), query(month, today)).unwrap()
    }

    #[test]
    fn an_empty_month_has_zero_totals_and_no_delta() {
        let fixture = Fixture::new();
        let result = summary(&fixture, "2026-10", TODAY);
        assert_eq!(
            (result.income_vnd, result.expense_vnd, result.net_vnd),
            (Money(0), Money(0), Money(0))
        );
        assert_eq!(result.expense_delta_pct, None);
        assert_eq!(result.transaction_count, 0);
        assert_eq!(result.daily_expense_vnd.len(), 9);
        assert!(result.daily_expense_vnd.iter().all(|day| *day == Money(0)));
    }

    #[test]
    fn totals_split_income_from_expense_and_count_transactions() {
        let fixture = Fixture::new();
        record(&fixture, expense("Phở", 70_000, "2026-10-06"));
        record(&fixture, expense("Cà phê", 30_000, "2026-10-07"));
        record(&fixture, income("Lương", 500_000, "2026-10-05"));
        let result = summary(&fixture, "2026-10", TODAY);
        assert_eq!(result.income_vnd, Money(500_000));
        assert_eq!(result.expense_vnd, Money(100_000));
        assert_eq!(result.net_vnd, Money(400_000));
        assert_eq!(result.transaction_count, 3);
    }

    #[test]
    fn previous_month_spending_gives_the_delta() {
        let fixture = Fixture::new();
        record(&fixture, expense("Tháng trước", 100_000, "2026-09-30"));
        record(&fixture, expense("Tháng này", 150_000, "2026-10-01"));
        let result = summary(&fixture, "2026-10", TODAY);
        assert_eq!(result.previous_expense_vnd, Money(100_000));
        assert_eq!(result.expense_delta_pct, Some(0.5));
    }

    #[test]
    fn january_compares_with_december_of_the_previous_year() {
        let fixture = Fixture::new();
        record(&fixture, expense("Dec", 200_000, "2025-12-31"));
        record(&fixture, expense("Jan", 100_000, "2026-01-01"));
        let result = summary(&fixture, "2026-01", "2026-01-15");
        assert_eq!(result.previous_expense_vnd, Money(200_000));
        assert_eq!(result.expense_delta_pct, Some(-0.5));
    }

    #[test]
    fn delta_is_none_when_the_previous_month_had_no_spending() {
        let fixture = Fixture::new();
        record(&fixture, income("Lương", 500_000, "2026-09-05"));
        record(&fixture, expense("Phở", 70_000, "2026-10-06"));
        assert_eq!(summary(&fixture, "2026-10", TODAY).expense_delta_pct, None);
    }

    #[test]
    fn total_balance_is_every_wallet_balance_regardless_of_month() {
        let fixture = Fixture::new();
        record(&fixture, expense("Phở", 70_000, "2026-08-06"));
        record(&fixture, income("Lương", 500_000, "2026-09-05"));
        assert_eq!(summary(&fixture, "2026-10", TODAY).total_balance_vnd, Money(430_000));
    }

    #[test]
    fn daily_series_in_the_current_month_runs_to_today_and_skips_fixed_categories() {
        let fixture = Fixture::new();
        record(&fixture, expense("Cà phê", 65_000, "2026-10-09"));
        record(&fixture, in_category("category-fun", expense("Netflix", 260_000, "2026-10-09")));
        record(&fixture, expense("Phở", 70_000, "2026-10-01"));
        record(
            &fixture,
            in_category("category-home", expense("Thuê nhà", 7_500_000, "2026-10-05")),
        );
        record(&fixture, income("Lương", 9_000_000, "2026-10-05"));
        let days = summary(&fixture, "2026-10", TODAY).daily_expense_vnd;
        assert_eq!(days.len(), 9);
        assert_eq!(days[0], Money(70_000));
        assert_eq!(days[4], Money(0));
        assert_eq!(days[8], Money(325_000));
    }

    #[test]
    fn daily_series_of_another_month_covers_the_whole_month() {
        let fixture = Fixture::new();
        record(&fixture, expense("Phở", 70_000, "2026-09-30"));
        let september = summary(&fixture, "2026-09", TODAY).daily_expense_vnd;
        assert_eq!(september.len(), 30);
        assert_eq!(september[29], Money(70_000));
        assert_eq!(summary(&fixture, "2026-02", "2026-02-28").daily_expense_vnd.len(), 28);
        assert_eq!(summary(&fixture, "2024-02", "2026-10-09").daily_expense_vnd.len(), 29);
    }

    #[test]
    fn daily_series_on_the_first_of_the_month_has_one_day() {
        let fixture = Fixture::new();
        record(&fixture, expense("Phở", 70_000, "2026-10-01"));
        assert_eq!(
            summary(&fixture, "2026-10", "2026-10-01").daily_expense_vnd,
            vec![Money(70_000)]
        );
    }

    #[test]
    fn transactions_dated_after_today_still_count_in_the_totals() {
        let fixture = Fixture::new();
        record(&fixture, expense("Sắp tới", 70_000, "2026-10-20"));
        let result = summary(&fixture, "2026-10", TODAY);
        assert_eq!(result.expense_vnd, Money(70_000));
        assert_eq!(result.daily_expense_vnd.iter().copied().sum::<Money>(), Money(0));
    }

    #[test]
    fn deleted_transactions_do_not_count() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let saved = transactions::record(&ctx, expense("Phở", 70_000, "2026-10-06")).unwrap();
        transactions::delete(&ctx, &saved.id).unwrap();
        let result = summary(&fixture, "2026-10", TODAY);
        assert_eq!((result.expense_vnd, result.transaction_count), (Money(0), 0));
    }

    #[test]
    fn summary_rejects_a_bad_month_or_today() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        assert!(month_summary(&ctx, query("2026-13", TODAY)).is_err());
        assert!(month_summary(&ctx, query("2026-10", "2026-10-32")).is_err());
        assert!(budget_status(&ctx, query("oct", TODAY)).is_err());
    }

    #[test]
    fn budget_status_lists_only_categories_with_a_budget() {
        let fixture = Fixture::new();
        set_budget(&fixture, FOOD, Some(2_600_000));
        set_budget(&fixture, "category-transport", Some(800_000));
        record(&fixture, expense("Phở", 70_000, "2026-10-06"));
        let status = budget_status(&fixture.ctx(), query("2026-10", TODAY)).unwrap();
        let ids: Vec<&str> = status.lines.iter().map(|line| line.category_id.as_str()).collect();
        assert_eq!(ids, vec![FOOD, "category-transport"]);
        assert_eq!(status.lines[0].spent_vnd, Money(70_000));
        assert_eq!(status.lines[1].spent_vnd, Money(0));
    }

    #[test]
    fn budget_status_without_any_budget_is_empty() {
        let fixture = Fixture::new();
        let status = budget_status(&fixture.ctx(), query("2026-10", TODAY)).unwrap();
        assert!(status.lines.is_empty());
        assert_eq!((status.total_budget_vnd, status.per_day_vnd), (Money(0), Money(0)));
    }

    #[test]
    fn budget_status_totals_days_left_and_per_day_follow_the_lines() {
        let fixture = Fixture::new();
        set_budget(&fixture, FOOD, Some(2_600_000));
        set_budget(&fixture, "category-transport", Some(800_000));
        record(&fixture, expense("Siêu thị", 2_397_000, "2026-10-08"));
        record(&fixture, in_category("category-transport", expense("Xăng", 230_000, "2026-10-07")));
        let status = budget_status(&fixture.ctx(), query("2026-10", TODAY)).unwrap();
        assert_eq!(status.total_budget_vnd, Money(3_400_000));
        assert_eq!(status.total_spent_vnd, Money(2_627_000));
        assert_eq!(status.total_remaining_vnd, Money(773_000));
        assert_eq!(status.days_left, 22);
        assert_eq!(status.per_day_vnd, Money(35_136));
        assert_eq!(status.lines[0].tone, BudgetTone::Warn);
        assert_eq!(status.lines[1].tone, BudgetTone::Normal);
    }

    #[test]
    fn budget_status_marks_over_budget_lines_with_negative_remaining() {
        let fixture = Fixture::new();
        set_budget(&fixture, FOOD, Some(100_000));
        record(&fixture, expense("Tiệc", 150_000, "2026-10-06"));
        let line = &budget_status(&fixture.ctx(), query("2026-10", TODAY)).unwrap().lines[0];
        assert_eq!(line.tone, BudgetTone::Over);
        assert_eq!(line.remaining_vnd, Money(-50_000));
        assert!((line.pct - 1.5).abs() < f64::EPSILON);
    }

    #[test]
    fn budget_status_tone_boundaries_are_exact() {
        let fixture = Fixture::new();
        set_budget(&fixture, FOOD, Some(1_000_000));
        let tone_after = |amount: i64, date: &str| {
            record(&fixture, expense("x", amount, date));
            budget_status(&fixture.ctx(), query("2026-10", TODAY)).unwrap().lines[0].tone
        };
        assert_eq!(tone_after(849_999, "2026-10-01"), BudgetTone::Normal);
        assert_eq!(tone_after(1, "2026-10-02"), BudgetTone::Warn);
        assert_eq!(tone_after(150_000, "2026-10-03"), BudgetTone::Warn);
        assert_eq!(tone_after(1, "2026-10-04"), BudgetTone::Over);
    }

    #[test]
    fn budget_status_counts_only_the_requested_month_and_expenses() {
        let fixture = Fixture::new();
        set_budget(&fixture, FOOD, Some(1_000_000));
        record(&fixture, expense("Tháng trước", 900_000, "2026-09-30"));
        record(&fixture, expense("Tháng này", 100_000, "2026-10-01"));
        let line = &budget_status(&fixture.ctx(), query("2026-10", TODAY)).unwrap().lines[0];
        assert_eq!(line.spent_vnd, Money(100_000));
        let september = budget_status(&fixture.ctx(), query("2026-09", TODAY)).unwrap();
        assert_eq!(september.lines[0].spent_vnd, Money(900_000));
        assert_eq!(september.days_left, 0);
        assert_eq!(september.per_day_vnd, Money(0));
    }

    #[test]
    fn days_left_is_zero_on_the_last_day_and_the_whole_month_in_the_future() {
        let fixture = Fixture::new();
        set_budget(&fixture, FOOD, Some(1_000_000));
        let ctx = fixture.ctx();
        assert_eq!(budget_status(&ctx, query("2026-10", "2026-10-31")).unwrap().days_left, 0);
        assert_eq!(budget_status(&ctx, query("2026-10", "2026-10-01")).unwrap().days_left, 30);
        assert_eq!(budget_status(&ctx, query("2026-11", TODAY)).unwrap().days_left, 30);
    }

    #[test]
    fn a_fixed_category_with_a_budget_still_appears_in_the_budget_lines() {
        let fixture = Fixture::new();
        set_budget(&fixture, "category-home", Some(8_000_000));
        record(
            &fixture,
            in_category("category-home", expense("Thuê nhà", 7_500_000, "2026-10-05")),
        );
        let status = budget_status(&fixture.ctx(), query("2026-10", TODAY)).unwrap();
        assert_eq!(status.lines[0].category_id, "category-home");
        assert_eq!(status.lines[0].spent_vnd, Money(7_500_000));
    }
}
