use super::*;
use crate::spending::{Category, CategoryKind};

const SEMICOLON_STATEMENT: &str = "\
SAO KÊ TÀI KHOẢN;;;;
Số tài khoản;0071001234567;;;
Từ ngày 01/10/2026 đến ngày 09/10/2026;;;;
Ngày giao dịch;Số tiền ghi nợ;Số tiền ghi có;Số dư;Nội dung
01/10/2026;;28.000.000;38.000.000;CONG TY ABC TRA LUONG T10
02/10/2026;1.250.000;;36.750.000;THANH TOAN EVN HCMC   TIEN DIEN T9
03/10/2026;65.000;;36.685.000;GRAB*TRIP HCM
;;;;
Tổng cộng;1.315.000;28.000.000;;
";

const COMMA_STATEMENT: &str = "\
Date,Description,Debit,Credit,Balance
09/10/2026,\"HIGHLANDS COFFEE, Q1\",\"65,000\",,\"9,935,000\"
08/10/2026 14:32:11,Transfer from Lan,,\"500,000\",\"10,000,000\"
07/10/2026,,\"20,000\",,\"9,500,000\"
";

const TAB_STATEMENT: &str = "Date\tAmount\tDescription\n\
2026-10-09\t-65000\tHighlands Coffee\n\
2026-10-08\t28000000\tLương tháng 10\n\
2026-10-07\t0\tPhí\n\
2026-10-06\tabc\tKhông rõ\n";

const HEADERLESS_STATEMENT: &str = "\
09/10/2026;Thanh toán Highlands Coffee;-65.000;9.935.000
08/10/2026;Nhận tiền từ Lan;500.000;10.000.000
";

fn parse(text: &str) -> ParsedStatement {
    parse_statement(text).unwrap()
}

fn category(id: &str, name: &str, kind: CategoryKind) -> Category {
    Category {
        id: id.into(),
        name: name.into(),
        icon: "tag".into(),
        kind,
        budget_vnd: None,
        is_fixed: false,
        position: 0,
    }
}

fn amounts(statement: &ParsedStatement) -> Vec<Option<i64>> {
    statement.rows.iter().map(|row| row.amount.map(Money::vnd)).collect()
}

#[test]
fn a_semicolon_statement_with_account_details_above_the_header_is_read() {
    let statement = parse(SEMICOLON_STATEMENT);
    assert_eq!(statement.delimiter, ';');
    let dates: Vec<_> = statement.rows.iter().map(|row| row.occurred_on.as_deref()).collect();
    assert_eq!(dates[..3], [Some("2026-10-01"), Some("2026-10-02"), Some("2026-10-03")]);
    assert_eq!(amounts(&statement)[..3], [Some(28_000_000), Some(-1_250_000), Some(-65_000)]);
}

#[test]
fn descriptions_lose_repeated_spaces_and_blank_lines_are_skipped() {
    let statement = parse(SEMICOLON_STATEMENT);
    assert_eq!(statement.rows[1].title, "THANH TOAN EVN HCMC TIEN DIEN T9");
    assert_eq!(statement.rows.len(), 4);
}

#[test]
fn a_totals_line_at_the_end_is_kept_but_marked_with_a_date_problem() {
    let statement = parse(SEMICOLON_STATEMENT);
    let totals = &statement.rows[3];
    assert_eq!(totals.problems, vec![RowProblem::InvalidDate]);
    assert_eq!(totals.line, 9);
    assert!(statement.rows[..3].iter().all(|row| row.problems.is_empty()));
}

#[test]
fn a_comma_statement_reads_quoted_amounts_descriptions_and_times() {
    let statement = parse(COMMA_STATEMENT);
    assert_eq!(statement.delimiter, ',');
    assert_eq!(statement.rows[0].title, "HIGHLANDS COFFEE, Q1");
    assert_eq!(amounts(&statement), vec![Some(-65_000), Some(500_000), Some(-20_000)]);
    assert_eq!(statement.rows[1].occurred_on.as_deref(), Some("2026-10-08"));
}

#[test]
fn a_blank_description_gets_a_neutral_title() {
    let statement = parse(COMMA_STATEMENT);
    assert_eq!(statement.rows[2].title, "Giao dịch ngân hàng");
    assert!(statement.rows[2].problems.is_empty());
}

#[test]
fn a_tab_separated_paste_with_iso_dates_and_a_signed_amount_is_read() {
    let statement = parse(TAB_STATEMENT);
    assert_eq!(statement.delimiter, '\t');
    assert_eq!(amounts(&statement)[..2], [Some(-65_000), Some(28_000_000)]);
    assert_eq!(statement.rows[1].title, "Lương tháng 10");
}

#[test]
fn a_zero_and_an_unreadable_amount_are_reported_per_row() {
    let statement = parse(TAB_STATEMENT);
    assert_eq!(statement.rows[2].problems, vec![RowProblem::ZeroAmount]);
    assert_eq!(statement.rows[3].problems, vec![RowProblem::InvalidAmount]);
    assert_eq!(statement.rows[3].amount, None);
}

#[test]
fn a_file_without_a_header_is_guessed_from_its_first_data_row() {
    let statement = parse(HEADERLESS_STATEMENT);
    assert_eq!(statement.rows.len(), 2);
    assert_eq!(statement.rows[0].title, "Thanh toán Highlands Coffee");
    assert_eq!(amounts(&statement), vec![Some(-65_000), Some(500_000)]);
}

#[test]
fn a_leading_byte_order_mark_and_windows_line_breaks_are_handled() {
    let text = format!("\u{FEFF}{}", TAB_STATEMENT.replace('\n', "\r\n"));
    let statement = parse(&text);
    assert_eq!(statement.rows.len(), 4);
    assert_eq!(statement.rows[0].occurred_on.as_deref(), Some("2026-10-09"));
}

#[test]
fn missing_cells_are_reported_as_missing() {
    let statement = parse("Date;Amount;Description\n;-5.000;a\n09/10/2026;;b\n");
    assert_eq!(statement.rows[0].problems, vec![RowProblem::MissingDate]);
    assert_eq!(statement.rows[1].problems, vec![RowProblem::MissingAmount]);
}

#[test]
fn both_debit_and_credit_in_one_row_give_the_net_movement() {
    let statement =
        parse("Date;Debit;Credit;Description\n09/10/2026;100.000;40.000;Hoàn tiền một phần\n");
    assert_eq!(amounts(&statement), vec![Some(-60_000)]);
}

#[test]
fn a_negative_number_in_a_debit_column_still_means_money_out() {
    let statement = parse("Date;Debit;Credit;Description\n09/10/2026;-65.000;;Grab\n");
    assert_eq!(amounts(&statement), vec![Some(-65_000)]);
}

#[test]
fn text_without_date_and_amount_columns_is_rejected() {
    assert!(parse_statement("").is_err());
    assert!(parse_statement("hello\nworld\n").is_err());
    assert!(parse_statement("Date;Description\n09/10/2026;Grab\n").is_err());
}

#[test]
fn the_preview_suggests_a_category_by_kind_and_keeps_problems() {
    let categories = vec![
        category("category-food", "Ăn uống", CategoryKind::Expense),
        category("category-bills", "Hoá đơn", CategoryKind::Expense),
        category("category-income", "Thu nhập", CategoryKind::Income),
    ];
    let preview = build_preview(parse(SEMICOLON_STATEMENT), &categories);
    let suggested: Vec<_> = preview.rows.iter().map(|row| row.category_id.as_deref()).collect();
    assert_eq!(
        suggested[..3],
        [Some("category-income"), Some("category-bills"), Some("category-food")]
    );
    assert_eq!(preview.delimiter, ";");
}

#[test]
fn the_preview_serialises_with_camel_case_names_and_snake_case_problems() {
    let preview = build_preview(parse(TAB_STATEMENT), &[]);
    let json = serde_json::to_value(&preview).unwrap();
    assert_eq!(json["rows"][0]["occurredOn"], "2026-10-09");
    assert_eq!(json["rows"][0]["amountVnd"], -65_000);
    assert_eq!(json["rows"][2]["problems"][0], "zero_amount");
    assert!(json["rows"][3]["amountVnd"].is_null());
}
