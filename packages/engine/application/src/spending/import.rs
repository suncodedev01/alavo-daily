use alavo_domain::shared::date::Date;
use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::statement::{
    build_preview, drop_known_duplicates, parse_statement, ImportPreview, ImportRow,
};
use alavo_domain::spending::NewTransaction;
use alavo_infrastructure::persistence::repositories::spending::categories::list_categories;
use alavo_infrastructure::persistence::repositories::spending::duplicates::ledger_key_counts;
use alavo_infrastructure::persistence::repositories::spending::wallets::find_wallet;
use serde::{Deserialize, Serialize};

use crate::context::Ctx;
use crate::spending::transactions;

#[derive(Debug, Clone, Deserialize)]
pub struct PreviewRequest {
    pub csv: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRequest {
    pub wallet_id: String,
    pub rows: Vec<ImportRow>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub imported: usize,
    pub skipped_duplicates: usize,
}

/// Reads a pasted or uploaded bank statement without saving anything.
pub fn preview(ctx: &Ctx, input: PreviewRequest) -> Result<ImportPreview, EngineError> {
    let statement = parse_statement(&input.csv)?;
    let categories = list_categories(ctx.db, None)?;
    Ok(build_preview(statement, &categories))
}

/// Records the confirmed lines in one transaction, so a bad line leaves nothing half imported.
/// Lines that match a transaction already in the wallet (same date, amount and title) are skipped.
pub fn import(ctx: &Ctx, input: ImportRequest) -> Result<ImportResult, EngineError> {
    ctx.transaction(|| {
        require_wallet(ctx, &input.wallet_id)?;
        let Some((from, to)) = date_span(&input.rows)? else {
            return Ok(ImportResult { imported: 0, skipped_duplicates: 0 });
        };
        let known = ledger_key_counts(ctx.db, &input.wallet_id, &from, &to)?;
        let (fresh, skipped_duplicates) = drop_known_duplicates(input.rows, known);
        let imported = fresh.len();
        for row in fresh {
            record_row(ctx, &input.wallet_id, row)?;
        }
        Ok(ImportResult { imported, skipped_duplicates })
    })
}

fn require_wallet(ctx: &Ctx, wallet_id: &str) -> Result<(), EngineError> {
    match find_wallet(ctx.db, wallet_id)? {
        Some(_) => Ok(()),
        None => Err(EngineError::validation(format!("wallet {wallet_id} does not exist"))),
    }
}

fn date_span(rows: &[ImportRow]) -> Result<Option<(String, String)>, EngineError> {
    let dates = rows
        .iter()
        .map(|row| Date::parse(&row.occurred_on))
        .collect::<Result<Vec<Date>, EngineError>>()?;
    let first = dates.iter().min().map(|date| date.to_text());
    let last = dates.iter().max().map(|date| date.to_text());
    Ok(first.zip(last))
}

fn record_row(ctx: &Ctx, wallet_id: &str, row: ImportRow) -> Result<(), EngineError> {
    let label = format!("{} ({})", row.title, row.occurred_on);
    let transaction = NewTransaction {
        payment_method_id: None,
        title: row.title,
        amount_vnd: row.amount_vnd,
        category_id: row.category_id,
        wallet_id: wallet_id.to_string(),
        occurred_on: row.occurred_on,
        note: String::new(),
        recurring_rule: None,
    };
    transactions::record(ctx, transaction)
        .map(|_| ())
        .map_err(|error| EngineError { message: format!("{label}: {}", error.message), ..error })
}

#[cfg(test)]
mod tests;
