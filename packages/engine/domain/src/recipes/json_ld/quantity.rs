//! The amount at the start of an ingredient line: `600`, `1.5`, `1,5`, `1/2`, `1 1/2`, `½`,
//! `1½`, `2-3`.

const VULGAR_FRACTIONS: &[(char, f64)] = &[
    ('½', 0.5),
    ('⅓', 1.0 / 3.0),
    ('⅔', 2.0 / 3.0),
    ('¼', 0.25),
    ('¾', 0.75),
    ('⅛', 0.125),
];
const THOUSANDS_GROUP: usize = 3;

/// The leading quantity and the text after it. A range such as `2-3` yields its first number.
pub fn split_quantity(text: &str) -> Option<(f64, &str)> {
    let text = text.trim_start();
    let (value, rest) = match take_vulgar(text) {
        Some(found) => found,
        None => take_number(text)?,
    };
    Some((value, skip_range_end(rest)))
}

fn take_number(text: &str) -> Option<(f64, &str)> {
    let (whole, rest) = take_digits(text);
    if whole.is_empty() {
        return None;
    }
    if let Some((value, rest)) = take_decimal(whole, rest) {
        return Some((value, rest));
    }
    let whole: f64 = whole.parse().ok()?;
    if let Some((fraction, rest)) = take_slash_fraction(whole, rest) {
        return Some((fraction, rest));
    }
    let (extra, rest) = take_mixed_part(rest).unwrap_or((0.0, rest));
    Some((whole + extra, rest))
}

fn take_decimal<'a>(whole: &str, rest: &'a str) -> Option<(f64, &'a str)> {
    let separator = rest.chars().next().filter(|symbol| matches!(symbol, '.' | ','))?;
    let (fraction, after) = take_digits(&rest[1..]);
    if fraction.is_empty() {
        return None;
    }
    let is_thousands = separator == ',' && fraction.len() == THOUSANDS_GROUP;
    let text = if is_thousands { format!("{whole}{fraction}") } else { format!("{whole}.{fraction}") };
    Some((text.parse().ok()?, after))
}

fn take_slash_fraction(numerator: f64, rest: &str) -> Option<(f64, &str)> {
    let (denominator, after) = take_digits(rest.strip_prefix('/')?);
    let denominator: f64 = denominator.parse().ok().filter(|value| *value > 0.0)?;
    Some((numerator / denominator, after))
}

fn take_mixed_part(rest: &str) -> Option<(f64, &str)> {
    let rest = rest.trim_start();
    if let Some(found) = take_vulgar(rest) {
        return Some(found);
    }
    let (numerator, after) = take_digits(rest);
    take_slash_fraction(numerator.parse().ok()?, after)
}

fn take_vulgar(text: &str) -> Option<(f64, &str)> {
    let symbol = text.chars().next()?;
    let value = VULGAR_FRACTIONS.iter().find(|(own, _)| *own == symbol)?.1;
    Some((value, &text[symbol.len_utf8()..]))
}

fn take_digits(text: &str) -> (&str, &str) {
    let end = text.find(|symbol: char| !symbol.is_ascii_digit()).unwrap_or(text.len());
    text.split_at(end)
}

fn skip_range_end(rest: &str) -> &str {
    let Some(after_dash) = rest.strip_prefix(['-', '–']) else {
        return rest;
    };
    match take_number(after_dash) {
        Some((_, after_second)) => after_second,
        None => rest,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn quantity(text: &str) -> Option<(f64, &str)> {
        split_quantity(text)
    }

    #[test]
    fn reads_whole_numbers() {
        assert_eq!(quantity("600 g đùi gà"), Some((600.0, " g đùi gà")));
    }

    #[test]
    fn reads_decimals_with_a_dot_or_a_comma() {
        assert_eq!(quantity("1.5 kg"), Some((1.5, " kg")));
        assert_eq!(quantity("1,5 kg"), Some((1.5, " kg")));
        assert_eq!(quantity("0,25 l"), Some((0.25, " l")));
    }

    #[test]
    fn a_comma_before_three_digits_is_a_thousands_separator() {
        assert_eq!(quantity("1,000 ml"), Some((1000.0, " ml")));
    }

    #[test]
    fn reads_plain_fractions() {
        assert_eq!(quantity("1/2 muỗng"), Some((0.5, " muỗng")));
        assert_eq!(quantity("3/4 cup"), Some((0.75, " cup")));
    }

    #[test]
    fn reads_mixed_numbers_with_a_slash_fraction() {
        assert_eq!(quantity("1 1/2 cups flour"), Some((1.5, " cups flour")));
        assert_eq!(quantity("2 3/4 cups"), Some((2.75, " cups")));
    }

    #[test]
    fn reads_vulgar_fractions_alone_and_after_a_whole_number() {
        assert_eq!(quantity("½ tsp salt"), Some((0.5, " tsp salt")));
        assert_eq!(quantity("1½ cups"), Some((1.5, " cups")));
        assert_eq!(quantity("1 ½ cups flour"), Some((1.5, " cups flour")));
        assert_eq!(quantity("2 ¾ cups"), Some((2.75, " cups")));
    }

    #[test]
    fn a_range_yields_its_first_number() {
        assert_eq!(quantity("2-3 cloves garlic"), Some((2.0, " cloves garlic")));
        assert_eq!(quantity("1–2 tsp"), Some((1.0, " tsp")));
    }

    #[test]
    fn a_dash_that_is_not_a_range_is_left_alone() {
        assert_eq!(quantity("1 -inch piece"), Some((1.0, " -inch piece")));
        assert_eq!(quantity("1-inch piece"), Some((1.0, "-inch piece")));
    }

    #[test]
    fn a_unit_may_touch_the_number() {
        assert_eq!(quantity("600g đùi gà"), Some((600.0, "g đùi gà")));
    }

    #[test]
    fn skips_leading_spaces() {
        assert_eq!(quantity("   2 củ"), Some((2.0, " củ")));
    }

    #[test]
    fn text_without_a_leading_number_has_no_quantity() {
        assert_eq!(quantity("muối"), None);
        assert_eq!(quantity(""), None);
        assert_eq!(quantity("a pinch of salt"), None);
    }

    #[test]
    fn a_zero_denominator_is_not_a_fraction() {
        assert_eq!(quantity("1/0 cup"), Some((1.0, "/0 cup")));
    }
}
