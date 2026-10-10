use alavo_domain::shared::error::ErrorCode;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{NewWallet, TransactionFilter, WalletKind};

use crate::spending::test_support::{Fixture, CASH, FOOD, INCOME};
use crate::spending::{transactions, wallets};

use super::*;

const VIETNAMESE_BANK: &str = "\
Ngân hàng TMCP Ngoại thương;;;;
SAO KÊ TÀI KHOẢN;;;;
Từ ngày 01/10/2026 đến ngày 09/10/2026;;;;
Ngày giao dịch;Số tiền ghi nợ;Số tiền ghi có;Số dư;Nội dung
01/10/2026;;28.000.000;38.000.000;CONG TY ABC TRA LUONG T10
02/10/2026;650.000;;37.350.000;THANH TOAN EVN HCMC TIEN DIEN T9
03/10/2026;65.000;;37.285.000;GRAB*TRIP HCM
04/10/2026;59.000;;37.226.000;HIGHLANDS COFFEE NGUYEN HUE
";

const ENGLISH_BANK: &str = "\
Date,Description,Debit,Credit,Balance
09/10/2026,\"SHOPEE*ORDER 8812, HCM\",\"1,250,000\",,\"9,935,000\"
08/10/2026,Transfer from Lan,,\"500,000\",\"11,185,000\"
07/10/2026,UNKNOWN MERCHANT 4411,\"20,000\",,\"10,685,000\"
";

fn preview_of(fixture: &Fixture, csv: &str) -> ImportPreview {
    preview(&fixture.ctx(), PreviewRequest { csv: csv.into() }).unwrap()
}

fn row(date: &str, amount: i64, title: &str, category: &str) -> ImportRow {
    ImportRow {
        occurred_on: date.into(),
        amount_vnd: Money(amount),
        title: title.into(),
        category_id: category.into(),
    }
}

fn request(wallet: &str, rows: Vec<ImportRow>) -> ImportRequest {
    ImportRequest { wallet_id: wallet.into(), rows }
}

fn all_titles(fixture: &Fixture) -> Vec<String> {
    let all = transactions::list(&fixture.ctx(), TransactionFilter::default()).unwrap();
    all.into_iter().map(|item| item.title).collect()
}

fn row_count(fixture: &Fixture) -> i64 {
    fixture.count("SELECT COUNT(*) AS total FROM spending_transactions")
}

#[test]
fn a_vietnamese_bank_statement_is_previewed_with_suggested_categories() {
    let fixture = Fixture::new();
    let result = preview_of(&fixture, VIETNAMESE_BANK);
    assert_eq!(result.delimiter, ";");
    let found: Vec<_> = result
        .rows
        .iter()
        .map(|item| (item.occurred_on.as_deref(), item.amount_vnd, item.category_id.as_deref()))
        .collect();
    assert_eq!(
        found,
        vec![
            (Some("2026-10-01"), Some(Money(28_000_000)), Some("category-income")),
            (Some("2026-10-02"), Some(Money(-650_000)), Some("category-bills")),
            (Some("2026-10-03"), Some(Money(-65_000)), Some("category-transport")),
            (Some("2026-10-04"), Some(Money(-59_000)), Some("category-food")),
        ]
    );
    assert!(result.rows.iter().all(|item| item.problems.is_empty()));
}

#[test]
fn an_english_bank_statement_with_quoted_amounts_is_previewed() {
    let fixture = Fixture::new();
    let result = preview_of(&fixture, ENGLISH_BANK);
    assert_eq!(result.delimiter, ",");
    assert_eq!(result.rows[0].title, "SHOPEE*ORDER 8812, HCM");
    assert_eq!(result.rows[0].amount_vnd, Some(Money(-1_250_000)));
    assert_eq!(result.rows[0].category_id.as_deref(), Some("category-shopping"));
    assert_eq!(result.rows[1].amount_vnd, Some(Money(500_000)));
    assert_eq!(result.rows[1].category_id.as_deref(), Some("category-income"));
    assert_eq!(result.rows[2].category_id.as_deref(), Some(FOOD));
}

#[test]
fn a_custom_category_named_in_the_description_is_suggested() {
    let fixture = Fixture::new();
    let pet = alavo_domain::spending::NewCategory {
        name: "Thú cưng".into(),
        icon: "paw-print".into(),
        kind: alavo_domain::spending::CategoryKind::Expense,
        budget_vnd: None,
    };
    let pet = crate::spending::categories::create(&fixture.ctx(), pet).unwrap();
    let csv = "Date;Amount;Description\n09/10/2026;-90.000;Hạt cho Thú cưng\n";
    assert_eq!(preview_of(&fixture, csv).rows[0].category_id.as_deref(), Some(pet.id.as_str()));
}

#[test]
fn previewing_saves_nothing_and_unreadable_text_is_a_validation_error() {
    let fixture = Fixture::new();
    preview_of(&fixture, VIETNAMESE_BANK);
    assert_eq!(row_count(&fixture), 0);
    let error = preview(&fixture.ctx(), PreviewRequest { csv: "just words".into() }).unwrap_err();
    assert_eq!(error.code, ErrorCode::Validation);
}

#[test]
fn confirmed_lines_are_recorded_in_the_chosen_wallet_with_sync_events() {
    let fixture = Fixture::new();
    let rows = vec![
        row("2026-10-01", 28_000_000, "CONG TY ABC TRA LUONG T10", INCOME),
        row("2026-10-03", -65_000, "GRAB*TRIP HCM", "category-transport"),
    ];
    let result = import(&fixture.ctx(), request(CASH, rows)).unwrap();
    assert_eq!(result, ImportResult { imported: 2, skipped_duplicates: 0 });
    assert_eq!(all_titles(&fixture), vec!["GRAB*TRIP HCM", "CONG TY ABC TRA LUONG T10"]);
    assert_eq!(fixture.events("transaction").len(), 2);
    let wallet = wallets::list(&fixture.ctx()).unwrap().remove(0);
    assert_eq!(wallet.balance_vnd, Money(27_935_000));
}

#[test]
fn importing_the_same_statement_twice_adds_nothing_the_second_time() {
    let fixture = Fixture::new();
    let rows = || vec![row("2026-10-03", -65_000, "GRAB*TRIP HCM", "category-transport")];
    import(&fixture.ctx(), request(CASH, rows())).unwrap();
    let second = import(&fixture.ctx(), request(CASH, rows())).unwrap();
    assert_eq!(second, ImportResult { imported: 0, skipped_duplicates: 1 });
    assert_eq!(row_count(&fixture), 1);
}

#[test]
fn a_transaction_with_the_same_title_in_another_wallet_is_not_a_duplicate() {
    let fixture = Fixture::new();
    let bank =
        NewWallet { account_number: None, name: "TCB".into(), kind: WalletKind::Bank, opening_balance_vnd: Money(0) };
    let bank = wallets::create(&fixture.ctx(), bank).unwrap();
    let rows = || vec![row("2026-10-03", -65_000, "GRAB*TRIP HCM", "category-transport")];
    import(&fixture.ctx(), request(CASH, rows())).unwrap();
    let result = import(&fixture.ctx(), request(&bank.id, rows())).unwrap();
    assert_eq!(result.imported, 1);
    assert_eq!(row_count(&fixture), 2);
}

#[test]
fn two_identical_lines_in_one_statement_are_both_recorded() {
    let fixture = Fixture::new();
    let coffee = || row("2026-10-04", -59_000, "HIGHLANDS COFFEE", FOOD);
    let result = import(&fixture.ctx(), request(CASH, vec![coffee(), coffee()])).unwrap();
    assert_eq!(result.imported, 2);
    let again = import(&fixture.ctx(), request(CASH, vec![coffee(), coffee(), coffee()])).unwrap();
    assert_eq!(again, ImportResult { imported: 1, skipped_duplicates: 2 });
}

#[test]
fn one_invalid_line_rolls_back_the_whole_import() {
    let fixture = Fixture::new();
    let rows = vec![
        row("2026-10-03", -65_000, "GRAB*TRIP HCM", "category-transport"),
        row("2026-10-04", 59_000, "Tiền vào nhưng danh mục chi", FOOD),
    ];
    let error = import(&fixture.ctx(), request(CASH, rows)).unwrap_err();
    assert_eq!(error.code, ErrorCode::Validation);
    assert!(error.message.contains("Tiền vào nhưng danh mục chi (2026-10-04)"));
    assert_eq!(row_count(&fixture), 0);
    assert!(fixture.events("transaction").is_empty());
}

#[test]
fn an_unknown_wallet_category_or_date_is_rejected() {
    let fixture = Fixture::new();
    let good = row("2026-10-03", -65_000, "Grab", FOOD);
    let no_wallet = import(&fixture.ctx(), request("gone", vec![good.clone()]));
    assert_eq!(no_wallet.unwrap_err().code, ErrorCode::Validation);
    let no_category = row("2026-10-03", -65_000, "Grab", "category-gone");
    assert!(import(&fixture.ctx(), request(CASH, vec![no_category])).is_err());
    let no_date = row("2026-02-30", -65_000, "Grab", FOOD);
    assert!(import(&fixture.ctx(), request(CASH, vec![no_date])).is_err());
    assert_eq!(row_count(&fixture), 0);
}

#[test]
fn importing_nothing_succeeds_and_changes_nothing() {
    let fixture = Fixture::new();
    let result = import(&fixture.ctx(), request(CASH, vec![])).unwrap();
    assert_eq!(result, ImportResult { imported: 0, skipped_duplicates: 0 });
}

#[test]
fn the_request_reads_camel_case_json() {
    let json = r#"{"walletId":"wallet-cash","rows":[
        {"occurredOn":"2026-10-03","amountVnd":-65000,"title":"Grab","categoryId":"category-food"}]}"#;
    let parsed: ImportRequest = serde_json::from_str(json).unwrap();
    assert_eq!(parsed.rows[0].amount_vnd, Money(-65_000));
    assert_eq!(parsed.wallet_id, "wallet-cash");
}
