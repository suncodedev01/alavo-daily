use alavo_domain::shared::error::ErrorCode;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{CategoryKind, NewTransaction};

use crate::spending::test_support::{expense, income, Fixture, FOOD};
use crate::spending::transactions;

use super::*;

fn range(from: &str, to: &str) -> ReportRange {
    ReportRange { from: from.into(), to: to.into() }
}

fn record(fixture: &Fixture, input: NewTransaction) {
    transactions::record(&fixture.ctx(), input).unwrap();
}

fn in_category(category: &str, input: NewTransaction) -> NewTransaction {
    NewTransaction { category_id: category.into(), ..input }
}

fn seeded() -> Fixture {
    let fixture = Fixture::new();
    record(&fixture, expense("Phở", 70_000, "2026-08-20"));
    record(&fixture, income("Lương", 20_000_000, "2026-09-01"));
    record(&fixture, expense("Siêu thị", 300_000, "2026-09-10"));
    record(&fixture, in_category("category-fun", expense("Netflix", 100_000, "2026-09-12")));
    record(&fixture, expense("Cà phê", 30_000, "2026-10-05"));
    record(&fixture, expense("Ngoài khoảng", 1, "2026-11-01"));
    fixture
}

#[test]
fn totals_cover_exactly_the_requested_range() {
    let fixture = seeded();
    let result = report(&fixture.ctx(), range("2026-09-01", "2026-10-31")).unwrap();
    assert_eq!(result.income_vnd, Money(20_000_000));
    assert_eq!(result.expense_vnd, Money(430_000));
    assert_eq!(result.net_vnd, Money(19_570_000));
    assert_eq!(result.transaction_count, 4);
}

#[test]
fn a_range_may_start_and_end_inside_a_month() {
    let fixture = seeded();
    let result = report(&fixture.ctx(), range("2026-09-10", "2026-09-12")).unwrap();
    assert_eq!(result.expense_vnd, Money(400_000));
    assert_eq!(result.income_vnd, Money(0));
    assert_eq!(result.months.len(), 1);
}

#[test]
fn categories_are_largest_first_with_their_share_of_the_same_kind() {
    let fixture = seeded();
    let result = report(&fixture.ctx(), range("2026-09-01", "2026-10-31")).unwrap();
    let expenses: Vec<_> =
        result.categories.iter().filter(|item| item.kind == CategoryKind::Expense).collect();
    assert_eq!(expenses[0].category_id, FOOD);
    assert_eq!(expenses[0].total_vnd, Money(330_000));
    assert_eq!(expenses[0].transaction_count, 2);
    assert!((expenses[0].share - 330.0 / 430.0).abs() < 1e-9);
    assert_eq!(expenses[1].category_id, "category-fun");
    let income = result.categories.iter().find(|item| item.kind == CategoryKind::Income).unwrap();
    assert_eq!(income.share, 1.0);
}

#[test]
fn the_series_has_one_bar_per_month_including_empty_ones() {
    let fixture = seeded();
    let result = report(&fixture.ctx(), range("2026-07-01", "2026-10-31")).unwrap();
    let months: Vec<_> = result.months.iter().map(|bar| bar.month.as_str()).collect();
    assert_eq!(months, vec!["2026-07", "2026-08", "2026-09", "2026-10"]);
    let expenses: Vec<_> = result.months.iter().map(|bar| bar.expense_vnd.vnd()).collect();
    assert_eq!(expenses, vec![0, 70_000, 400_000, 30_000]);
    assert_eq!(result.months[2].net_vnd, Money(19_600_000));
}

#[test]
fn deleted_transactions_are_not_reported() {
    let fixture = Fixture::new();
    let saved = transactions::record(&fixture.ctx(), expense("Phở", 70_000, "2026-10-05")).unwrap();
    transactions::delete(&fixture.ctx(), &saved.id).unwrap();
    let result = report(&fixture.ctx(), range("2026-10-01", "2026-10-31")).unwrap();
    assert_eq!(result.transaction_count, 0);
    assert!(result.categories.is_empty());
}

#[test]
fn an_empty_range_gives_zero_totals_and_no_shares() {
    let fixture = Fixture::new();
    let result = report(&fixture.ctx(), range("2026-10-01", "2026-10-31")).unwrap();
    assert_eq!(
        (result.income_vnd, result.expense_vnd, result.net_vnd),
        (Money(0), Money(0), Money(0))
    );
    assert_eq!(result.months.len(), 1);
}

#[test]
fn a_backwards_or_malformed_range_is_a_validation_error() {
    let fixture = Fixture::new();
    for (from, to) in [("2026-10-31", "2026-10-01"), ("2026-02-30", "2026-03-01"), ("x", "y")] {
        let error = report(&fixture.ctx(), range(from, to)).unwrap_err();
        assert_eq!(error.code, ErrorCode::Validation, "{from} {to}");
    }
}

#[test]
fn the_csv_lists_the_range_oldest_first_with_names_not_ids() {
    let fixture = seeded();
    let export = export_csv(&fixture.ctx(), range("2026-09-01", "2026-10-31")).unwrap();
    let lines: Vec<_> = export.csv.lines().collect();
    assert_eq!(export.row_count, 4);
    assert_eq!(lines[0], "date,title,category,wallet,amount_vnd,note");
    assert_eq!(lines[1], "2026-09-01,Lương,Thu nhập,Tiền mặt,20000000,");
    assert_eq!(lines[2], "2026-09-10,Siêu thị,Ăn uống,Tiền mặt,-300000,");
    assert_eq!(lines.len(), 5);
}

#[test]
fn an_export_with_nothing_in_range_is_only_the_header() {
    let fixture = Fixture::new();
    let export = export_csv(&fixture.ctx(), range("2026-10-01", "2026-10-31")).unwrap();
    assert_eq!(export.row_count, 0);
    assert_eq!(export.csv, "date,title,category,wallet,amount_vnd,note\r\n");
}

#[test]
fn a_title_with_a_comma_and_quotes_is_escaped_in_the_export() {
    let fixture = Fixture::new();
    record(&fixture, expense("Bún \"bò\", chả", 50_000, "2026-10-05"));
    let export = export_csv(&fixture.ctx(), range("2026-10-01", "2026-10-31")).unwrap();
    assert!(export.csv.contains("\"Bún \"\"bò\"\", chả\""));
}
