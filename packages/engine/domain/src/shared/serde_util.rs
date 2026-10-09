use serde::{Deserialize, Deserializer};

/// Tells "field missing" apart from "field is null" in an update payload:
/// missing is `None` (leave unchanged), `null` is `Some(None)` (clear it), a value is
/// `Some(Some(value))`. Use as `#[serde(default, deserialize_with = "double_option")]`.
pub fn double_option<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}

#[cfg(test)]
mod tests {
    use serde::Deserialize;

    use super::*;

    #[derive(Deserialize)]
    struct Update {
        #[serde(default, deserialize_with = "double_option")]
        budget: Option<Option<i64>>,
    }

    #[test]
    fn missing_null_and_value_are_three_different_things() {
        let missing: Update = serde_json::from_str("{}").unwrap();
        let cleared: Update = serde_json::from_str(r#"{"budget":null}"#).unwrap();
        let set: Update = serde_json::from_str(r#"{"budget":5}"#).unwrap();
        assert_eq!(missing.budget, None);
        assert_eq!(cleared.budget, Some(None));
        assert_eq!(set.budget, Some(Some(5)));
    }
}
