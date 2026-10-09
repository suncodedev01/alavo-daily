use serde::{Deserialize, Serialize};

use crate::shared::date::Date;
use crate::shared::error::EngineError;
use crate::shared::money::Money;
use crate::spending::CategoryKind;

const MAX_REPORT_MONTHS: usize = 120;

#[derive(Debug, Clone, Deserialize)]
pub struct ReportRange {
    pub from: String,
    pub to: String,
}

impl ReportRange {
    pub fn resolve(&self) -> Result<(Date, Date), EngineError> {
        let (from, to) = (Date::parse(&self.from)?, Date::parse(&self.to)?);
        if from > to {
            return Err(EngineError::validation("from must not be after to"));
        }
        if months_between(from, to).len() > MAX_REPORT_MONTHS {
            return Err(EngineError::validation("a report covers at most 120 months"));
        }
        Ok((from, to))
    }
}

/// Every `YYYY-MM` from the month of `from` to the month of `to`, both included.
pub fn months_between(from: Date, to: Date) -> Vec<String> {
    let mut months = Vec::new();
    let (mut year, mut month) = (from.year, from.month);
    while (year, month) <= (to.year, to.month) {
        months.push(format!("{year:04}-{month:02}"));
        (year, month) = if month == 12 { (year + 1, 1) } else { (year, month + 1) };
    }
    months
}

#[derive(Debug, Clone, PartialEq)]
pub struct CategoryTotal {
    pub category_id: String,
    pub name: String,
    pub icon: String,
    pub kind: CategoryKind,
    pub total: Money,
    pub transaction_count: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MonthTotal {
    pub month: String,
    pub income: Money,
    pub expense: Money,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryShare {
    pub category_id: String,
    pub name: String,
    pub icon: String,
    pub kind: CategoryKind,
    pub total_vnd: Money,
    /// Fraction of the total of the same kind (all expenses or all income): 0.25 is 25%.
    pub share: f64,
    pub transaction_count: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthBar {
    pub month: String,
    pub income_vnd: Money,
    pub expense_vnd: Money,
    pub net_vnd: Money,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpendingReport {
    pub from: String,
    pub to: String,
    pub income_vnd: Money,
    pub expense_vnd: Money,
    pub net_vnd: Money,
    pub transaction_count: i64,
    pub categories: Vec<CategoryShare>,
    pub months: Vec<MonthBar>,
}

pub struct ReportParts {
    pub from: Date,
    pub to: Date,
    pub categories: Vec<CategoryTotal>,
    pub months: Vec<MonthTotal>,
}

impl SpendingReport {
    pub fn build(parts: ReportParts) -> SpendingReport {
        let months = month_bars(&parts);
        let income: Money = months.iter().map(|bar| bar.income_vnd).sum();
        let expense: Money = months.iter().map(|bar| bar.expense_vnd).sum();
        SpendingReport {
            from: parts.from.to_text(),
            to: parts.to.to_text(),
            income_vnd: income,
            expense_vnd: expense,
            net_vnd: income - expense,
            transaction_count: parts.categories.iter().map(|item| item.transaction_count).sum(),
            categories: category_shares(&parts.categories, income, expense),
            months,
        }
    }
}

fn month_bars(parts: &ReportParts) -> Vec<MonthBar> {
    months_between(parts.from, parts.to)
        .into_iter()
        .map(|month| {
            let found = parts.months.iter().find(|total| total.month == month);
            let income = found.map_or(Money(0), |total| total.income);
            let expense = found.map_or(Money(0), |total| total.expense);
            MonthBar { month, income_vnd: income, expense_vnd: expense, net_vnd: income - expense }
        })
        .collect()
}

fn category_shares(totals: &[CategoryTotal], income: Money, expense: Money) -> Vec<CategoryShare> {
    totals
        .iter()
        .map(|item| {
            let whole = match item.kind {
                CategoryKind::Income => income,
                CategoryKind::Expense => expense,
            };
            CategoryShare {
                category_id: item.category_id.clone(),
                name: item.name.clone(),
                icon: item.icon.clone(),
                kind: item.kind,
                total_vnd: item.total,
                share: share_of(item.total, whole),
                transaction_count: item.transaction_count,
            }
        })
        .collect()
}

fn share_of(part: Money, whole: Money) -> f64 {
    if whole.vnd() <= 0 {
        return 0.0;
    }
    part.vnd() as f64 / whole.vnd() as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(text: &str) -> Date {
        Date::parse(text).unwrap()
    }

    fn category(id: &str, kind: CategoryKind, total: i64, count: i64) -> CategoryTotal {
        CategoryTotal {
            category_id: id.into(),
            name: id.into(),
            icon: "tag".into(),
            kind,
            total: Money(total),
            transaction_count: count,
        }
    }

    fn month(month: &str, income: i64, expense: i64) -> MonthTotal {
        MonthTotal { month: month.into(), income: Money(income), expense: Money(expense) }
    }

    fn range(from: &str, to: &str) -> ReportRange {
        ReportRange { from: from.into(), to: to.into() }
    }

    fn parts() -> ReportParts {
        ReportParts {
            from: date("2026-08-15"),
            to: date("2026-10-09"),
            categories: vec![
                category("food", CategoryKind::Expense, 750, 5),
                category("income", CategoryKind::Income, 2_000, 1),
                category("fun", CategoryKind::Expense, 250, 2),
            ],
            months: vec![month("2026-08", 0, 100), month("2026-10", 2_000, 900)],
        }
    }

    #[test]
    fn totals_are_summed_from_the_months_and_net_is_income_minus_expense() {
        let report = SpendingReport::build(parts());
        assert_eq!(report.income_vnd, Money(2_000));
        assert_eq!(report.expense_vnd, Money(1_000));
        assert_eq!(report.net_vnd, Money(1_000));
        assert_eq!(report.transaction_count, 8);
        assert_eq!((report.from.as_str(), report.to.as_str()), ("2026-08-15", "2026-10-09"));
    }

    #[test]
    fn every_month_of_the_range_has_a_bar_even_without_transactions() {
        let report = SpendingReport::build(parts());
        let names: Vec<_> = report.months.iter().map(|bar| bar.month.as_str()).collect();
        assert_eq!(names, vec!["2026-08", "2026-09", "2026-10"]);
        assert_eq!(report.months[1].expense_vnd, Money(0));
        assert_eq!(report.months[2].net_vnd, Money(1_100));
    }

    #[test]
    fn a_share_is_a_fraction_of_the_total_of_its_own_kind() {
        let report = SpendingReport::build(parts());
        let shares: Vec<_> = report.categories.iter().map(|item| item.share).collect();
        assert_eq!(shares, vec![0.75, 1.0, 0.25]);
    }

    #[test]
    fn shares_are_zero_when_there_is_nothing_to_divide() {
        let empty = ReportParts { categories: vec![], months: vec![], ..parts() };
        let report = SpendingReport::build(empty);
        assert_eq!(report.expense_vnd, Money(0));
        assert!(report.categories.is_empty());
        assert_eq!(share_of(Money(5), Money(0)), 0.0);
    }

    #[test]
    fn months_between_runs_across_a_year_boundary_inclusively() {
        let months = months_between(date("2025-11-30"), date("2026-02-01"));
        assert_eq!(months, vec!["2025-11", "2025-12", "2026-01", "2026-02"]);
        assert_eq!(months_between(date("2026-10-05"), date("2026-10-05")), vec!["2026-10"]);
    }

    #[test]
    fn a_range_must_be_ordered_real_dates_and_at_most_120_months() {
        assert!(range("2026-10-01", "2026-10-31").resolve().is_ok());
        assert!(range("2026-10-02", "2026-10-01").resolve().is_err());
        assert!(range("2026-02-30", "2026-03-01").resolve().is_err());
        assert!(range("2026-10", "2026-11").resolve().is_err());
        assert!(range("2016-11-01", "2026-10-31").resolve().is_ok());
        assert!(range("2016-10-01", "2026-10-31").resolve().is_err());
    }

    #[test]
    fn the_report_serialises_with_camel_case_names() {
        let json = serde_json::to_value(SpendingReport::build(parts())).unwrap();
        assert_eq!(json["expenseVnd"], 1_000);
        assert_eq!(json["categories"][0]["totalVnd"], 750);
        assert_eq!(json["categories"][0]["kind"], "expense");
        assert_eq!(json["categories"][0]["transactionCount"], 5);
        assert_eq!(json["months"][2]["netVnd"], 1_100);
    }
}
