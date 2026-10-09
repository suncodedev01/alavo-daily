use serde::{Deserialize, Serialize};

use crate::shared::money::Money;
use crate::spending::category::Category;

const WARN_PERCENT: i64 = 85;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BudgetTone {
    Normal,
    Warn,
    Over,
}

impl BudgetTone {
    pub fn of(spent: Money, budget: Money) -> BudgetTone {
        if budget.vnd() <= 0 {
            return BudgetTone::Normal;
        }
        if spent > budget {
            BudgetTone::Over
        } else if spent.vnd() * 100 >= budget.vnd() * WARN_PERCENT {
            BudgetTone::Warn
        } else {
            BudgetTone::Normal
        }
    }
}

pub fn percent_used(spent: Money, budget: Money) -> i64 {
    if budget.vnd() <= 0 {
        return 0;
    }
    (spent.vnd() * 100 + budget.vnd() / 2).div_euclid(budget.vnd())
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetLine {
    pub category_id: String,
    pub name: String,
    pub icon: String,
    pub budget_vnd: Money,
    pub spent_vnd: Money,
    pub pct: f64,
    pub remaining_vnd: Money,
    pub tone: BudgetTone,
}

impl BudgetLine {
    pub fn for_category(category: &Category, spent: Money) -> Option<BudgetLine> {
        let budget = category.budget_vnd?;
        Some(BudgetLine {
            category_id: category.id.clone(),
            name: category.name.clone(),
            icon: category.icon.clone(),
            budget_vnd: budget,
            spent_vnd: spent,
            pct: spent.vnd() as f64 / budget.vnd() as f64,
            remaining_vnd: budget - spent,
            tone: BudgetTone::of(spent, budget),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetStatus {
    pub month: String,
    pub lines: Vec<BudgetLine>,
    pub total_budget_vnd: Money,
    pub total_spent_vnd: Money,
    pub total_remaining_vnd: Money,
    pub days_left: i64,
    pub per_day_vnd: Money,
}

impl BudgetStatus {
    pub fn from_lines(month: String, lines: Vec<BudgetLine>, days_left: i64) -> BudgetStatus {
        let total_budget: Money = lines.iter().map(|line| line.budget_vnd).sum();
        let total_spent: Money = lines.iter().map(|line| line.spent_vnd).sum();
        let total_remaining = total_budget - total_spent;
        let per_day = if days_left > 0 { total_remaining.vnd() / days_left } else { 0 };
        BudgetStatus {
            month,
            lines,
            total_budget_vnd: total_budget,
            total_spent_vnd: total_spent,
            total_remaining_vnd: total_remaining,
            days_left,
            per_day_vnd: Money(per_day),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spending::category::CategoryKind;

    fn category(budget: Option<i64>) -> Category {
        Category {
            id: "category-food".into(),
            name: "Ăn uống".into(),
            icon: "fork-knife".into(),
            kind: CategoryKind::Expense,
            budget_vnd: budget.map(Money),
            is_fixed: false,
            position: 1,
        }
    }

    fn line(budget: i64, spent: i64) -> BudgetLine {
        BudgetLine::for_category(&category(Some(budget)), Money(spent)).unwrap()
    }

    #[test]
    fn tone_is_normal_just_below_85_percent() {
        assert_eq!(BudgetTone::of(Money(849), Money(1000)), BudgetTone::Normal);
        assert_eq!(BudgetTone::of(Money(0), Money(1000)), BudgetTone::Normal);
    }

    #[test]
    fn tone_is_warn_at_exactly_85_percent_and_up_to_exactly_100() {
        assert_eq!(BudgetTone::of(Money(850), Money(1000)), BudgetTone::Warn);
        assert_eq!(BudgetTone::of(Money(1000), Money(1000)), BudgetTone::Warn);
    }

    #[test]
    fn tone_is_over_strictly_above_100_percent() {
        assert_eq!(BudgetTone::of(Money(1001), Money(1000)), BudgetTone::Over);
        assert_eq!(BudgetTone::of(Money(5000), Money(1000)), BudgetTone::Over);
    }

    #[test]
    fn a_zero_budget_never_alerts() {
        assert_eq!(BudgetTone::of(Money(100), Money(0)), BudgetTone::Normal);
        assert_eq!(percent_used(Money(100), Money(0)), 0);
    }

    #[test]
    fn tones_are_ordered_so_a_crossing_is_a_comparison() {
        assert!(BudgetTone::Normal < BudgetTone::Warn);
        assert!(BudgetTone::Warn < BudgetTone::Over);
    }

    #[test]
    fn percent_used_rounds_to_the_nearest_whole_percent() {
        assert_eq!(percent_used(Money(2_397_000), Money(2_600_000)), 92);
        assert_eq!(percent_used(Money(845), Money(1000)), 85);
        assert_eq!(percent_used(Money(844), Money(1000)), 84);
        assert_eq!(percent_used(Money(1500), Money(1000)), 150);
    }

    #[test]
    fn line_computes_pct_remaining_and_tone() {
        let line = line(2_600_000, 2_397_000);
        assert!((line.pct - 0.922).abs() < 0.001);
        assert_eq!(line.remaining_vnd, Money(203_000));
        assert_eq!(line.tone, BudgetTone::Warn);
    }

    #[test]
    fn over_budget_line_has_negative_remaining_and_pct_above_one() {
        let line = line(1_000, 1_200);
        assert!(line.pct > 1.0);
        assert_eq!(line.remaining_vnd, Money(-200));
        assert_eq!(line.tone, BudgetTone::Over);
    }

    #[test]
    fn category_without_budget_has_no_line() {
        assert!(BudgetLine::for_category(&category(None), Money(5)).is_none());
    }

    #[test]
    fn status_totals_and_per_day_follow_the_lines() {
        let status = BudgetStatus::from_lines(
            "2026-10".into(),
            vec![line(2_600_000, 2_397_000), line(800_000, 230_000)],
            22,
        );
        assert_eq!(status.total_budget_vnd, Money(3_400_000));
        assert_eq!(status.total_spent_vnd, Money(2_627_000));
        assert_eq!(status.total_remaining_vnd, Money(773_000));
        assert_eq!(status.per_day_vnd, Money(35_136));
    }

    #[test]
    fn per_day_is_zero_when_no_days_are_left() {
        let status = BudgetStatus::from_lines("2026-10".into(), vec![line(1000, 100)], 0);
        assert_eq!(status.per_day_vnd, Money(0));
    }

    #[test]
    fn status_without_budgets_is_all_zero() {
        let status = BudgetStatus::from_lines("2026-10".into(), Vec::new(), 5);
        assert_eq!(status.total_budget_vnd, Money(0));
        assert_eq!(status.per_day_vnd, Money(0));
    }

    #[test]
    fn serialises_with_camel_case_and_lowercase_tone() {
        let json = serde_json::to_value(line(1000, 900)).unwrap();
        assert_eq!(json["categoryId"], "category-food");
        assert_eq!(json["remainingVnd"], 100);
        assert_eq!(json["tone"], "warn");
    }
}
