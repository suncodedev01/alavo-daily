use alavo_domain::shared::date::Date;
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{
    today_utc, NewGoal, NewTransaction, NewWallet, SaveBill, UpdateCategory, UpdateWallet,
};
use alavo_infrastructure::persistence::repositories::hub::{get_setting, set_setting};
use alavo_infrastructure::persistence::repositories::spending::wallets::find_wallet;

use crate::context::Ctx;
use crate::spending::demo_data::{
    transactions_total, DemoBill, DemoGoal, DemoTransaction, DemoWallet, BILLS_DUE, BUDGETS, GOALS,
    TRANSACTIONS, WALLETS,
};
use crate::spending::{bills, categories, goals, transactions, wallets};

const DEMO_KEY: &str = "demo.spending";

type WalletIds = Vec<(&'static str, String)>;

pub fn load(ctx: &Ctx) -> Result<(), EngineError> {
    if get_setting(ctx.db, DEMO_KEY)?.is_some() {
        return Ok(());
    }
    ctx.transaction(|| {
        let today = today_utc(ctx.now_ms());
        set_budgets(ctx)?;
        let wallet_ids = create_wallets(ctx)?;
        record_transactions(ctx, today, &wallet_ids)?;
        create_goals(ctx, today)?;
        create_bills(ctx)?;
        set_setting(ctx.db, DEMO_KEY, "true", ctx.now_ms())
    })
}

fn set_budgets(ctx: &Ctx) -> Result<(), EngineError> {
    for (category_id, budget_vnd) in BUDGETS {
        let change = UpdateCategory {
            id: category_id.to_string(),
            name: None,
            icon: None,
            budget_vnd: Some(Some(Money(budget_vnd))),
        };
        categories::update(ctx, change)?;
    }
    Ok(())
}

fn create_wallets(ctx: &Ctx) -> Result<WalletIds, EngineError> {
    WALLETS.iter().map(|demo| Ok((demo.key, create_wallet(ctx, demo)?))).collect()
}

fn create_wallet(ctx: &Ctx, demo: &DemoWallet) -> Result<String, EngineError> {
    let opening = Money(demo.balance_vnd - transactions_total(demo.key));
    if find_wallet(ctx.db, demo.seeded_id)?.is_some() {
        let change = UpdateWallet {
            id: demo.seeded_id.to_string(),
            name: Some(demo.name.to_string()),
            kind: Some(demo.kind),
            opening_balance_vnd: Some(opening),
        };
        return wallets::update(ctx, change).map(|wallet| wallet.id);
    }
    let input =
        NewWallet { name: demo.name.to_string(), kind: demo.kind, opening_balance_vnd: opening };
    wallets::create(ctx, input).map(|wallet| wallet.id)
}

fn record_transactions(ctx: &Ctx, today: Date, wallet_ids: &WalletIds) -> Result<(), EngineError> {
    for demo in TRANSACTIONS.iter().rev() {
        transactions::record(ctx, new_transaction(demo, today, wallet_ids))?;
    }
    Ok(())
}

fn new_transaction(demo: &DemoTransaction, today: Date, wallet_ids: &WalletIds) -> NewTransaction {
    let day = demo.day.clamp(1, today.day);
    let wallet_id = wallet_ids.iter().find(|(key, _)| *key == demo.wallet_key);
    NewTransaction {
        title: demo.title.to_string(),
        amount_vnd: Money(demo.amount_vnd),
        category_id: demo.category_id.to_string(),
        wallet_id: wallet_id.map(|(_, id)| id.clone()).unwrap_or_default(),
        occurred_on: Date { day, ..today }.to_text(),
        note: String::new(),
        recurring_rule: demo.monthly.then(|| format!("monthly:{}", demo.day)),
    }
}

fn create_goals(ctx: &Ctx, today: Date) -> Result<(), EngineError> {
    for demo in &GOALS {
        goals::create(ctx, new_goal(demo, today))?;
    }
    Ok(())
}

fn new_goal(demo: &DemoGoal, today: Date) -> NewGoal {
    NewGoal {
        name: demo.name.to_string(),
        icon: demo.icon.to_string(),
        target_vnd: Money(demo.target_vnd),
        saved_vnd: Some(Money(demo.saved_vnd)),
        due_on: demo.due_in_days.map(|days| today.add_days(days).to_text()),
    }
}

fn create_bills(ctx: &Ctx) -> Result<(), EngineError> {
    for demo in &BILLS_DUE {
        bills::save(ctx, new_bill(demo))?;
    }
    Ok(())
}

fn new_bill(demo: &DemoBill) -> SaveBill {
    SaveBill {
        id: None,
        title: demo.title.to_string(),
        icon: demo.icon.to_string(),
        amount_vnd: Money(demo.amount_vnd),
        day_of_month: demo.day_of_month,
        active: None,
    }
}

#[cfg(test)]
mod tests {
    use alavo_domain::spending::{BudgetTone, MonthQuery, TransactionFilter, WalletKind};

    use crate::spending::budget;
    use crate::spending::test_support::{Fixture, TODAY};

    use super::*;

    const DAY_MS: i64 = 86_400_000;
    const CASH_WALLET_ID: &str = "wallet-cash";

    fn loaded() -> Fixture {
        let fixture = Fixture::new();
        load(&fixture.ctx()).unwrap();
        fixture
    }

    fn all_transactions(fixture: &Fixture) -> Vec<alavo_domain::spending::Transaction> {
        transactions::list(&fixture.ctx(), TransactionFilter::default()).unwrap()
    }

    fn query() -> MonthQuery {
        MonthQuery { month: "2026-10".into(), today: TODAY.into() }
    }

    #[test]
    fn load_creates_the_sample_wallets_transactions_goals_and_bills() {
        let fixture = loaded();
        let ctx = fixture.ctx();
        assert_eq!(wallets::list(&ctx).unwrap().len(), 3);
        assert_eq!(all_transactions(&fixture).len(), 23);
        assert_eq!(goals::list(&ctx).unwrap().len(), 3);
        assert_eq!(bills::list(&ctx).unwrap().len(), 3);
    }

    #[test]
    fn load_sets_the_mockup_budgets_and_leaves_housing_and_income_without_one() {
        let fixture = loaded();
        let all = categories::list(&fixture.ctx(), None).unwrap();
        let budget_of =
            |id: &str| all.iter().find(|category| category.id == id).unwrap().budget_vnd;
        assert_eq!(budget_of("category-food"), Some(Money(2_600_000)));
        assert_eq!(budget_of("category-bills"), Some(Money(1_200_000)));
        assert_eq!(budget_of("category-home"), None);
        assert_eq!(budget_of("category-income"), None);
    }

    #[test]
    fn wallet_balances_match_the_mockup() {
        let fixture = loaded();
        let balance_of = |name: &str| {
            let all = wallets::list(&fixture.ctx()).unwrap();
            all.into_iter().find(|wallet| wallet.name == name).unwrap().balance_vnd
        };
        assert_eq!(balance_of("Techcombank"), Money(38_420_000));
        assert_eq!(balance_of("Ví MoMo"), Money(1_250_000));
        assert_eq!(balance_of("Tiền mặt"), Money(820_000));
        let kinds: Vec<WalletKind> =
            wallets::list(&fixture.ctx()).unwrap().into_iter().map(|wallet| wallet.kind).collect();
        assert_eq!(kinds, vec![WalletKind::Cash, WalletKind::Bank, WalletKind::Ewallet]);
    }

    #[test]
    fn the_month_summary_adds_up_the_sample_transactions() {
        let fixture = loaded();
        let summary = budget::month_summary(&fixture.ctx(), query()).unwrap();
        assert_eq!(summary.transaction_count, 23);
        assert_eq!(summary.income_vnd, Money(32_500_000));
        assert_eq!(summary.expense_vnd, Money(12_871_000));
        assert_eq!(summary.daily_expense_vnd.len(), 9);
        assert_eq!(summary.daily_expense_vnd[4], Money(640_000));
    }

    #[test]
    fn food_lands_at_92_percent_and_raised_one_warning_when_it_crossed_85() {
        let fixture = loaded();
        let status = budget::budget_status(&fixture.ctx(), query()).unwrap();
        let food = status.lines.iter().find(|line| line.category_id == "category-food").unwrap();
        assert_eq!(food.spent_vnd, Money(2_397_000));
        assert_eq!(food.tone, BudgetTone::Warn);
        assert_eq!(status.lines.len(), 6);
        assert_eq!(fixture.notifications(), vec!["Ăn uống đã dùng 90% ngân sách"]);
    }

    #[test]
    fn the_list_shows_the_newest_sample_transaction_first_like_the_mockup() {
        let fixture = loaded();
        let all = all_transactions(&fixture);
        assert_eq!(all[0].title, "Highlands Coffee");
        assert_eq!(all[1].title, "Grab đi làm");
        assert_eq!(all[2].title, "Co.opmart Nguyễn Đình Chiểu");
        assert_eq!(all[22].title, "Cơm trưa văn phòng");
        assert_eq!(all[0].occurred_on, "2026-10-09");
        assert_eq!(all[22].occurred_on, "2026-10-01");
    }

    #[test]
    fn recurring_samples_carry_a_monthly_rule() {
        let fixture = loaded();
        let filter = TransactionFilter { recurring_only: Some(true), ..Default::default() };
        let recurring = transactions::list(&fixture.ctx(), filter).unwrap();
        assert_eq!(recurring.len(), 6);
        let netflix = recurring.iter().find(|transaction| transaction.title == "Netflix").unwrap();
        assert_eq!(netflix.recurring_rule.as_deref(), Some("monthly:8"));
    }

    #[test]
    fn loading_twice_changes_nothing_the_second_time() {
        let fixture = loaded();
        let counts = |fixture: &Fixture| {
            (
                fixture.count("SELECT COUNT(*) AS total FROM spending_transactions"),
                fixture.count("SELECT COUNT(*) AS total FROM spending_wallets"),
                fixture.count("SELECT COUNT(*) AS total FROM spending_goals"),
                fixture.count("SELECT COUNT(*) AS total FROM spending_bills"),
                fixture.count("SELECT COUNT(*) AS total FROM hub_delta_events"),
                fixture.count("SELECT COUNT(*) AS total FROM hub_notifications"),
            )
        };
        let before = counts(&fixture);
        load(&fixture.ctx()).unwrap();
        assert_eq!(counts(&fixture), before);
        assert_eq!(before.0, 23);
    }

    #[test]
    fn load_remembers_itself_in_a_hub_setting() {
        let fixture = Fixture::new();
        assert_eq!(get_setting(fixture.db(), DEMO_KEY).unwrap(), None);
        load(&fixture.ctx()).unwrap();
        assert!(get_setting(fixture.db(), DEMO_KEY).unwrap().is_some());
    }

    #[test]
    fn every_sample_write_is_logged_for_sync() {
        let fixture = loaded();
        assert_eq!(fixture.events("transaction").len(), 23);
        assert_eq!(fixture.events("goal").len(), 3);
        assert_eq!(fixture.events("bill").len(), 3);
        assert_eq!(fixture.events("wallet").len(), 3);
        assert_eq!(fixture.events("category").len(), 6);
    }

    #[test]
    fn early_in_the_month_the_sample_days_are_squeezed_up_to_today() {
        let fixture = Fixture::new();
        fixture.advance(-6 * DAY_MS);
        load(&fixture.ctx()).unwrap();
        let dates: Vec<String> = all_transactions(&fixture)
            .into_iter()
            .map(|transaction| transaction.occurred_on)
            .collect();
        assert!(dates
            .iter()
            .all(|date| date.as_str() >= "2026-10-01" && date.as_str() <= "2026-10-03"));
        assert_eq!(dates[0], "2026-10-03");
        assert_eq!(dates.last().map(String::as_str), Some("2026-10-01"));
    }

    #[test]
    fn on_the_first_of_the_month_every_sample_transaction_falls_on_day_one() {
        let fixture = Fixture::new();
        fixture.advance(-8 * DAY_MS);
        load(&fixture.ctx()).unwrap();
        assert!(all_transactions(&fixture)
            .iter()
            .all(|transaction| transaction.occurred_on == "2026-10-01"));
    }

    #[test]
    fn sample_goals_get_due_dates_relative_to_today() {
        let fixture = loaded();
        let all = goals::list(&fixture.ctx()).unwrap();
        assert_eq!(all[0].due_on, None);
        assert_eq!(all[1].due_on.as_deref(), Some("2026-12-18"));
        assert_eq!(all[2].due_on.as_deref(), Some("2027-04-07"));
    }

    #[test]
    fn the_sample_bank_and_ewallet_reuse_the_built_in_payment_methods() {
        let fixture = loaded();
        let ctx = fixture.ctx();
        let bank = wallets::require(&ctx, "wallet-bank").unwrap();
        let ewallet = wallets::require(&ctx, "wallet-ewallet").unwrap();
        assert_eq!((bank.name.as_str(), bank.balance_vnd), ("Techcombank", Money(38_420_000)));
        assert_eq!((ewallet.name.as_str(), ewallet.balance_vnd), ("Ví MoMo", Money(1_250_000)));
        assert_eq!(wallets::list(&ctx).unwrap().len(), 3);
    }

    #[test]
    fn a_deleted_built_in_cash_wallet_is_replaced_by_a_new_one() {
        let fixture = Fixture::new();
        wallets::delete(&fixture.ctx(), alavo_domain::spending::DeleteWallet::only(CASH_WALLET_ID)).unwrap();
        load(&fixture.ctx()).unwrap();
        let all = wallets::list(&fixture.ctx()).unwrap();
        assert_eq!(all.len(), 3);
        assert!(all.iter().any(|wallet| wallet.name == "Tiền mặt" && wallet.id != CASH_WALLET_ID));
    }
}
