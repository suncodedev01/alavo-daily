use serde_json::{Map, Value};

pub type Row = Map<String, Value>;

/// Reads a whole number out of JSON, accepting `5` and `5.0` because a round trip through
/// JavaScript turns the second into the first.
pub fn integer(value: Option<&Value>) -> Option<i64> {
    let number = value?.as_number()?;
    number.as_i64().or_else(|| {
        let float = number.as_f64()?;
        (float.fract() == 0.0 && float.abs() < 9e15).then_some(float as i64)
    })
}

/// A string that is equal for two JSON values that mean the same stored value, and that sorts
/// the same on every device. Used to compare rows and to break ties between equal clocks.
pub fn canonical(value: &Value) -> String {
    match value.as_number() {
        Some(number) => canonical_number(number),
        None => value.to_string(),
    }
}

fn canonical_number(number: &serde_json::Number) -> String {
    match integer(Some(&Value::Number(number.clone()))) {
        Some(whole) => whole.to_string(),
        None => number.as_f64().map_or_else(|| number.to_string(), |float| float.to_string()),
    }
}

pub fn canonical_columns(row: &Row, columns: &[String]) -> String {
    let mut names: Vec<&String> = columns.iter().collect();
    names.sort();
    let parts = names.iter().map(|name| {
        let value = row.get(name.as_str()).map_or_else(|| "null".to_string(), canonical);
        format!("{name}={value}")
    });
    parts.collect::<Vec<_>>().join("\u{1f}")
}

pub fn same_row(left: &Row, right: &Row) -> bool {
    left.len() == right.len()
        && left.iter().all(|(name, value)| {
            right.get(name).is_some_and(|other| canonical(value) == canonical(other))
        })
}

/// Parses a `field_updated_at` value, stored as JSON text in the table and sent either as text
/// or as an object in an event.
pub fn read_stamps(value: Option<&Value>) -> Map<String, Value> {
    match value {
        Some(Value::String(text)) => serde_json::from_str(text).unwrap_or_default(),
        Some(Value::Object(map)) => map.clone(),
        _ => Map::new(),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn whole_floats_and_integers_are_the_same_value() {
        assert_eq!(canonical(&json!(2.0)), canonical(&json!(2)));
        assert_ne!(canonical(&json!(2.5)), canonical(&json!(2)));
    }

    #[test]
    fn integer_accepts_whole_floats_only() {
        assert_eq!(integer(Some(&json!(7.0))), Some(7));
        assert_eq!(integer(Some(&json!(7.5))), None);
        assert_eq!(integer(Some(&json!("7"))), None);
    }

    #[test]
    fn stamps_are_read_from_text_or_object() {
        let from_text = read_stamps(Some(&json!(r#"{"name":5}"#)));
        let from_object = read_stamps(Some(&json!({ "name": 5 })));
        assert_eq!(from_text, from_object);
        assert!(read_stamps(Some(&json!("not json"))).is_empty());
    }
}
