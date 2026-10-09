//! Reads a bank statement exported as CSV: any of comma, semicolon or tab as delimiter, a header
//! named in Vietnamese or English (after some lines of account details), and the day-first dates
//! and dotted or comma thousands separators Vietnamese banks use.

use serde::Serialize;

use crate::shared::error::EngineError;
use crate::shared::money::Money;

pub mod columns;
pub mod fold;
pub mod import;
pub mod preview;
pub mod split;
pub mod suggest;
pub mod values;

pub use import::{drop_known_duplicates, ImportRow, LedgerKey};
pub use preview::{build_preview, ImportPreview, PreviewRow};

use columns::{AmountColumns, ColumnMap};
use split::{detect_delimiter, split_records, strip_byte_order_mark};
use values::{parse_amount, parse_date};

const HEADER_SEARCH_RECORDS: usize = 30;
const UNTITLED: &str = "Giao dịch ngân hàng";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RowProblem {
    MissingDate,
    InvalidDate,
    MissingAmount,
    InvalidAmount,
    ZeroAmount,
}

#[derive(Debug, Clone, PartialEq)]
pub struct StatementRow {
    pub line: usize,
    pub occurred_on: Option<String>,
    pub amount: Option<Money>,
    pub title: String,
    pub problems: Vec<RowProblem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedStatement {
    pub delimiter: char,
    pub rows: Vec<StatementRow>,
}

pub fn parse_statement(text: &str) -> Result<ParsedStatement, EngineError> {
    let text = strip_byte_order_mark(text);
    let delimiter = detect_delimiter(text);
    let records = split_records(text, delimiter);
    let (map, first_data) = find_columns(&records).ok_or_else(|| {
        EngineError::validation("the statement has no recognisable date and amount columns")
    })?;
    let rows = records
        .iter()
        .enumerate()
        .skip(first_data)
        .filter(|(_, record)| record.iter().any(|cell| !cell.is_empty()))
        .map(|(index, record)| read_row(index + 1, record, &map))
        .collect();
    Ok(ParsedStatement { delimiter, rows })
}

fn find_columns(records: &[Vec<String>]) -> Option<(ColumnMap, usize)> {
    let searched = || records.iter().enumerate().take(HEADER_SEARCH_RECORDS);
    searched()
        .find_map(|(index, record)| columns::from_header(record).map(|map| (map, index + 1)))
        .or_else(|| {
            searched()
                .find_map(|(index, record)| columns::guess_from_row(record).map(|map| (map, index)))
        })
}

fn read_row(line: usize, record: &[String], map: &ColumnMap) -> StatementRow {
    let mut problems = Vec::new();
    let occurred_on = read_date(cell(record, map.date), &mut problems);
    let amount = read_amount(record, map.amount, &mut problems);
    StatementRow { line, occurred_on, amount, title: read_title(record, map), problems }
}

fn cell(record: &[String], column: usize) -> &str {
    record.get(column).map_or("", String::as_str)
}

fn read_title(record: &[String], map: &ColumnMap) -> String {
    let text = map.title.map_or("", |column| cell(record, column));
    let one_line = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if one_line.is_empty() {
        UNTITLED.to_string()
    } else {
        one_line
    }
}

fn read_date(text: &str, problems: &mut Vec<RowProblem>) -> Option<String> {
    if text.is_empty() {
        problems.push(RowProblem::MissingDate);
        return None;
    }
    let date = parse_date(text).map(|date| date.to_text());
    if date.is_none() {
        problems.push(RowProblem::InvalidDate);
    }
    date
}

fn read_amount(
    record: &[String],
    columns: AmountColumns,
    problems: &mut Vec<RowProblem>,
) -> Option<Money> {
    let amount = match columns {
        AmountColumns::Signed(column) => read_signed(cell(record, column), problems),
        AmountColumns::DebitCredit { debit, credit } => {
            read_debit_credit(record, (debit, credit), problems)
        }
    };
    if amount == Some(Money(0)) {
        problems.push(RowProblem::ZeroAmount);
    }
    amount
}

fn read_signed(text: &str, problems: &mut Vec<RowProblem>) -> Option<Money> {
    if text.is_empty() {
        problems.push(RowProblem::MissingAmount);
        return None;
    }
    let amount = parse_amount(text).map(Money);
    if amount.is_none() {
        problems.push(RowProblem::InvalidAmount);
    }
    amount
}

fn read_debit_credit(
    record: &[String],
    (debit, credit): (Option<usize>, Option<usize>),
    problems: &mut Vec<RowProblem>,
) -> Option<Money> {
    let out = debit.map_or("", |column| cell(record, column));
    let money_in = credit.map_or("", |column| cell(record, column));
    if out.is_empty() && money_in.is_empty() {
        problems.push(RowProblem::MissingAmount);
        return None;
    }
    match (magnitude(out), magnitude(money_in)) {
        (Some(out), Some(money_in)) => Some(Money(money_in - out)),
        _ => {
            problems.push(RowProblem::InvalidAmount);
            None
        }
    }
}

fn magnitude(text: &str) -> Option<i64> {
    if text.is_empty() {
        return Some(0);
    }
    parse_amount(text).map(i64::abs)
}

#[cfg(test)]
mod tests;
