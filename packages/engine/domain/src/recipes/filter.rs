use serde::Deserialize;

use crate::recipes::recipe::RecipeRecord;

/// The special `tag` value that selects favorites instead of a tag.
pub const FAVORITES_TAG: &str = "favorites";

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct RecipeFilter {
    pub query: Option<String>,
    pub tag: Option<String>,
}

impl RecipeFilter {
    pub fn matches(&self, record: &RecipeRecord) -> bool {
        self.matches_query(&record.body.name) && self.matches_tag(record)
    }

    fn matches_query(&self, name: &str) -> bool {
        match self.query.as_deref().map(str::trim) {
            Some(query) if !query.is_empty() => name.to_lowercase().contains(&query.to_lowercase()),
            _ => true,
        }
    }

    fn matches_tag(&self, record: &RecipeRecord) -> bool {
        match self.tag.as_deref().map(str::trim) {
            Some(FAVORITES_TAG) => record.favorite,
            Some(tag) if !tag.is_empty() => record.body.tags.iter().any(|own| own == tag),
            _ => true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::recipes::recipe::tests::record;

    fn filter(query: Option<&str>, tag: Option<&str>) -> RecipeFilter {
        RecipeFilter { query: query.map(String::from), tag: tag.map(String::from) }
    }

    #[test]
    fn an_empty_filter_matches_everything() {
        assert!(RecipeFilter::default().matches(&record("1", "Gà kho")));
        assert!(filter(Some("  "), Some("")).matches(&record("1", "Gà kho")));
    }

    #[test]
    fn query_matches_part_of_the_name_ignoring_case() {
        let recipe = record("1", "Gà Kho Gừng");
        assert!(filter(Some("kho g"), None).matches(&recipe));
        assert!(filter(Some("GÀ"), None).matches(&recipe));
        assert!(!filter(Some("phở"), None).matches(&recipe));
    }

    #[test]
    fn tag_must_match_exactly() {
        let recipe = record("1", "Canh chua");
        assert!(filter(None, Some("Canh")).matches(&recipe));
        assert!(!filter(None, Some("Can")).matches(&recipe));
        assert!(!filter(None, Some("canh")).matches(&recipe));
    }

    #[test]
    fn favorites_tag_selects_by_the_favorite_flag() {
        let mut recipe = record("1", "Canh chua");
        assert!(!filter(None, Some("favorites")).matches(&recipe));
        recipe.favorite = true;
        assert!(filter(None, Some("favorites")).matches(&recipe));
    }

    #[test]
    fn query_and_tag_both_have_to_match() {
        let recipe = record("1", "Canh chua");
        assert!(filter(Some("chua"), Some("Canh")).matches(&recipe));
        assert!(!filter(Some("phở"), Some("Canh")).matches(&recipe));
    }

    #[test]
    fn payload_fields_are_optional() {
        let parsed: RecipeFilter = serde_json::from_str("{}").unwrap();
        assert!(parsed.query.is_none() && parsed.tag.is_none());
    }
}
