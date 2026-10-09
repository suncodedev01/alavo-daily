use crate::shared::money::Money;
use crate::spending::budget::{percent_used, BudgetLine, BudgetTone};

pub fn format_vnd(amount: Money) -> String {
    let digits = amount.vnd().unsigned_abs().to_string();
    let mut grouped = String::new();
    for (index, digit) in digits.chars().enumerate() {
        if index > 0 && (digits.len() - index).is_multiple_of(3) {
            grouped.push('.');
        }
        grouped.push(digit);
    }
    let sign = if amount.is_negative() { "-" } else { "" };
    format!("{sign}{grouped} ₫")
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BudgetAlert {
    pub title: String,
    pub body: String,
    pub dedupe_key: String,
}

impl BudgetAlert {
    pub fn for_line(line: &BudgetLine, month: &str, days_left: i64) -> Option<BudgetAlert> {
        let (title, body, level) = match line.tone {
            BudgetTone::Normal => return None,
            BudgetTone::Warn => (warn_title(line), warn_body(line, days_left), "warn"),
            BudgetTone::Over => (over_title(line), over_body(line), "over"),
        };
        let dedupe_key = format!("budget:{}:{month}:{level}", line.category_id);
        Some(BudgetAlert { title, body, dedupe_key })
    }
}

fn warn_title(line: &BudgetLine) -> String {
    let percent = percent_used(line.spent_vnd, line.budget_vnd);
    format!("{} đã dùng {percent}% ngân sách", line.name)
}

fn warn_body(line: &BudgetLine, days_left: i64) -> String {
    let remaining = format_vnd(line.remaining_vnd);
    if days_left > 0 {
        format!("Còn {remaining} cho {days_left} ngày tới.")
    } else {
        format!("Còn {remaining}.")
    }
}

fn over_title(line: &BudgetLine) -> String {
    format!("{} đã vượt ngân sách", line.name)
}

fn over_body(line: &BudgetLine) -> String {
    let over = format_vnd(line.remaining_vnd.abs());
    let budget = format_vnd(line.budget_vnd);
    format!("Đã vượt {over} so với hạn mức {budget}.")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(spent: i64) -> BudgetLine {
        BudgetLine {
            category_id: "category-food".into(),
            name: "Ăn uống".into(),
            icon: "fork-knife".into(),
            budget_vnd: Money(2_600_000),
            spent_vnd: Money(spent),
            pct: spent as f64 / 2_600_000.0,
            remaining_vnd: Money(2_600_000 - spent),
            tone: BudgetTone::of(Money(spent), Money(2_600_000)),
        }
    }

    #[test]
    fn format_vnd_groups_thousands_with_dots() {
        assert_eq!(format_vnd(Money(0)), "0 ₫");
        assert_eq!(format_vnd(Money(999)), "999 ₫");
        assert_eq!(format_vnd(Money(1_000)), "1.000 ₫");
        assert_eq!(format_vnd(Money(203_000)), "203.000 ₫");
        assert_eq!(format_vnd(Money(2_600_000)), "2.600.000 ₫");
        assert_eq!(format_vnd(Money(1_234_567_890)), "1.234.567.890 ₫");
    }

    #[test]
    fn format_vnd_puts_the_minus_sign_in_front() {
        assert_eq!(format_vnd(Money(-45_000)), "-45.000 ₫");
    }

    #[test]
    fn no_alert_in_the_normal_range() {
        assert_eq!(BudgetAlert::for_line(&line(100_000), "2026-10", 22), None);
    }

    #[test]
    fn warn_alert_names_the_percent_and_the_remaining_money() {
        let alert = BudgetAlert::for_line(&line(2_397_000), "2026-10", 22).unwrap();
        assert_eq!(alert.title, "Ăn uống đã dùng 92% ngân sách");
        assert_eq!(alert.body, "Còn 203.000 ₫ cho 22 ngày tới.");
        assert_eq!(alert.dedupe_key, "budget:category-food:2026-10:warn");
    }

    #[test]
    fn warn_body_drops_the_days_when_none_are_left() {
        let alert = BudgetAlert::for_line(&line(2_397_000), "2026-10", 0).unwrap();
        assert_eq!(alert.body, "Còn 203.000 ₫.");
    }

    #[test]
    fn over_alert_reports_how_far_over_the_budget_is() {
        let alert = BudgetAlert::for_line(&line(2_700_000), "2026-10", 5).unwrap();
        assert_eq!(alert.title, "Ăn uống đã vượt ngân sách");
        assert_eq!(alert.body, "Đã vượt 100.000 ₫ so với hạn mức 2.600.000 ₫.");
        assert_eq!(alert.dedupe_key, "budget:category-food:2026-10:over");
    }

    #[test]
    fn exactly_the_budget_is_still_a_warning() {
        let alert = BudgetAlert::for_line(&line(2_600_000), "2026-10", 3).unwrap();
        assert_eq!(alert.title, "Ăn uống đã dùng 100% ngân sách");
        assert!(alert.dedupe_key.ends_with(":warn"));
    }
}
