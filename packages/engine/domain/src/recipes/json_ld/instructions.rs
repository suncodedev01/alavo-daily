use serde_json::{Map, Value};

use crate::recipes::json_ld::text::{clean_lines, clean_text};
use crate::recipes::recipe::StepInput;

/// Steps from `recipeInstructions`: a text, a list of texts, `HowToStep` objects, or
/// `HowToSection` objects holding their own steps. Sections are flattened in order.
pub fn parse_steps(instructions: Option<&Value>) -> Vec<StepInput> {
    let mut texts = Vec::new();
    if let Some(value) = instructions {
        collect_texts(value, &mut texts);
    }
    texts.into_iter().map(|text| StepInput { text, timer_min: 0 }).collect()
}

fn collect_texts(value: &Value, texts: &mut Vec<String>) {
    match value {
        Value::String(text) => texts.extend(clean_lines(text).iter().map(|line| strip_numbering(line))),
        Value::Array(items) => items.iter().for_each(|item| collect_texts(item, texts)),
        Value::Object(object) => collect_object_texts(object, texts),
        _ => {}
    }
}

fn collect_object_texts(object: &Map<String, Value>, texts: &mut Vec<String>) {
    if let Some(children) = object.get("itemListElement") {
        collect_texts(children, texts);
        return;
    }
    let step = ["text", "name"].iter().find_map(|key| object.get(*key)?.as_str());
    if let Some(text) = step.map(clean_text).filter(|text| !text.is_empty()) {
        texts.push(strip_numbering(&text));
    }
}

/// Removes a leading `1.` or `2)` that recipe sites put in front of a step.
fn strip_numbering(text: &str) -> String {
    let after_digits = text.trim_start_matches(|symbol: char| symbol.is_ascii_digit());
    let has_digits = after_digits.len() < text.len();
    match after_digits.strip_prefix(['.', ')']) {
        Some(rest) if has_digits && rest.starts_with(' ') => rest.trim().to_string(),
        _ => text.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn texts(value: Value) -> Vec<String> {
        parse_steps(Some(&value)).into_iter().map(|step| step.text).collect()
    }

    #[test]
    fn a_missing_field_gives_no_steps() {
        assert!(parse_steps(None).is_empty());
        assert!(texts(json!(null)).is_empty());
    }

    #[test]
    fn a_single_text_is_split_into_lines() {
        let lines = texts(json!("Rửa gà.\nChặt miếng.\n\nKho 30 phút."));
        assert_eq!(lines, ["Rửa gà.", "Chặt miếng.", "Kho 30 phút."]);
    }

    #[test]
    fn a_list_of_texts_gives_one_step_each() {
        assert_eq!(texts(json!(["Mix", "Bake"])), ["Mix", "Bake"]);
    }

    #[test]
    fn how_to_steps_use_their_text() {
        let steps = json!([
            { "@type": "HowToStep", "text": "Chần xương qua nước sôi." },
            { "@type": "HowToStep", "text": "Hầm 2 giờ." }
        ]);
        assert_eq!(texts(steps), ["Chần xương qua nước sôi.", "Hầm 2 giờ."]);
    }

    #[test]
    fn a_how_to_step_without_text_falls_back_to_its_name() {
        assert_eq!(texts(json!([{ "@type": "HowToStep", "name": "Preheat the oven" }])), ["Preheat the oven"]);
    }

    #[test]
    fn how_to_sections_are_flattened_in_order() {
        let sections = json!([
            { "@type": "HowToSection", "name": "Nước dùng", "itemListElement": [
                { "@type": "HowToStep", "text": "Hầm xương." }] },
            { "@type": "HowToSection", "name": "Hoàn thiện", "itemListElement": [
                { "@type": "HowToStep", "text": "Trụng bánh phở." },
                { "@type": "HowToStep", "text": "Chan nước dùng." }] }
        ]);
        assert_eq!(texts(sections), ["Hầm xương.", "Trụng bánh phở.", "Chan nước dùng."]);
    }

    #[test]
    fn a_single_object_instead_of_a_list_is_accepted() {
        assert_eq!(texts(json!({ "@type": "HowToStep", "text": "Serve." })), ["Serve."]);
    }

    #[test]
    fn html_in_a_step_is_cleaned() {
        let raw = json!([{ "text": "<p>Fry the <b>garlic</b> &amp; onion.</p>" }]);
        assert_eq!(texts(raw), ["Fry the garlic & onion."]);
    }

    #[test]
    fn empty_steps_are_dropped() {
        assert_eq!(texts(json!(["", "  ", { "text": "" }, "Eat"])), ["Eat"]);
    }

    #[test]
    fn leading_step_numbers_are_removed_but_other_numbers_stay() {
        let raw = json!(["1. Wash", "2) Chop", "10. Serve", "350 g flour in a bowl"]);
        assert_eq!(texts(raw), ["Wash", "Chop", "Serve", "350 g flour in a bowl"]);
    }

    #[test]
    fn timers_are_left_at_zero() {
        let steps = parse_steps(Some(&json!(["Simmer 30 minutes"])));
        assert_eq!(steps[0].timer_min, 0);
    }
}
