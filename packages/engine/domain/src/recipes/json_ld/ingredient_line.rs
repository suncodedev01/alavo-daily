use crate::recipes::json_ld::quantity::split_quantity;
use crate::recipes::json_ld::text::clean_text;
use crate::recipes::json_ld::units::{is_unit, MAX_UNIT_WORDS};
use crate::recipes::kinds::Aisle;
use crate::recipes::recipe::{IngredientInput, DEFAULT_UNIT};
use crate::shared::money::Money;

const FILLER_WORD: &str = "of";
const NAME_EDGE_SYMBOLS: &[char] = &[' ', ',', '.', '-', ';', ':'];

/// Splits a line such as `600 g đùi gà` into quantity, unit and name. A line without a leading
/// number is one portion of the whole text; a number without a known unit counts portions.
pub fn parse_ingredient_line(line: &str) -> IngredientInput {
    let cleaned = clean_text(line);
    let (quantity, after_quantity) = match split_quantity(&cleaned) {
        Some((quantity, rest)) if quantity > 0.0 => (Some(quantity), rest),
        _ => (None, cleaned.as_str()),
    };
    let words: Vec<&str> = after_quantity.split_whitespace().collect();
    let (unit, name_words) = match quantity {
        Some(_) => split_unit(&words),
        None => (None, words.as_slice()),
    };
    IngredientInput {
        name: name_from(name_words, &cleaned),
        quantity: quantity.unwrap_or(1.0),
        unit: unit.unwrap_or_else(|| DEFAULT_UNIT.to_string()),
        aisle: Aisle::Other,
        cost_vnd: Money(0),
    }
}

fn split_unit<'a>(words: &'a [&'a str]) -> (Option<String>, &'a [&'a str]) {
    for length in (1..=MAX_UNIT_WORDS.min(words.len())).rev() {
        let candidate = words[..length].join(" ").trim_end_matches('.').to_lowercase();
        if is_unit(&candidate) {
            return (Some(candidate), &words[length..]);
        }
    }
    (None, words)
}

fn name_from(words: &[&str], whole_line: &str) -> String {
    let words = match words.split_first() {
        Some((first, rest)) if first.eq_ignore_ascii_case(FILLER_WORD) => rest,
        _ => words,
    };
    let name = words.join(" ");
    let name = name.trim_matches(NAME_EDGE_SYMBOLS);
    if name.is_empty() { whole_line.to_string() } else { name.to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parsed(line: &str) -> (f64, String, String) {
        let ingredient = parse_ingredient_line(line);
        (ingredient.quantity, ingredient.unit, ingredient.name)
    }

    fn expect(line: &str, quantity: f64, unit: &str, name: &str) {
        assert_eq!(parsed(line), (quantity, unit.to_string(), name.to_string()), "{line}");
    }

    #[test]
    fn parses_a_metric_amount_before_a_vietnamese_name() {
        expect("600 g đùi gà", 600.0, "g", "đùi gà");
    }

    #[test]
    fn parses_a_vietnamese_counting_word_as_the_unit() {
        expect("2 củ hành", 2.0, "củ", "hành");
        expect("3 tép tỏi", 3.0, "tép", "tỏi");
    }

    #[test]
    fn parses_a_fraction_with_a_multi_word_unit() {
        expect("1/2 muỗng cà phê tiêu", 0.5, "muỗng cà phê", "tiêu");
        expect("2 muỗng canh nước mắm", 2.0, "muỗng canh", "nước mắm");
    }

    #[test]
    fn parses_a_mixed_number_with_a_vulgar_fraction() {
        expect("1 ½ cups flour", 1.5, "cups", "flour");
        expect("1 1/2 cups all-purpose flour", 1.5, "cups", "all-purpose flour");
    }

    #[test]
    fn parses_a_unit_attached_to_the_number() {
        expect("600g đùi gà", 600.0, "g", "đùi gà");
        expect("250ml nước cốt dừa", 250.0, "ml", "nước cốt dừa");
    }

    #[test]
    fn units_are_lowercased_and_lose_a_trailing_dot() {
        expect("2 Tbsp. olive oil", 2.0, "tbsp", "olive oil");
        expect("1 CUP sugar", 1.0, "cup", "sugar");
    }

    #[test]
    fn drops_the_filler_word_of() {
        expect("2 cups of flour", 2.0, "cups", "flour");
    }

    #[test]
    fn a_line_without_a_number_is_one_portion() {
        expect("Muối", 1.0, "phần", "Muối");
        expect("a pinch of salt", 1.0, "phần", "a pinch of salt");
    }

    #[test]
    fn a_number_without_a_known_unit_counts_portions() {
        expect("3 eggs", 3.0, "phần", "eggs");
        expect("4 quả trứng", 4.0, "quả", "trứng");
    }

    #[test]
    fn a_zero_quantity_counts_as_unknown() {
        expect("0 g muối", 1.0, "phần", "0 g muối");
    }

    #[test]
    fn a_line_that_is_only_an_amount_keeps_the_text_as_its_name() {
        expect("2 cups", 2.0, "cups", "2 cups");
    }

    #[test]
    fn strips_html_and_trailing_notes_punctuation() {
        expect("<b>200 g</b> thịt ba chỉ,", 200.0, "g", "thịt ba chỉ");
        expect("2 cloves garlic, minced", 2.0, "cloves", "garlic, minced");
    }

    #[test]
    fn a_range_uses_the_lower_amount() {
        expect("2-3 cloves garlic", 2.0, "cloves", "garlic");
    }

    #[test]
    fn parsed_ingredients_have_no_cost_and_the_other_aisle() {
        let ingredient = parse_ingredient_line("500 g cá lóc");
        assert_eq!(ingredient.aisle, Aisle::Other);
        assert_eq!(ingredient.cost_vnd, Money(0));
    }

    #[test]
    fn blank_text_still_gives_an_ingredient_row() {
        expect("   ", 1.0, "phần", "");
    }
}
