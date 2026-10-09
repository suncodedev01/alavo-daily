use crate::shared::date::Date;

/// Reads `dd/mm/yyyy`, `d-m-yyyy`, `dd.mm.yyyy`, `yyyy-mm-dd` and `yyyy/mm/dd`, with or without a
/// time after the date. A two-digit year is read as 20yy. The day always comes before the month
/// in the day-first layouts, which is how Vietnamese banks write dates.
pub fn parse_date(text: &str) -> Option<Date> {
    let date_part = text.trim().split(['T', ' ']).next()?;
    let numbers: Vec<&str> = date_part.split(['/', '-', '.']).collect();
    let [first, second, third] = numbers.as_slice() else {
        return None;
    };
    let (year, month, day) =
        if first.len() == 4 { (first, second, third) } else { (third, second, first) };
    let year = whole_year(year)?;
    let month = month.parse::<u32>().ok()?;
    let day = day.parse::<u32>().ok()?;
    Date::parse(&format!("{year:04}-{month:02}-{day:02}")).ok()
}

fn whole_year(text: &str) -> Option<i32> {
    let year = text.parse::<i32>().ok()?;
    match text.len() {
        2 => Some(2000 + year),
        4 => Some(year),
        _ => None,
    }
}

const CURRENCY_WORDS: [&str; 4] = ["vnd", "vnđ", "đ", "₫"];
const AMOUNT_LETTERS: &str = "0123456789.,+-−()'’ \u{a0}\u{202f}";
const MAX_DIGITS: usize = 15;

/// A signed whole-đồng amount from text such as `1.250.000`, `1,250,000`, `-65.000,00`,
/// `(65,000)`, `65000đ` or `650.000 DR`. `None` when the text holds anything else.
pub fn parse_amount(text: &str) -> Option<i64> {
    let lowered = text.trim().to_lowercase();
    let (without_side, side) = split_credit_debit_marker(&lowered);
    let plain = strip_currency(without_side);
    if !plain.chars().all(|letter| AMOUNT_LETTERS.contains(letter)) {
        return None;
    }
    let magnitude = magnitude_of(&plain)?;
    let negative = side == Some(Side::Debit) || is_negative(&plain);
    Some(if negative { -magnitude } else { magnitude })
}

#[derive(PartialEq, Clone, Copy)]
enum Side {
    Debit,
    Credit,
}

fn split_credit_debit_marker(text: &str) -> (&str, Option<Side>) {
    for (marker, side) in [("dr", Side::Debit), ("cr", Side::Credit)] {
        if let Some(rest) = text.strip_suffix(marker) {
            return (rest.trim_end(), Some(side));
        }
    }
    (text, None)
}

fn strip_currency(text: &str) -> String {
    let mut plain = text.to_string();
    for word in CURRENCY_WORDS {
        plain = plain.replace(word, "");
    }
    plain
}

fn is_negative(plain: &str) -> bool {
    let trimmed = plain.trim();
    trimmed.starts_with(['-', '−', '(']) || trimmed.ends_with('-')
}

fn magnitude_of(plain: &str) -> Option<i64> {
    let digits_and_marks: String = plain
        .chars()
        .filter(|letter| letter.is_ascii_digit() || matches!(letter, '.' | ','))
        .collect();
    if !digits_and_marks.chars().any(|letter| letter.is_ascii_digit()) {
        return None;
    }
    let (whole, fraction) = split_decimal(&digits_and_marks);
    if whole.len() > MAX_DIGITS {
        return None;
    }
    let whole_value = whole.parse::<i64>().unwrap_or(0);
    let rounds_up = fraction.chars().next().is_some_and(|digit| digit >= '5');
    Some(whole_value + i64::from(rounds_up))
}

/// Splits digits and separators into the whole part and the decimal digits. The separator that
/// comes last is the decimal one when both kinds appear. A single kind of separator is a
/// thousands mark when it repeats or is followed by exactly three digits.
fn split_decimal(text: &str) -> (String, String) {
    let last_dot = text.rfind('.');
    let last_comma = text.rfind(',');
    let decimal_at = match (last_dot, last_comma) {
        (Some(dot), Some(comma)) => Some(dot.max(comma)),
        (Some(position), None) | (None, Some(position)) => single_kind_decimal(text, position),
        (None, None) => None,
    };
    match decimal_at {
        Some(position) => (digits(&text[..position]), digits(&text[position + 1..])),
        None => (digits(text), String::new()),
    }
}

fn single_kind_decimal(text: &str, position: usize) -> Option<usize> {
    let mark = text.as_bytes()[position] as char;
    let repeats = text.matches(mark).count() > 1;
    let after = text.len() - position - 1;
    let leading_zero = digits(&text[..position]) == "0";
    (!repeats && (after != 3 || leading_zero)).then_some(position)
}

fn digits(text: &str) -> String {
    text.chars().filter(char::is_ascii_digit).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(text: &str) -> Option<String> {
        parse_date(text).map(Date::to_text)
    }

    #[test]
    fn day_first_dates_are_read_with_any_separator() {
        assert_eq!(date("09/10/2026").as_deref(), Some("2026-10-09"));
        assert_eq!(date("9-10-2026").as_deref(), Some("2026-10-09"));
        assert_eq!(date("09.10.2026").as_deref(), Some("2026-10-09"));
        assert_eq!(date("31/01/26").as_deref(), Some("2026-01-31"));
    }

    #[test]
    fn year_first_dates_are_read_as_iso() {
        assert_eq!(date("2026-10-09").as_deref(), Some("2026-10-09"));
        assert_eq!(date("2026/10/09").as_deref(), Some("2026-10-09"));
    }

    #[test]
    fn a_time_after_the_date_is_ignored() {
        assert_eq!(date("09/10/2026 14:32:11").as_deref(), Some("2026-10-09"));
        assert_eq!(date("2026-10-09T08:00:00Z").as_deref(), Some("2026-10-09"));
    }

    #[test]
    fn impossible_or_malformed_dates_are_rejected() {
        for bad in ["30/02/2026", "13/13/2026", "2026-10", "09/10", "hôm nay", "", "1/2/20267"] {
            assert_eq!(date(bad), None, "{bad}");
        }
    }

    #[test]
    fn thousands_separators_of_either_kind_are_dropped() {
        assert_eq!(parse_amount("1.250.000"), Some(1_250_000));
        assert_eq!(parse_amount("1,250,000"), Some(1_250_000));
        assert_eq!(parse_amount("65.000"), Some(65_000));
        assert_eq!(parse_amount("65,000"), Some(65_000));
        assert_eq!(parse_amount("1 250 000"), Some(1_250_000));
        assert_eq!(parse_amount("65000"), Some(65_000));
    }

    #[test]
    fn a_decimal_part_is_rounded_to_whole_dong() {
        assert_eq!(parse_amount("1.250.000,49"), Some(1_250_000));
        assert_eq!(parse_amount("1,250,000.50"), Some(1_250_001));
        assert_eq!(parse_amount("65.000,00"), Some(65_000));
        assert_eq!(parse_amount("0,75"), Some(1));
    }

    #[test]
    fn signs_parentheses_and_debit_credit_markers_make_an_amount_negative_or_positive() {
        assert_eq!(parse_amount("-65.000"), Some(-65_000));
        assert_eq!(parse_amount("−65.000"), Some(-65_000));
        assert_eq!(parse_amount("(65,000)"), Some(-65_000));
        assert_eq!(parse_amount("65.000-"), Some(-65_000));
        assert_eq!(parse_amount("+28.000.000"), Some(28_000_000));
        assert_eq!(parse_amount("650.000 DR"), Some(-650_000));
        assert_eq!(parse_amount("650.000 CR"), Some(650_000));
    }

    #[test]
    fn currency_words_are_ignored() {
        assert_eq!(parse_amount("65000đ"), Some(65_000));
        assert_eq!(parse_amount("65.000 VND"), Some(65_000));
        assert_eq!(parse_amount("₫65,000"), Some(65_000));
    }

    #[test]
    fn text_that_is_not_an_amount_is_rejected() {
        for bad in ["", "   ", "abc", "Grab 123", "--", "12/10/2026 5"] {
            assert_eq!(parse_amount(bad), None, "{bad}");
        }
    }

    #[test]
    fn zero_is_a_valid_amount() {
        assert_eq!(parse_amount("0"), Some(0));
        assert_eq!(parse_amount("0,00"), Some(0));
    }

    #[test]
    fn absurdly_long_numbers_are_rejected_instead_of_overflowing() {
        assert_eq!(parse_amount("9999999999999999999"), None);
    }
}
