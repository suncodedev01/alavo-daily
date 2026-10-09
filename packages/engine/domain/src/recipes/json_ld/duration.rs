const MINUTES_PER_DAY: f64 = 1_440.0;
const MINUTES_PER_WEEK: f64 = 10_080.0;
const MINUTES_PER_HOUR: f64 = 60.0;

/// Minutes in an ISO-8601 duration such as `PT1H30M` or `P1DT2H`. `None` when the text is not a
/// duration or holds no time at all. Years and months are not durations of a fixed length, so
/// they make the text unusable.
pub fn parse_duration_minutes(text: &str) -> Option<i64> {
    let upper = text.trim().to_uppercase();
    let body = upper.strip_prefix('P')?;
    let mut total = 0.0;
    let mut number = String::new();
    let mut in_time = false;
    let mut components = 0;
    for symbol in body.chars() {
        if symbol == 'T' && number.is_empty() {
            in_time = true;
        } else if symbol.is_ascii_digit() || symbol == '.' || symbol == ',' {
            number.push(if symbol == ',' { '.' } else { symbol });
        } else {
            let amount: f64 = number.parse().ok()?;
            total += minutes_for(symbol, in_time, amount)?;
            number.clear();
            components += 1;
        }
    }
    if !number.is_empty() || components == 0 {
        return None;
    }
    Some(total.round() as i64)
}

fn minutes_for(symbol: char, in_time: bool, amount: f64) -> Option<f64> {
    match (symbol, in_time) {
        ('W', false) => Some(amount * MINUTES_PER_WEEK),
        ('D', false) => Some(amount * MINUTES_PER_DAY),
        ('H', true) => Some(amount * MINUTES_PER_HOUR),
        ('M', true) => Some(amount),
        ('S', true) => Some(amount / MINUTES_PER_HOUR),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_hours_and_minutes() {
        assert_eq!(parse_duration_minutes("PT1H30M"), Some(90));
        assert_eq!(parse_duration_minutes("PT45M"), Some(45));
        assert_eq!(parse_duration_minutes("PT2H"), Some(120));
    }

    #[test]
    fn reads_days_and_weeks() {
        assert_eq!(parse_duration_minutes("P1DT2H"), Some(1_560));
        assert_eq!(parse_duration_minutes("P1W"), Some(10_080));
    }

    #[test]
    fn is_case_insensitive_and_trims() {
        assert_eq!(parse_duration_minutes(" pt1h15m "), Some(75));
    }

    #[test]
    fn rounds_seconds_to_the_nearest_minute() {
        assert_eq!(parse_duration_minutes("PT30S"), Some(1));
        assert_eq!(parse_duration_minutes("PT20S"), Some(0));
        assert_eq!(parse_duration_minutes("PT1M40S"), Some(2));
    }

    #[test]
    fn reads_decimal_amounts() {
        assert_eq!(parse_duration_minutes("PT1.5H"), Some(90));
        assert_eq!(parse_duration_minutes("PT0,5H"), Some(30));
    }

    #[test]
    fn a_zero_duration_is_zero_minutes() {
        assert_eq!(parse_duration_minutes("PT0M"), Some(0));
    }

    #[test]
    fn rejects_text_that_is_not_a_duration() {
        for text in ["", "30 minutes", "PT", "P", "PT1H30", "PTM", "1H30M", "PT1X", "PT-5M"] {
            assert_eq!(parse_duration_minutes(text), None, "{text}");
        }
    }

    #[test]
    fn rejects_months_and_years() {
        assert_eq!(parse_duration_minutes("P1M"), None);
        assert_eq!(parse_duration_minutes("P1Y"), None);
    }

    #[test]
    fn rejects_a_time_unit_in_the_date_part_and_the_reverse() {
        assert_eq!(parse_duration_minutes("P30M"), None);
        assert_eq!(parse_duration_minutes("PT1D"), None);
    }
}
