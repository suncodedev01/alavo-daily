use crate::shared::date::{days_in_month, Date};
use crate::spending::Transaction;

const MONTHLY_PREFIX: &str = "monthly:";

pub fn monthly_day(rule: &str) -> Option<u32> {
    let day = rule.strip_prefix(MONTHLY_PREFIX)?.parse::<u32>().ok()?;
    (1..=31).contains(&day).then_some(day)
}

/// Same on every device, so two devices that generate the same occurrence write the same row.
pub fn occurrence_id(template_id: &str, date: Date) -> String {
    format!("{template_id}@{}", date.to_text())
}

/// The dates after `first` up to and including `today` on which a monthly rule falls. A day
/// the month does not have (31 in a 30-day month) falls on the last day of that month.
pub fn due_dates(first: Date, day: u32, today: Date) -> Vec<Date> {
    let mut dates = Vec::new();
    let (mut year, mut month) = (first.year, first.month);
    while (year, month) <= (today.year, today.month) {
        let date = Date { year, month, day: day.min(days_in_month(year, month)) };
        if date > first && date <= today {
            dates.push(date);
        }
        (year, month) = next_month(year, month);
    }
    dates
}

fn next_month(year: i32, month: u32) -> (i32, u32) {
    if month == 12 {
        (year + 1, 1)
    } else {
        (year, month + 1)
    }
}

impl Transaction {
    /// The copy of this recurring transaction that a rule produces on `date`.
    pub fn occurrence(&self, date: Date, created_at: i64) -> Transaction {
        Transaction {
            id: occurrence_id(&self.id, date),
            occurred_on: date.to_text(),
            recurring_rule: None,
            recurring_source_id: Some(self.id.clone()),
            created_at,
            updated_at: 0,
            ..self.clone()
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::shared::money::Money;

    use super::*;

    fn date(text: &str) -> Date {
        Date::parse(text).unwrap()
    }

    fn texts(dates: Vec<Date>) -> Vec<String> {
        dates.into_iter().map(Date::to_text).collect()
    }

    #[test]
    fn monthly_rules_read_a_day_between_1_and_31() {
        assert_eq!(monthly_day("monthly:8"), Some(8));
        assert_eq!(monthly_day("monthly:31"), Some(31));
        for bad in ["monthly:0", "monthly:32", "monthly:x", "weekly:2", "monthly:", ""] {
            assert_eq!(monthly_day(bad), None, "{bad}");
        }
    }

    #[test]
    fn occurrences_fall_on_the_rule_day_of_each_month_after_the_first_date() {
        let dates = due_dates(date("2026-08-05"), 5, date("2026-10-09"));
        assert_eq!(texts(dates), vec!["2026-09-05", "2026-10-05"]);
    }

    #[test]
    fn nothing_is_due_before_the_rule_day_of_the_current_month() {
        let dates = due_dates(date("2026-08-05"), 12, date("2026-10-09"));
        assert_eq!(texts(dates), vec!["2026-08-12", "2026-09-12"]);
    }

    #[test]
    fn an_occurrence_never_lands_on_or_before_the_template_date() {
        assert!(due_dates(date("2026-10-05"), 5, date("2026-10-31")).is_empty());
        assert!(due_dates(date("2026-10-20"), 5, date("2026-10-31")).is_empty());
        assert_eq!(texts(due_dates(date("2026-10-03"), 5, date("2026-10-31"))), vec!["2026-10-05"]);
    }

    #[test]
    fn the_rule_day_that_a_month_lacks_is_clamped_to_its_last_day() {
        let dates = due_dates(date("2026-01-31"), 31, date("2026-05-01"));
        assert_eq!(texts(dates), vec!["2026-02-28", "2026-03-31", "2026-04-30"]);
        assert_eq!(
            texts(due_dates(date("2024-01-31"), 31, date("2024-02-29"))),
            vec!["2024-02-29"]
        );
    }

    #[test]
    fn a_template_dated_in_the_future_has_no_occurrences_yet() {
        assert!(due_dates(date("2026-12-01"), 1, date("2026-10-09")).is_empty());
    }

    #[test]
    fn occurrences_cross_the_year_boundary() {
        let dates = due_dates(date("2025-11-15"), 15, date("2026-02-20"));
        assert_eq!(texts(dates), vec!["2025-12-15", "2026-01-15", "2026-02-15"]);
    }

    #[test]
    fn the_day_of_today_itself_is_included() {
        assert_eq!(texts(due_dates(date("2026-09-09"), 9, date("2026-10-09"))), vec!["2026-10-09"]);
    }

    #[test]
    fn occurrence_ids_are_built_from_the_template_and_the_date() {
        assert_eq!(occurrence_id("t1", date("2026-10-05")), "t1@2026-10-05");
    }

    #[test]
    fn an_occurrence_copies_the_template_without_its_rule_and_points_back_to_it() {
        let template = Transaction {
            payment_method_id: None,
            id: "t1".into(),
            occurred_on: "2026-08-05".into(),
            title: "Tiền thuê nhà".into(),
            category_id: "category-home".into(),
            wallet_id: "wallet-cash".into(),
            amount_vnd: Money(-7_500_000),
            note: "hợp đồng".into(),
            recurring_rule: Some("monthly:5".into()),
            recurring_source_id: None,
            created_at: 1,
            updated_at: 2,
        };
        let copy = template.occurrence(date("2026-09-05"), 99);
        assert_eq!(copy.id, "t1@2026-09-05");
        assert_eq!(copy.occurred_on, "2026-09-05");
        assert_eq!(copy.recurring_rule, None);
        assert_eq!(copy.recurring_source_id.as_deref(), Some("t1"));
        assert_eq!(
            (copy.title.as_str(), copy.amount_vnd, copy.created_at),
            ("Tiền thuê nhà", Money(-7_500_000), 99)
        );
        assert_eq!(copy.note, "hợp đồng");
    }
}
