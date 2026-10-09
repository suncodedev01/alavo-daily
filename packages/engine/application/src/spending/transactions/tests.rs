use alavo_domain::shared::error::ErrorCode;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{CategoryKind, NewWallet, WalletKind};

use crate::spending::test_support::{expense, income, Fixture, CASH, FOOD, INCOME, TODAY};
use crate::spending::{categories, wallets};

use super::*;

fn change(id: &str) -> UpdateTransaction {
    UpdateTransaction {
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

fn record_ok(fixture: &Fixture, input: NewTransaction) -> Transaction {
    record(&fixture.ctx(), input).unwrap()
}

fn titles(fixture: &Fixture, filter: TransactionFilter) -> Vec<String> {
    let all = list(&fixture.ctx(), filter).unwrap();
    all.into_iter().map(|transaction| transaction.title).collect()
}

fn error_code(result: Result<Transaction, EngineError>) -> ErrorCode {
    result.unwrap_err().code
}

#[test]
fn record_stores_a_trimmed_transaction_and_returns_it() {
    let fixture = Fixture::new();
    let input = NewTransaction {
        note: "Thìn".into(),
        recurring_rule: Some("monthly:6".into()),
        ..expense("  Phở  ", 70_000, "2026-10-06")
    };
    let saved = record_ok(&fixture, input);
    assert_eq!(saved.title, "Phở");
    assert_eq!(saved.amount_vnd, Money(-70_000));
    assert_eq!(saved.created_at, 1_791_532_800_000);
    assert_eq!(get(&fixture.ctx(), &saved.id).unwrap(), saved);
}

#[test]
fn record_appends_an_insert_event_with_the_whole_row() {
    let fixture = Fixture::new();
    let saved = record_ok(&fixture, expense("Phở", 70_000, "2026-10-06"));
    let events = fixture.events("transaction");
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].action, "insert");
    assert_eq!(events[0].payload["id"], saved.id.as_str());
    assert_eq!(events[0].payload["amount_vnd"], -70_000);
    assert_eq!(events[0].payload["wallet_id"], CASH);
    assert!(events[0].changed_fields.contains("amount_vnd"));
}

#[test]
fn record_rejects_a_blank_title() {
    let fixture = Fixture::new();
    let result = record(&fixture.ctx(), expense("   ", 1_000, TODAY));
    assert_eq!(error_code(result), ErrorCode::Validation);
    assert!(fixture.events("transaction").is_empty());
}

#[test]
fn record_rejects_impossible_and_malformed_dates() {
    let fixture = Fixture::new();
    for date in ["2026-02-30", "2026-13-01", "2026-10", "yesterday", ""] {
        let result = record(&fixture.ctx(), expense("x", 1_000, date));
        assert_eq!(error_code(result), ErrorCode::Validation, "{date}");
    }
}

#[test]
fn record_accepts_a_leap_day_only_in_a_leap_year() {
    let fixture = Fixture::new();
    assert!(record(&fixture.ctx(), expense("x", 1_000, "2024-02-29")).is_ok());
    assert!(record(&fixture.ctx(), expense("x", 1_000, "2026-02-29")).is_err());
}

#[test]
fn record_rejects_an_unknown_or_deleted_category_or_wallet() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let no_category = NewTransaction { category_id: "nope".into(), ..expense("x", 1, TODAY) };
    let no_wallet = NewTransaction { wallet_id: "nope".into(), ..expense("x", 1, TODAY) };
    assert_eq!(error_code(record(&ctx, no_category)), ErrorCode::Validation);
    assert_eq!(error_code(record(&ctx, no_wallet)), ErrorCode::Validation);
    categories::delete(&ctx, "category-fun").unwrap();
    let deleted = NewTransaction { category_id: "category-fun".into(), ..expense("x", 1, TODAY) };
    assert_eq!(error_code(record(&ctx, deleted)), ErrorCode::Validation);
    let spare =
        NewWallet { name: "Ví".into(), kind: WalletKind::Ewallet, opening_balance_vnd: Money(0) };
    let spare = wallets::create(&ctx, spare).unwrap();
    wallets::delete(&ctx, &spare.id).unwrap();
    let gone = NewTransaction { wallet_id: spare.id, ..expense("x", 1, TODAY) };
    assert_eq!(error_code(record(&ctx, gone)), ErrorCode::Validation);
}

#[test]
fn amount_sign_must_match_the_category_kind() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let positive_expense = NewTransaction { amount_vnd: Money(5_000), ..expense("x", 0, TODAY) };
    let negative_income = NewTransaction { amount_vnd: Money(-5_000), ..income("x", 0, TODAY) };
    assert_eq!(error_code(record(&ctx, positive_expense)), ErrorCode::Validation);
    assert_eq!(error_code(record(&ctx, negative_income)), ErrorCode::Validation);
    assert!(record(&ctx, income("Lương", 5_000, TODAY)).is_ok());
    assert!(record(&ctx, expense("Phở", 5_000, TODAY)).is_ok());
}

#[test]
fn a_zero_amount_is_rejected_for_both_kinds() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    assert_eq!(error_code(record(&ctx, expense("x", 0, TODAY))), ErrorCode::Validation);
    assert_eq!(error_code(record(&ctx, income("x", 0, TODAY))), ErrorCode::Validation);
}

#[test]
fn a_failed_record_leaves_no_row_and_no_event_behind() {
    let fixture = Fixture::new();
    let _ = record(&fixture.ctx(), expense("x", 0, TODAY));
    assert_eq!(fixture.count("SELECT COUNT(*) AS total FROM spending_transactions"), 0);
    assert_eq!(fixture.count("SELECT COUNT(*) AS total FROM hub_delta_events"), 0);
}

#[test]
fn list_is_newest_first_by_date_then_by_creation_time() {
    let fixture = Fixture::new();
    record_ok(&fixture, expense("old", 1, "2026-10-01"));
    record_ok(&fixture, expense("today first", 1, TODAY));
    fixture.advance(1);
    record_ok(&fixture, expense("today second", 1, TODAY));
    record_ok(&fixture, expense("middle", 1, "2026-10-05"));
    let order = titles(&fixture, TransactionFilter::default());
    assert_eq!(order, vec!["today second", "today first", "middle", "old"]);
}

#[test]
fn list_filters_by_month_including_the_first_and_last_day() {
    let fixture = Fixture::new();
    for (title, date) in [
        ("sep-30", "2026-09-30"),
        ("oct-01", "2026-10-01"),
        ("oct-31", "2026-10-31"),
        ("nov-01", "2026-11-01"),
    ] {
        record_ok(&fixture, expense(title, 1, date));
    }
    let october = TransactionFilter { month: Some("2026-10".into()), ..Default::default() };
    assert_eq!(titles(&fixture, october), vec!["oct-31", "oct-01"]);
    let padded = TransactionFilter { month: Some("2026-9".into()), ..Default::default() };
    assert_eq!(titles(&fixture, padded), vec!["sep-30"]);
}

#[test]
fn list_rejects_a_malformed_month() {
    let fixture = Fixture::new();
    let filter = TransactionFilter { month: Some("2026-13".into()), ..Default::default() };
    assert!(list(&fixture.ctx(), filter).is_err());
}

fn seed_filterable_transactions(fixture: &Fixture) -> String {
    let bank =
        NewWallet { name: "TCB".into(), kind: WalletKind::Bank, opening_balance_vnd: Money(0) };
    let bank = wallets::create(&fixture.ctx(), bank).unwrap();
    record_ok(fixture, expense("food in cash", 1, "2026-10-01"));
    let in_bank =
        NewTransaction { wallet_id: bank.id.clone(), ..expense("food in bank", 1, "2026-10-02") };
    record_ok(fixture, in_bank);
    let rent = NewTransaction {
        recurring_rule: Some("monthly:5".into()),
        category_id: "category-home".into(),
        ..expense("rent", 1, "2026-10-05")
    };
    record_ok(fixture, rent);
    record_ok(fixture, income("salary", 9, "2026-10-05"));
    bank.id
}

#[test]
fn list_filters_by_category_and_wallet() {
    let fixture = Fixture::new();
    let bank_id = seed_filterable_transactions(&fixture);
    let food = TransactionFilter { category_id: Some(FOOD.into()), ..Default::default() };
    assert_eq!(titles(&fixture, food), vec!["food in bank", "food in cash"]);
    let bank = TransactionFilter { wallet_id: Some(bank_id), ..Default::default() };
    assert_eq!(titles(&fixture, bank), vec!["food in bank"]);
}

#[test]
fn list_filters_by_category_kind_and_recurring_flag() {
    let fixture = Fixture::new();
    seed_filterable_transactions(&fixture);
    let income = TransactionFilter { kind: Some(CategoryKind::Income), ..Default::default() };
    assert_eq!(titles(&fixture, income), vec!["salary"]);
    let expense = TransactionFilter { kind: Some(CategoryKind::Expense), ..Default::default() };
    assert_eq!(titles(&fixture, expense).len(), 3);
    let recurring = TransactionFilter { recurring_only: Some(true), ..Default::default() };
    assert_eq!(titles(&fixture, recurring), vec!["rent"]);
}

#[test]
fn list_combines_filters_with_and() {
    let fixture = Fixture::new();
    seed_filterable_transactions(&fixture);
    let none = TransactionFilter {
        category_id: Some(INCOME.into()),
        recurring_only: Some(true),
        ..Default::default()
    };
    assert!(titles(&fixture, none).is_empty());
}

#[test]
fn list_searches_title_and_note_ignoring_case_and_honours_limit() {
    let fixture = Fixture::new();
    record_ok(&fixture, expense("Phở Thìn", 1, "2026-10-01"));
    record_ok(
        &fixture,
        NewTransaction { note: "ĂN PHỞ".into(), ..expense("Trưa", 1, "2026-10-02") },
    );
    record_ok(&fixture, expense("Cà phê", 1, "2026-10-03"));
    let query = TransactionFilter { query: Some("phở".into()), ..Default::default() };
    assert_eq!(titles(&fixture, query.clone()), vec!["Trưa", "Phở Thìn"]);
    let limited = TransactionFilter { limit: Some(1), ..query };
    assert_eq!(titles(&fixture, limited), vec!["Trưa"]);
    let newest = TransactionFilter { limit: Some(2), ..Default::default() };
    assert_eq!(titles(&fixture, newest), vec!["Cà phê", "Trưa"]);
}

#[test]
fn get_of_an_unknown_or_deleted_transaction_is_not_found() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    assert_eq!(get(&ctx, "nope").unwrap_err().code, ErrorCode::NotFound);
    let saved = record_ok(&fixture, expense("x", 1, TODAY));
    delete(&ctx, &saved.id).unwrap();
    assert_eq!(get(&ctx, &saved.id).unwrap_err().code, ErrorCode::NotFound);
}

#[test]
fn update_changes_only_the_given_fields_and_logs_them() {
    let fixture = Fixture::new();
    let saved = record_ok(&fixture, expense("Phở", 70_000, "2026-10-06"));
    let edit = UpdateTransaction {
        title: Some(" Bún bò ".into()),
        note: Some("trưa".into()),
        ..change(&saved.id)
    };
    let updated = update(&fixture.ctx(), edit).unwrap();
    assert_eq!((updated.title.as_str(), updated.note.as_str()), ("Bún bò", "trưa"));
    assert_eq!(updated.amount_vnd, Money(-70_000));
    assert!(updated.updated_at > saved.updated_at);
    let events = fixture.events("transaction");
    assert_eq!(events[1].action, "update");
    assert_eq!(events[1].changed_fields, r#"["title","note"]"#);
    assert_eq!(events[1].payload["title"], "Bún bò");
}

#[test]
fn update_can_set_and_clear_the_recurring_rule() {
    let fixture = Fixture::new();
    let saved = record_ok(&fixture, expense("Netflix", 260_000, "2026-10-08"));
    let ctx = fixture.ctx();
    let set =
        UpdateTransaction { recurring_rule: Some(Some("monthly:8".into())), ..change(&saved.id) };
    assert_eq!(update(&ctx, set).unwrap().recurring_rule.as_deref(), Some("monthly:8"));
    let clear = UpdateTransaction { recurring_rule: Some(None), ..change(&saved.id) };
    assert_eq!(update(&ctx, clear).unwrap().recurring_rule, None);
}

#[test]
fn update_revalidates_the_sign_against_the_new_category() {
    let fixture = Fixture::new();
    let saved = record_ok(&fixture, expense("Phở", 70_000, "2026-10-06"));
    let ctx = fixture.ctx();
    let to_income = UpdateTransaction { category_id: Some(INCOME.into()), ..change(&saved.id) };
    assert_eq!(error_code(update(&ctx, to_income)), ErrorCode::Validation);
    let both = UpdateTransaction {
        category_id: Some(INCOME.into()),
        amount_vnd: Some(Money(70_000)),
        ..change(&saved.id)
    };
    assert_eq!(update(&ctx, both).unwrap().category_id, INCOME);
}

#[test]
fn update_rejects_bad_values_and_keeps_the_old_row() {
    let fixture = Fixture::new();
    let saved = record_ok(&fixture, expense("Phở", 70_000, "2026-10-06"));
    let ctx = fixture.ctx();
    let bad = [
        UpdateTransaction { title: Some(" ".into()), ..change(&saved.id) },
        UpdateTransaction { occurred_on: Some("2026-02-30".into()), ..change(&saved.id) },
        UpdateTransaction { amount_vnd: Some(Money(0)), ..change(&saved.id) },
        UpdateTransaction { wallet_id: Some("nope".into()), ..change(&saved.id) },
        UpdateTransaction { category_id: Some("nope".into()), ..change(&saved.id) },
    ];
    for edit in bad {
        assert_eq!(error_code(update(&ctx, edit)), ErrorCode::Validation);
    }
    assert_eq!(get(&ctx, &saved.id).unwrap(), saved);
    assert_eq!(fixture.events("transaction").len(), 1);
}

#[test]
fn update_of_an_unknown_transaction_is_not_found() {
    let fixture = Fixture::new();
    assert_eq!(error_code(update(&fixture.ctx(), change("nope"))), ErrorCode::NotFound);
}

#[test]
fn update_can_move_a_transaction_across_the_month_boundary() {
    let fixture = Fixture::new();
    let saved = record_ok(&fixture, expense("Phở", 70_000, "2026-09-30"));
    let edit = UpdateTransaction { occurred_on: Some("2026-10-01".into()), ..change(&saved.id) };
    update(&fixture.ctx(), edit).unwrap();
    let october = TransactionFilter { month: Some("2026-10".into()), ..Default::default() };
    let september = TransactionFilter { month: Some("2026-09".into()), ..Default::default() };
    assert_eq!(titles(&fixture, october), vec!["Phở"]);
    assert!(titles(&fixture, september).is_empty());
}

#[test]
fn delete_hides_the_transaction_and_logs_a_delete_event() {
    let fixture = Fixture::new();
    let saved = record_ok(&fixture, expense("Phở", 70_000, "2026-10-06"));
    let ctx = fixture.ctx();
    delete(&ctx, &saved.id).unwrap();
    assert!(titles(&fixture, TransactionFilter::default()).is_empty());
    let events = fixture.events("transaction");
    assert_eq!(events[1].action, "delete");
    assert!(events[1].payload["deleted_at"].is_i64());
    assert_eq!(fixture.count("SELECT COUNT(*) AS total FROM spending_transactions"), 1);
    assert_eq!(delete(&ctx, &saved.id).unwrap_err().code, ErrorCode::NotFound);
}
