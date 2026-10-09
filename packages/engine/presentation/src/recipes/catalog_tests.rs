use serde_json::{json, Value};

use super::test_harness::{error_code, recipe_payload, Harness};

#[test]
fn create_returns_the_recipe_in_camel_case() {
    let app = Harness::start();
    let recipe = app.create("Gà kho");
    assert_eq!(recipe["name"], "Gà kho");
    assert_eq!(recipe["prepMin"], 15);
    assert_eq!(recipe["cookMin"], 40);
    assert_eq!(recipe["level"], "easy");
    assert_eq!(recipe["favorite"], false);
    assert_eq!(recipe["costVnd"], 54000);
    assert_eq!(recipe["ingredientCount"], 2);
    assert_eq!(recipe["kcal"], 420);
    assert!(recipe["id"].is_string() && recipe["createdAt"].is_i64() && recipe["updatedAt"].is_i64());
}

#[test]
fn create_returns_flat_ingredients_and_steps_with_positions() {
    let app = Harness::start();
    let recipe = app.create("Gà kho");
    let first = &recipe["ingredients"][0];
    assert_eq!(first["name"], "Đùi gà");
    assert_eq!(first["quantity"], 600.0);
    assert_eq!(first["aisle"], "meat_fish");
    assert_eq!(first["costVnd"], 54000);
    assert_eq!(first["position"], "0001");
    assert_eq!(recipe["ingredients"][1]["costVnd"], 0);
    assert_eq!(recipe["steps"][0]["timerMin"], 15);
    assert_eq!(recipe["steps"][1]["timerMin"], 0);
    assert_eq!(recipe["steps"][1]["position"], "0002");
}

#[test]
fn create_accepts_a_minimal_payload_and_fills_the_defaults() {
    let app = Harness::start();
    let fish = json!({ "name": "Cá", "quantity": 1, "unit": "con", "aisle": "other" });
    let recipe = app.call(
        "recipes.create",
        json!({ "name": "Canh", "servings": 2, "ingredients": [fish] }),
    );
    assert_eq!(recipe["level"], "medium");
    assert_eq!(recipe["icon"], "cooking-pot");
    assert_eq!(recipe["kcal"], Value::Null);
    assert_eq!(recipe["note"], "");
    assert_eq!(recipe["tags"], json!([]));
    assert_eq!(recipe["steps"], json!([]));
}

#[test]
fn create_with_invalid_data_is_a_validation_error() {
    let app = Harness::start();
    let mut payload = recipe_payload("Gà kho");
    payload["servings"] = json!(0);
    assert_eq!(error_code(&app.fail("recipes.create", payload)), "validation");
    let mut payload = recipe_payload("");
    payload["name"] = json!("  ");
    assert_eq!(error_code(&app.fail("recipes.create", payload)), "validation");
}

#[test]
fn a_payload_of_the_wrong_shape_is_a_validation_error() {
    let app = Harness::start();
    let error = app.fail("recipes.create", json!({ "name": "x" }));
    assert_eq!(error_code(&error), "validation");
    let error = app.fail("recipes.get", json!({}));
    assert_eq!(error_code(&error), "validation");
    let mut payload = recipe_payload("Gà kho");
    payload["ingredients"][0]["aisle"] = json!("Thịt & cá");
    assert_eq!(error_code(&app.fail("recipes.create", payload)), "validation");
}

#[test]
fn get_returns_the_recipe_and_unknown_ids_are_not_found() {
    let app = Harness::start();
    let created = app.create("Gà kho");
    let loaded = app.call("recipes.get", json!({ "id": created["id"] }));
    assert_eq!(loaded, created);
    assert_eq!(error_code(&app.fail("recipes.get", json!({ "id": "nope" }))), "not_found");
}

#[test]
fn update_takes_the_id_next_to_the_recipe_fields_and_replaces_everything() {
    let app = Harness::start();
    let created = app.create("Gà kho");
    let mut payload = recipe_payload("Gà rang");
    payload["id"] = created["id"].clone();
    payload["ingredients"] = json!([{ "name": "Tôm", "quantity": 0.5, "unit": "kg", "aisle": "meat_fish" }]);
    payload["steps"] = json!([]);
    let updated = app.call("recipes.update", payload);
    assert_eq!(updated["id"], created["id"]);
    assert_eq!(updated["name"], "Gà rang");
    assert_eq!(updated["ingredients"].as_array().unwrap().len(), 1);
    assert_eq!(updated["ingredients"][0]["quantity"], 0.5);
    assert_eq!(updated["steps"], json!([]));
}

#[test]
fn update_of_an_unknown_recipe_is_not_found() {
    let app = Harness::start();
    let mut payload = recipe_payload("Gà rang");
    payload["id"] = json!("nope");
    assert_eq!(error_code(&app.fail("recipes.update", payload)), "not_found");
}

#[test]
fn set_favorite_returns_the_updated_recipe() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    let favorite = app.call("recipes.set_favorite", json!({ "id": id, "favorite": true }));
    assert_eq!(favorite["favorite"], true);
    let error = app.fail("recipes.set_favorite", json!({ "id": "nope", "favorite": true }));
    assert_eq!(error_code(&error), "not_found");
}

#[test]
fn list_works_without_a_payload_and_returns_summaries() {
    let app = Harness::start();
    app.create("Phở");
    app.create("Bún chả");
    let list = app.call("recipes.list", Value::Null);
    assert_eq!(list[0]["name"], "Bún chả");
    assert_eq!(list[1]["name"], "Phở");
    assert_eq!(list[0]["costVnd"], 54000);
    assert_eq!(list[0]["ingredientCount"], 2);
    assert!(list[0].get("ingredients").is_none());
}

#[test]
fn list_filters_by_query_and_by_the_favorites_tag() {
    let app = Harness::start();
    app.create("Phở");
    let id = app.create("Bún chả")["id"].clone();
    app.call("recipes.set_favorite", json!({ "id": id, "favorite": true }));
    let by_name = app.call("recipes.list", json!({ "query": "PHỞ" }));
    assert_eq!(by_name.as_array().unwrap().len(), 1);
    let favorites = app.call("recipes.list", json!({ "tag": "favorites" }));
    assert_eq!(favorites[0]["name"], "Bún chả");
    let by_tag = app.call("recipes.list", json!({ "tag": "Món chính" }));
    assert_eq!(by_tag.as_array().unwrap().len(), 2);
}

#[test]
fn delete_returns_an_empty_object_and_hides_the_recipe() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    assert_eq!(app.call("recipes.delete", json!({ "id": id })), json!({}));
    assert_eq!(app.call("recipes.list", Value::Null), json!([]));
    assert_eq!(error_code(&app.fail("recipes.delete", json!({ "id": id }))), "not_found");
}

#[test]
fn parse_json_ld_returns_a_recipe_input_in_camel_case() {
    let app = Harness::start();
    let document = r#"{"@type":"Recipe","name":"Gà kho","prepTime":"PT15M","cookTime":"PT40M",
        "recipeYield":"4 servings","recipeIngredient":["600 g đùi gà","2 củ hành"],
        "recipeInstructions":[{"@type":"HowToStep","text":"Kho gà."}]}"#;
    let input = app.call("recipes.parse_json_ld", json!({ "json": document }));
    assert_eq!(input["name"], "Gà kho");
    assert_eq!((input["prepMin"].as_i64(), input["cookMin"].as_i64()), (Some(15), Some(40)));
    assert_eq!(input["servings"], 4);
    let chicken = json!({
        "name": "đùi gà", "quantity": 600.0, "unit": "g", "aisle": "other", "costVnd": 0
    });
    assert_eq!(input["ingredients"][0], chicken);
    assert_eq!(input["ingredients"][1]["unit"], "củ");
    assert_eq!(input["steps"][0], json!({ "text": "Kho gà.", "timerMin": 0 }));
    assert_eq!(input["level"], "medium");
}

#[test]
fn parse_json_ld_result_can_be_sent_straight_to_create() {
    let app = Harness::start();
    let document = r#"{"@type":"Recipe","name":"Gà kho","recipeIngredient":["600 g đùi gà"]}"#;
    let input = app.call("recipes.parse_json_ld", json!({ "json": document }));
    let recipe = app.call("recipes.create", input);
    assert_eq!(recipe["name"], "Gà kho");
    assert_eq!(recipe["ingredients"][0]["name"], "đùi gà");
}

#[test]
fn parse_json_ld_returns_null_when_there_is_no_recipe_and_an_error_for_broken_json() {
    let app = Harness::start();
    let none = app.call("recipes.parse_json_ld", json!({ "json": r#"{"@type":"Article"}"# }));
    assert_eq!(none, Value::Null);
    let error = app.fail("recipes.parse_json_ld", json!({ "json": "<html>" }));
    assert_eq!(error_code(&error), "validation");
}
