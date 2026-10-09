use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::csv_export::to_csv;
use alavo_domain::spending::report::{ReportParts, ReportRange, SpendingReport};
use alavo_infrastructure::persistence::repositories::spending::export::export_rows_between;
use alavo_infrastructure::persistence::repositories::spending::range_reports::{
    category_totals_between, month_totals_between,
};
use serde::Serialize;

use crate::context::Ctx;

pub fn report(ctx: &Ctx, range: ReportRange) -> Result<SpendingReport, EngineError> {
    let (from, to) = range.resolve()?;
    let (first_day, last_day) = (from.to_text(), to.to_text());
    Ok(SpendingReport::build(ReportParts {
        from,
        to,
        categories: category_totals_between(ctx.db, &first_day, &last_day)?,
        months: month_totals_between(ctx.db, &first_day, &last_day)?,
    }))
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CsvExport {
    pub csv: String,
    pub row_count: usize,
}

pub fn export_csv(ctx: &Ctx, range: ReportRange) -> Result<CsvExport, EngineError> {
    let (from, to) = range.resolve()?;
    let rows = export_rows_between(ctx.db, &from.to_text(), &to.to_text())?;
    Ok(CsvExport { csv: to_csv(&rows), row_count: rows.len() })
}

#[cfg(test)]
mod tests;
