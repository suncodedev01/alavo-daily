use serde::Serialize;

use crate::shared::money::Money;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct MonthTotals {
    pub income: Money,
    pub expense: Money,
    pub count: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthSummary {
    pub month: String,
    pub income_vnd: Money,
    pub expense_vnd: Money,
    pub net_vnd: Money,
    pub previous_expense_vnd: Money,
    pub expense_delta_pct: Option<f64>,
    pub total_balance_vnd: Money,
    pub daily_expense_vnd: Vec<Money>,
    pub transaction_count: i64,
}

pub struct SummaryParts {
    pub month: String,
    pub totals: MonthTotals,
    pub previous_expense: Money,
    pub total_balance: Money,
    pub daily_expense: Vec<Money>,
}

impl MonthSummary {
    pub fn build(parts: SummaryParts) -> MonthSummary {
        let MonthTotals { income, expense, count } = parts.totals;
        MonthSummary {
            month: parts.month,
            income_vnd: income,
            expense_vnd: expense,
            net_vnd: income - expense,
            previous_expense_vnd: parts.previous_expense,
            expense_delta_pct: expense_delta(expense, parts.previous_expense),
            total_balance_vnd: parts.total_balance,
            daily_expense_vnd: parts.daily_expense,
            transaction_count: count,
        }
    }
}

fn expense_delta(expense: Money, previous: Money) -> Option<f64> {
    (previous.vnd() > 0).then(|| (expense - previous).vnd() as f64 / previous.vnd() as f64)
}

pub fn daily_series(totals: &[(u32, Money)], length: usize) -> Vec<Money> {
    let mut series = vec![Money(0); length];
    for (day, spent) in totals {
        let slot = (*day as usize).checked_sub(1).and_then(|index| series.get_mut(index));
        if let Some(slot) = slot {
            *slot = *slot + *spent;
        }
    }
    series
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parts(expense: i64, previous: i64) -> SummaryParts {
        SummaryParts {
            month: "2026-10".into(),
            totals: MonthTotals { income: Money(32_500_000), expense: Money(expense), count: 3 },
            previous_expense: Money(previous),
            total_balance: Money(40_490_000),
            daily_expense: vec![Money(0), Money(5)],
        }
    }

    #[test]
    fn net_is_income_minus_expense() {
        let summary = MonthSummary::build(parts(10_000_000, 0));
        assert_eq!(summary.net_vnd, Money(22_500_000));
        assert_eq!(summary.transaction_count, 3);
    }

    #[test]
    fn delta_is_relative_to_the_previous_month() {
        let up = MonthSummary::build(parts(15_000, 10_000));
        assert_eq!(up.expense_delta_pct, Some(0.5));
        let down = MonthSummary::build(parts(5_000, 10_000));
        assert_eq!(down.expense_delta_pct, Some(-0.5));
    }

    #[test]
    fn delta_is_none_without_previous_spending() {
        assert_eq!(MonthSummary::build(parts(15_000, 0)).expense_delta_pct, None);
    }

    #[test]
    fn delta_is_zero_when_spending_is_unchanged() {
        assert_eq!(MonthSummary::build(parts(10_000, 10_000)).expense_delta_pct, Some(0.0));
    }

    #[test]
    fn daily_series_fills_missing_days_with_zero_and_sums_the_same_day() {
        let series = daily_series(&[(1, Money(10)), (3, Money(5)), (3, Money(7))], 4);
        assert_eq!(series, vec![Money(10), Money(0), Money(12), Money(0)]);
    }

    #[test]
    fn daily_series_ignores_days_outside_the_range() {
        let series = daily_series(&[(0, Money(1)), (5, Money(2)), (2, Money(3))], 3);
        assert_eq!(series, vec![Money(0), Money(3), Money(0)]);
        assert!(daily_series(&[(1, Money(1))], 0).is_empty());
    }

    #[test]
    fn serialises_with_camel_case_names_and_a_null_delta() {
        let json = serde_json::to_value(MonthSummary::build(parts(10, 0))).unwrap();
        assert_eq!(json["expenseVnd"], 10);
        assert_eq!(json["previousExpenseVnd"], 0);
        assert!(json["expenseDeltaPct"].is_null());
        assert_eq!(json["dailyExpenseVnd"][1], 5);
        assert_eq!(json["transactionCount"], 3);
    }
}
