use serde::Serialize;

use crate::shared::money::Money;
use crate::spending::{Category, CategoryKind};

use super::suggest::suggest_category;
use super::{ParsedStatement, RowProblem, StatementRow};

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewRow {
    pub line: usize,
    pub occurred_on: Option<String>,
    pub amount_vnd: Option<Money>,
    pub title: String,
    pub category_id: Option<String>,
    pub problems: Vec<RowProblem>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    pub delimiter: String,
    pub rows: Vec<PreviewRow>,
}

pub fn build_preview(statement: ParsedStatement, categories: &[Category]) -> ImportPreview {
    ImportPreview {
        delimiter: statement.delimiter.to_string(),
        rows: statement.rows.into_iter().map(|row| preview_row(row, categories)).collect(),
    }
}

fn preview_row(row: StatementRow, categories: &[Category]) -> PreviewRow {
    let category_id =
        row.amount.and_then(|amount| suggest_category(&row.title, kind_of(amount), categories));
    PreviewRow {
        line: row.line,
        occurred_on: row.occurred_on,
        amount_vnd: row.amount,
        title: row.title,
        category_id,
        problems: row.problems,
    }
}

fn kind_of(amount: Money) -> CategoryKind {
    if amount.is_negative() {
        CategoryKind::Expense
    } else {
        CategoryKind::Income
    }
}
