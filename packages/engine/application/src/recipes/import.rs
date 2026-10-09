use alavo_domain::recipes::json_ld::parse_recipe;
use alavo_domain::recipes::recipe::RecipeInput;
use alavo_domain::shared::error::EngineError;

/// Reads a schema.org Recipe JSON-LD document into a draft for the recipe form. `None` when the
/// document is valid JSON but holds no recipe; text that is not JSON is a validation error.
pub fn parse_json_ld(json: &str) -> Result<Option<RecipeInput>, EngineError> {
    parse_recipe(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_recipe_document_becomes_a_draft() {
        let json = r#"{"@type":"Recipe","name":"Canh chua","recipeIngredient":["500 g cá lóc"]}"#;
        let draft = parse_json_ld(json).unwrap().unwrap();
        assert_eq!(draft.body.name, "Canh chua");
        assert_eq!(draft.ingredients[0].unit, "g");
    }

    #[test]
    fn a_document_without_a_recipe_gives_none() {
        assert!(parse_json_ld(r#"{"@type":"Article"}"#).unwrap().is_none());
    }

    #[test]
    fn broken_json_is_an_error_not_none() {
        assert!(parse_json_ld("{").is_err());
    }
}
