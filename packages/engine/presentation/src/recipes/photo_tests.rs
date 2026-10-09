use serde_json::{json, Value};

use super::test_harness::{error_code, Harness};

const PHOTO: &str = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";

fn set_photo(app: &Harness, id: &Value, data_url: Value) -> Value {
    app.call("recipes.set_photo", json!({ "id": id, "dataUrl": data_url }))
}

#[test]
fn a_new_recipe_has_a_null_photo() {
    let app = Harness::start();
    let recipe = app.create("Gà kho");
    assert_eq!(recipe["photo"], Value::Null);
}

#[test]
fn set_photo_returns_the_recipe_with_the_photo_and_get_returns_it_again() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    let recipe = set_photo(&app, &id, json!(PHOTO));
    assert_eq!(recipe["photo"], PHOTO);
    assert_eq!(recipe["name"], "Gà kho");
    assert_eq!(app.call("recipes.get", json!({ "id": id }))["photo"], PHOTO);
}

#[test]
fn the_list_stays_light_and_has_no_photo() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    set_photo(&app, &id, json!(PHOTO));
    let list = app.call("recipes.list", json!({}));
    assert!(list[0].get("photo").is_none());
}

#[test]
fn a_null_or_missing_data_url_removes_the_photo() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    set_photo(&app, &id, json!(PHOTO));
    assert_eq!(set_photo(&app, &id, Value::Null)["photo"], Value::Null);
    set_photo(&app, &id, json!(PHOTO));
    let removed = app.call("recipes.set_photo", json!({ "id": id }));
    assert_eq!(removed["photo"], Value::Null);
}

#[test]
fn set_photo_rejects_anything_that_is_not_a_small_image() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    for bad in ["https://example.com/a.jpg", "data:text/plain;base64,AAAA", ""] {
        let error = app.fail("recipes.set_photo", json!({ "id": id, "dataUrl": bad }));
        assert_eq!(error_code(&error), "validation", "{bad}");
    }
    let too_big = format!("data:image/jpeg;base64,{}", "A".repeat(401 * 1024));
    let error = app.fail("recipes.set_photo", json!({ "id": id, "dataUrl": too_big }));
    assert_eq!(error_code(&error), "validation");
    assert!(error["message"].as_str().unwrap().starts_with("photo is larger than"));
}

#[test]
fn set_photo_of_an_unknown_recipe_is_not_found() {
    let app = Harness::start();
    let error = app.fail("recipes.set_photo", json!({ "id": "nope", "dataUrl": PHOTO }));
    assert_eq!(error_code(&error), "not_found");
}

#[test]
fn editing_the_recipe_keeps_the_photo() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    set_photo(&app, &id, json!(PHOTO));
    let mut payload = super::test_harness::recipe_payload("Gà rang");
    payload["id"] = id.clone();
    let updated = app.call("recipes.update", payload);
    assert_eq!(updated["photo"], PHOTO);
}
