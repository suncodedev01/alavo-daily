use std::cmp::Ordering;

use serde::Deserialize;

use crate::shared::date::{days_in_month, parse_month, previous_month, Date};
use crate::shared::error::EngineError;

const MS_PER_DAY: i64 = 86_400_000;

pub fn today_utc(now_ms: i64) -> Date {
    Date::from_days(now_ms.div_euclid(MS_PER_DAY))
}

pub fn normalize_month(text: &str) -> Result<String, EngineError> {
    let (year, number) = parse_month(text)?;
    Ok(format!("{year:04}-{number:02}"))
}

#[derive(Debug, Clone, Deserialize)]
pub struct MonthQuery {
    pub month: String,
    pub today: String,
}

impl MonthQuery {
    pub fn resolve(&self) -> Result<MonthContext, EngineError> {
        MonthContext::new(&self.month, Date::parse(&self.today)?)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct MonthContext {
    pub month: String,
    pub today: Date,
    year: i32,
    number: u32,
}

impl MonthContext {
    pub fn new(month: &str, today: Date) -> Result<MonthContext, EngineError> {
        let (year, number) = parse_month(month)?;
        Ok(MonthContext { month: normalize_month(month)?, today, year, number })
    }

    pub fn previous_month(&self) -> Result<String, EngineError> {
        previous_month(&self.month)
    }

    pub fn length(&self) -> u32 {
        days_in_month(self.year, self.number)
    }

    pub fn daily_length(&self) -> usize {
        match self.compare_to_today() {
            Ordering::Equal => self.today.day as usize,
            _ => self.length() as usize,
        }
    }

    pub fn days_left(&self) -> i64 {
        match self.compare_to_today() {
            Ordering::Less => 0,
            Ordering::Equal => i64::from(self.length() - self.today.day),
            Ordering::Greater => i64::from(self.length()),
        }
    }

    fn compare_to_today(&self) -> Ordering {
        (self.year, self.number).cmp(&(self.today.year, self.today.month))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn context(month: &str, today: &str) -> MonthContext {
        MonthContext::new(month, Date::parse(today).unwrap()).unwrap()
    }

    #[test]
    fn current_month_counts_up_to_today() {
        let context = context("2026-10", "2026-10-09");
        assert_eq!(context.daily_length(), 9);
        assert_eq!(context.days_left(), 22);
    }

    #[test]
    fn first_and_last_day_of_the_month_are_boundaries() {
        let first = context("2026-10", "2026-10-01");
        assert_eq!((first.daily_length(), first.days_left()), (1, 30));
        let last = context("2026-10", "2026-10-31");
        assert_eq!((last.daily_length(), last.days_left()), (31, 0));
    }

    #[test]
    fn a_past_month_is_whole_and_has_no_days_left() {
        let past = context("2026-09", "2026-10-09");
        assert_eq!((past.daily_length(), past.days_left()), (30, 0));
    }

    #[test]
    fn a_future_month_is_whole_and_every_day_is_left() {
        let future = context("2026-11", "2026-10-09");
        assert_eq!((future.daily_length(), future.days_left()), (30, 30));
    }

    #[test]
    fn february_length_follows_leap_years() {
        assert_eq!(context("2024-02", "2024-02-10").length(), 29);
        assert_eq!(context("2026-02", "2026-03-01").daily_length(), 28);
    }

    #[test]
    fn year_boundary_compares_by_year_first() {
        let past = context("2025-12", "2026-01-05");
        assert_eq!(past.days_left(), 0);
        assert_eq!(past.previous_month().unwrap(), "2025-11");
        assert_eq!(context("2026-01", "2026-01-05").previous_month().unwrap(), "2025-12");
    }

    #[test]
    fn normalize_month_pads_and_rejects_garbage() {
        assert_eq!(normalize_month("2026-1").unwrap(), "2026-01");
        assert_eq!(normalize_month("2026-12").unwrap(), "2026-12");
        assert!(normalize_month("2026-00").is_err());
    }

    #[test]
    fn month_text_is_normalised_and_bad_input_is_rejected() {
        assert_eq!(context("2026-1", "2026-01-05").month, "2026-01");
        let today = Date::parse("2026-10-09").unwrap();
        assert!(MonthContext::new("2026-13", today).is_err());
        assert!(MonthContext::new("garbage", today).is_err());
        let query = MonthQuery { month: "2026-10".into(), today: "2026-10-40".into() };
        assert!(query.resolve().is_err());
    }

    #[test]
    fn today_utc_reads_the_calendar_date_of_a_timestamp() {
        assert_eq!(today_utc(1_791_532_800_000).to_text(), "2026-10-09");
        assert_eq!(today_utc(1_791_532_800_000 + 16 * 3_600_000).to_text(), "2026-10-10");
        assert_eq!(today_utc(0).to_text(), "1970-01-01");
        assert_eq!(today_utc(-1).to_text(), "1969-12-31");
    }
}
