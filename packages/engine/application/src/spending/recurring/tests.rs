use alavo_domain::ports::Database;
use alavo_domain::shared::error::ErrorCode;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{
    NewTransaction, TransactionFilter, UpdateCategory, UpdateTransaction,
};

use crate::spending::test_support::{expense, income, Fixture, FOOD, TODAY};
use crate::spending::{categories, transactions};

use super::*;

fn generate_on(fixture: &Fixture, today: &str) -> usize {
    generate(&fixture.ctx(), GenerateRecurring { today: today.into() }).unwrap().created
}

fn monthly(title: &str, amount: i64, date: &str, day: u32) -> NewTransaction {
    NewTransaction {
        recurring_rule: Some(format!("monthly:{day}")),
        ..expense(title, amount, date)
    }
}

fn record_template(fixture: &Fixture, input: NewTransaction) -> Transaction {
    transactions::record(&fixture.ctx(), input).unwrap()
}

fn occurrences_of(fixture: &Fixture, template: &Transaction) -> Vec<Transaction> {
    let filter = TransactionFilter { recurring_only: Some(true), ..Default::default() };
    let all = transactions::list(&fixture.ctx(), filter).unwrap();
    let mut mine: Vec<_> = all
        .into_iter()
        .filter(|item| item.recurring_source_id.as_deref() == Some(template.id.as_str()))
        .collect();
    mine.sort_by(|a, b| a.occurred_on.cmp(&b.occurred_on));
    mine
}

fn dates(items: &[Transaction]) -> Vec<&str> {
    items.iter().map(|item| item.occurred_on.as_str()).collect()
}

#[test]
fn every_missing_month_up_to_today_is_created_with_the_template_values() {
    let fixture = Fixture::new();
    let template = record_template(&fixture, monthly("Internet FPT", 230_000, "2026-08-05", 5));
    assert_eq!(generate_on(&fixture, TODAY), 2);
    let made = occurrences_of(&fixture, &template);
    assert_eq!(dates(&made), vec!["2026-09-05", "2026-10-05"]);
    assert_eq!(made[0].title, "Internet FPT");
    assert_eq!(made[0].amount_vnd, Money(-230_000));
    assert_eq!(made[0].category_id, template.category_id);
    assert_eq!(made[0].wallet_id, template.wallet_id);
    assert_eq!(made[0].recurring_rule, None);
    assert_eq!(made[0].id, format!("{}@2026-09-05", template.id));
}

#[test]
fn calling_again_on_the_same_day_creates_nothing_and_writes_no_events() {
    let fixture = Fixture::new();
    record_template(&fixture, monthly("Internet", 230_000, "2026-08-05", 5));
    generate_on(&fixture, TODAY);
    let events_before = fixture.events("transaction").len();
    assert_eq!(generate_on(&fixture, TODAY), 0);
    assert_eq!(fixture.events("transaction").len(), events_before);
}

#[test]
fn the_next_month_is_created_only_once_its_day_has_come() {
    let fixture = Fixture::new();
    let template = record_template(&fixture, monthly("Internet", 230_000, "2026-09-05", 5));
    assert_eq!(generate_on(&fixture, "2026-10-04"), 0);
    assert_eq!(generate_on(&fixture, "2026-10-05"), 1);
    assert_eq!(generate_on(&fixture, "2026-11-04"), 0);
    assert_eq!(dates(&occurrences_of(&fixture, &template)), vec!["2026-10-05"]);
}

#[test]
fn nothing_is_created_on_or_before_the_template_own_date() {
    let fixture = Fixture::new();
    record_template(&fixture, monthly("Internet", 230_000, TODAY, 9));
    assert_eq!(generate_on(&fixture, TODAY), 0);
    record_template(&fixture, monthly("Gym", 300_000, "2026-10-20", 5));
    assert_eq!(generate_on(&fixture, "2026-10-31"), 0);
}

#[test]
fn a_rule_day_missing_from_a_short_month_falls_on_its_last_day() {
    let fixture = Fixture::new();
    let template = record_template(&fixture, monthly("Tiền nhà", 5_000_000, "2026-01-31", 31));
    assert_eq!(generate_on(&fixture, "2026-04-30"), 3);
    let made = occurrences_of(&fixture, &template);
    assert_eq!(dates(&made), vec!["2026-02-28", "2026-03-31", "2026-04-30"]);
}

#[test]
fn income_that_repeats_is_generated_like_spending() {
    let fixture = Fixture::new();
    let salary = NewTransaction {
        recurring_rule: Some("monthly:1".into()),
        ..income("Lương", 28_000_000, "2026-08-01")
    };
    let template = record_template(&fixture, salary);
    generate_on(&fixture, TODAY);
    let made = occurrences_of(&fixture, &template);
    assert_eq!(dates(&made), vec!["2026-09-01", "2026-10-01"]);
    assert_eq!(made[0].amount_vnd, Money(28_000_000));
}

#[test]
fn a_deleted_occurrence_is_not_created_again() {
    let fixture = Fixture::new();
    let template = record_template(&fixture, monthly("Internet", 230_000, "2026-08-05", 5));
    generate_on(&fixture, TODAY);
    let first = occurrences_of(&fixture, &template).remove(0);
    transactions::delete(&fixture.ctx(), &first.id).unwrap();
    assert_eq!(generate_on(&fixture, TODAY), 0);
    assert_eq!(dates(&occurrences_of(&fixture, &template)), vec!["2026-10-05"]);
}

#[test]
fn an_occurrence_that_was_moved_to_another_date_is_not_created_again() {
    let fixture = Fixture::new();
    let template = record_template(&fixture, monthly("Internet", 230_000, "2026-09-05", 5));
    generate_on(&fixture, TODAY);
    let made = occurrences_of(&fixture, &template).remove(0);
    let moved = UpdateTransaction { occurred_on: Some("2026-10-08".into()), ..change(&made.id) };
    transactions::update(&fixture.ctx(), moved).unwrap();
    assert_eq!(generate_on(&fixture, TODAY), 0);
}

#[test]
fn stopping_the_recurrence_ends_generation_but_keeps_what_was_made() {
    let fixture = Fixture::new();
    let template = record_template(&fixture, monthly("Internet", 230_000, "2026-08-05", 5));
    generate_on(&fixture, "2026-09-10");
    let stop = UpdateTransaction { recurring_rule: Some(None), ..change(&template.id) };
    transactions::update(&fixture.ctx(), stop).unwrap();
    assert_eq!(generate_on(&fixture, "2026-12-31"), 0);
    assert_eq!(dates(&occurrences_of(&fixture, &template)), vec!["2026-09-05"]);
}

#[test]
fn a_deleted_template_stops_producing_occurrences() {
    let fixture = Fixture::new();
    let template = record_template(&fixture, monthly("Internet", 230_000, "2026-08-05", 5));
    transactions::delete(&fixture.ctx(), &template.id).unwrap();
    assert_eq!(generate_on(&fixture, TODAY), 0);
}

#[test]
fn a_changed_amount_on_the_template_applies_to_later_occurrences_only() {
    let fixture = Fixture::new();
    let template = record_template(&fixture, monthly("Internet", 230_000, "2026-08-05", 5));
    generate_on(&fixture, "2026-09-10");
    let raise = UpdateTransaction { amount_vnd: Some(Money(-250_000)), ..change(&template.id) };
    transactions::update(&fixture.ctx(), raise).unwrap();
    generate_on(&fixture, TODAY);
    let made = occurrences_of(&fixture, &template);
    assert_eq!((made[0].amount_vnd, made[1].amount_vnd), (Money(-230_000), Money(-250_000)));
}

#[test]
fn each_created_occurrence_is_logged_for_sync_with_its_source() {
    let fixture = Fixture::new();
    let template = record_template(&fixture, monthly("Internet", 230_000, "2026-08-05", 5));
    generate_on(&fixture, TODAY);
    let events = fixture.events("transaction");
    assert_eq!(events.len(), 3);
    assert_eq!(events[1].action, "insert");
    assert_eq!(events[1].payload["recurring_source_id"], template.id.as_str());
    assert_eq!(events[1].payload["id"], format!("{}@2026-09-05", template.id));
}

#[test]
fn generated_spending_counts_towards_the_wallet_balance() {
    let fixture = Fixture::new();
    record_template(&fixture, monthly("Internet", 230_000, "2026-08-05", 5));
    generate_on(&fixture, TODAY);
    let sql = "SELECT COUNT(*) AS total FROM spending_transactions WHERE deleted_at IS NULL";
    assert_eq!(fixture.count(sql), 3);
}

#[test]
fn a_template_that_can_no_longer_be_recorded_does_not_block_the_others() {
    let fixture = Fixture::new();
    record_template(&fixture, monthly("Hỏng", 100_000, "2026-08-05", 5));
    let good = record_template(&fixture, monthly("Internet", 230_000, "2026-08-06", 6));
    let broken = "UPDATE spending_transactions SET wallet_id = 'gone' WHERE title = 'Hỏng'";
    fixture.db().execute(broken, &[]).unwrap();
    assert_eq!(generate_on(&fixture, TODAY), 2);
    assert_eq!(occurrences_of(&fixture, &good).len(), 2);
}

#[test]
fn a_template_with_an_unreadable_rule_is_skipped() {
    let fixture = Fixture::new();
    let odd = NewTransaction {
        recurring_rule: Some("weekly:2".into()),
        ..expense("Lạ", 1_000, "2026-08-05")
    };
    record_template(&fixture, odd);
    assert_eq!(generate_on(&fixture, TODAY), 0);
}

#[test]
fn a_bad_date_is_rejected_before_anything_is_written() {
    let fixture = Fixture::new();
    record_template(&fixture, monthly("Internet", 230_000, "2026-08-05", 5));
    let result = generate(&fixture.ctx(), GenerateRecurring { today: "2026-02-30".into() });
    assert_eq!(result.unwrap_err().code, ErrorCode::Validation);
    assert_eq!(fixture.events("transaction").len(), 1);
}

fn change(id: &str) -> UpdateTransaction {
    UpdateTransaction {
        payment_method_id: None,
        id: id.into(),
        title: None,
        amount_vnd: None,
        category_id: None,
        wallet_id: None,
        occurred_on: None,
        note: None,
        recurring_rule: None,
    }
}

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

#[test]
fn a_generated_expense_can_raise_the_budget_alert_of_the_current_month() {
    let fixture = Fixture::new();
    record_template(&fixture, monthly("Học phí", 900_000, "2026-09-05", 5));
    set_food_budget(&fixture, 1_000_000);
    generate_on(&fixture, TODAY);
    assert_eq!(fixture.notifications(), vec!["Ăn uống đã dùng 90% ngân sách"]);
}

#[test]
fn filling_in_past_months_raises_only_the_alert_of_the_current_month() {
    let fixture = Fixture::new();
    record_template(&fixture, monthly("Học phí", 900_000, "2026-07-05", 5));
    set_food_budget(&fixture, 1_000_000);
    assert_eq!(generate_on(&fixture, TODAY), 3);
    assert_eq!(fixture.notifications(), vec!["Ăn uống đã dùng 90% ngân sách"]);
}
