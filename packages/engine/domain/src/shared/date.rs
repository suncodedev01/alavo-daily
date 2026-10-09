//! Calendar dates as `YYYY-MM-DD` text and months as `YYYY-MM`. The engine never reads a clock
//! or a timezone for these: callers pass the dates in.

use crate::shared::error::EngineError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Date {
    pub year: i32,
    pub month: u32,
    pub day: u32,
}

impl Date {
    pub fn parse(text: &str) -> Result<Date, EngineError> {
        let mut parts = text.split('-');
        let year = parts.next().and_then(|part| part.parse::<i32>().ok());
        let month = parts.next().and_then(|part| part.parse::<u32>().ok());
        let day = parts.next().and_then(|part| part.parse::<u32>().ok());
        match (year, month, day, parts.next()) {
            (Some(year), Some(month), Some(day), None)
                if (1..=12).contains(&month) && day >= 1 && day <= days_in_month(year, month) =>
            {
                Ok(Date { year, month, day })
            }
            _ => Err(EngineError::validation(format!("invalid date {text}"))),
        }
    }

    pub fn to_text(self) -> String {
        format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
    }

    pub fn month_text(self) -> String {
        format!("{:04}-{:02}", self.year, self.month)
    }

    /// Days since 1970-01-01. Used for date arithmetic.
    pub fn to_days(self) -> i64 {
        let year = i64::from(self.year) - i64::from(self.month <= 2);
        let era = year.div_euclid(400);
        let year_of_era = year - era * 400;
        let month = i64::from(self.month);
        let shifted = if month > 2 { month - 3 } else { month + 9 };
        let day_of_year = (153 * shifted + 2) / 5 + i64::from(self.day) - 1;
        let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
        era * 146_097 + day_of_era - 719_468
    }

    pub fn from_days(days: i64) -> Date {
        let shifted = days + 719_468;
        let era = shifted.div_euclid(146_097);
        let day_of_era = shifted - era * 146_097;
        let year_of_era =
            (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
        let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
        let month_index = (5 * day_of_year + 2) / 153;
        let day = (day_of_year - (153 * month_index + 2) / 5 + 1) as u32;
        let month = if month_index < 10 { month_index + 3 } else { month_index - 9 } as u32;
        let year = (year_of_era + era * 400) as i32 + i32::from(month <= 2);
        Date { year, month, day }
    }

    pub fn add_days(self, days: i64) -> Date {
        Date::from_days(self.to_days() + days)
    }
}

pub fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

pub fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        _ if is_leap_year(year) => 29,
        _ => 28,
    }
}

/// `YYYY-MM` of the month before `month`.
pub fn previous_month(month: &str) -> Result<String, EngineError> {
    let (year, number) = parse_month(month)?;
    Ok(if number == 1 {
        format!("{:04}-12", year - 1)
    } else {
        format!("{:04}-{:02}", year, number - 1)
    })
}

/// `(year, month)` of a `YYYY-MM` text.
pub fn parse_month(month: &str) -> Result<(i32, u32), EngineError> {
    let date = Date::parse(&format!("{month}-01"))?;
    Ok((date.year, date.month))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_accepts_real_dates_and_rejects_impossible_ones() {
        assert!(Date::parse("2026-10-09").is_ok());
        assert!(Date::parse("2024-02-29").is_ok());
        assert!(Date::parse("2026-02-29").is_err());
        assert!(Date::parse("2026-13-01").is_err());
        assert!(Date::parse("2026-10").is_err());
        assert!(Date::parse("garbage").is_err());
    }

    #[test]
    fn days_round_trip_across_month_year_and_leap_boundaries() {
        for text in ["1970-01-01", "2024-02-29", "2026-12-31", "2027-01-01", "2100-03-01"] {
            let date = Date::parse(text).unwrap();
            assert_eq!(Date::from_days(date.to_days()), date);
        }
    }

    #[test]
    fn add_days_crosses_months_and_years() {
        let start = Date::parse("2026-12-30").unwrap();
        assert_eq!(start.add_days(3).to_text(), "2027-01-02");
        assert_eq!(start.add_days(-30).to_text(), "2026-11-30");
    }

    #[test]
    fn weekday_math_matches_a_known_date() {
        // 2026-10-09 is a Friday; 1970-01-01 (day 0) was a Thursday.
        let weekday = (Date::parse("2026-10-09").unwrap().to_days() + 4).rem_euclid(7);
        assert_eq!(weekday, 5);
    }

    #[test]
    fn days_in_month_handles_february() {
        assert_eq!(days_in_month(2024, 2), 29);
        assert_eq!(days_in_month(2026, 2), 28);
        assert_eq!(days_in_month(2100, 2), 28);
        assert_eq!(days_in_month(2000, 2), 29);
    }

    #[test]
    fn previous_month_wraps_the_year() {
        assert_eq!(previous_month("2026-01").unwrap(), "2025-12");
        assert_eq!(previous_month("2026-10").unwrap(), "2026-09");
    }
}
