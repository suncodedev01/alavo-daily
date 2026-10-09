//! Units that can follow a quantity in an ingredient line, lowercase. Vietnamese counting words
//! (củ, tép, quả) are included because they play the role of a unit there.

pub const MAX_UNIT_WORDS: usize = 3;

const UNITS: &[&str] = &[
    "g", "gr", "gram", "grams", "kg", "mg", "ml", "l", "lít", "lit", "liter", "liters", "litre",
    "litres", "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "cup", "cups", "tbsp",
    "tsp", "tablespoon", "tablespoons", "teaspoon", "teaspoons", "clove", "cloves", "pinch",
    "dash", "can", "cans", "slice", "slices", "piece", "pieces", "stick", "sticks", "bunch",
    "handful", "package", "packages", "jar", "sprig", "sprigs", "head", "heads", "muỗng",
    "muỗng canh", "muỗng cà phê", "thìa", "thìa canh", "thìa cà phê", "chén", "bát", "tô", "ly",
    "cốc", "củ", "cây", "tép", "quả", "trái", "miếng", "lát", "lá", "nhánh", "khúc", "bó", "mớ",
    "nhúm", "nắm", "bộ", "gói", "hộp", "lon", "chai", "con", "cái",
];

pub fn is_unit(candidate: &str) -> bool {
    UNITS.contains(&candidate)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn knows_metric_imperial_and_vietnamese_units() {
        for unit in ["g", "kg", "ml", "cups", "tbsp", "củ", "muỗng cà phê", "tép"] {
            assert!(is_unit(unit), "{unit}");
        }
    }

    #[test]
    fn does_not_treat_food_names_as_units() {
        for word in ["gà", "flour", "hành", ""] {
            assert!(!is_unit(word), "{word}");
        }
    }

    #[test]
    fn no_unit_is_longer_than_the_word_limit() {
        for unit in UNITS {
            assert!(unit.split(' ').count() <= MAX_UNIT_WORDS, "{unit}");
        }
    }

    #[test]
    fn units_are_lowercase_and_unique() {
        let mut seen = std::collections::HashSet::new();
        for unit in UNITS {
            assert_eq!(unit.to_lowercase(), *unit);
            assert!(seen.insert(*unit), "{unit} listed twice");
        }
    }
}
