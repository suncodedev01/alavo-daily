use serde_json::{json, Value};

use super::test_harness::{error_code, Harness};

fn plan_dinner(app: &Harness, recipe_id: &Value, date: &str) -> Value {
    let payload = json!({ "date": date, "slot": "dinner", "recipeId": recipe_id });
    app.call("recipes.add_to_plan", payload)
}

#[test]
fn add_to_plan_returns_the_entry_with_the_joined_recipe_fields() {
    let app = Harness::start();
    let recipe = app.create("Gà kho");
    let entry = plan_dinner(&app, &recipe["id"], "2026-10-07");
    assert_eq!(entry["date"], "2026-10-07");
    assert_eq!(entry["slot"], "dinner");
    assert_eq!(entry["recipeId"], recipe["id"]);
    assert_eq!(entry["recipeName"], "Gà kho");
    assert_eq!(entry["recipeIcon"], "cooking-pot");
    assert_eq!(entry["servings"], 2);
}

#[test]
fn add_to_plan_twice_returns_the_same_entry() {
    let app = Harness::start();
    let recipe = app.create("Gà kho");
    let first = plan_dinner(&app, &recipe["id"], "2026-10-07");
    let second = plan_dinner(&app, &recipe["id"], "2026-10-07");
    assert_eq!(first["id"], second["id"]);
    assert_eq!(app.call("recipes.get_plan", json!({ "from": "2026-10-07" })).as_array().unwrap().len(), 1);
}

#[test]
fn add_to_plan_rejects_a_bad_slot_date_and_recipe() {
    let app = Harness::start();
    let recipe = app.create("Gà kho");
    let bad_slot = json!({ "date": "2026-10-07", "slot": "brunch", "recipeId": recipe["id"] });
    assert_eq!(error_code(&app.fail("recipes.add_to_plan", bad_slot)), "validation");
    let bad_date = json!({ "date": "2026-13-01", "slot": "lunch", "recipeId": recipe["id"] });
    assert_eq!(error_code(&app.fail("recipes.add_to_plan", bad_date)), "validation");
    let unknown = json!({ "date": "2026-10-07", "slot": "lunch", "recipeId": "nope" });
    assert_eq!(error_code(&app.fail("recipes.add_to_plan", unknown)), "not_found");
}

#[test]
fn get_plan_defaults_to_seven_days_and_honours_days() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    plan_dinner(&app, &id, "2026-10-05");
    plan_dinner(&app, &id, "2026-10-11");
    plan_dinner(&app, &id, "2026-10-12");
    let week = app.call("recipes.get_plan", json!({ "from": "2026-10-05" }));
    assert_eq!(week.as_array().unwrap().len(), 2);
    let two_days = app.call("recipes.get_plan", json!({ "from": "2026-10-05", "days": 2 }));
    assert_eq!(two_days.as_array().unwrap().len(), 1);
    let bad = app.fail("recipes.get_plan", json!({ "from": "2026-10-05", "days": 0 }));
    assert_eq!(error_code(&bad), "validation");
}

#[test]
fn remove_from_plan_returns_an_empty_object() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    let entry = plan_dinner(&app, &id, "2026-10-07");
    assert_eq!(app.call("recipes.remove_from_plan", json!({ "id": entry["id"] })), json!({}));
    assert_eq!(app.call("recipes.get_plan", json!({ "from": "2026-10-07" })), json!([]));
    let error = app.fail("recipes.remove_from_plan", json!({ "id": entry["id"] }));
    assert_eq!(error_code(&error), "not_found");
}

#[test]
fn the_shopping_list_comes_back_in_camel_case_with_totals() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    plan_dinner(&app, &id, "2026-10-07");
    let list = app.call("recipes.get_shopping_list", json!({ "from": "2026-10-05", "to": "2026-10-11" }));
    assert_eq!((list["from"].as_str(), list["to"].as_str()), (Some("2026-10-05"), Some("2026-10-11")));
    assert_eq!(list["neededCount"], 1);
    assert_eq!(list["neededCostVnd"], 27000);
    let chicken = &list["items"][0];
    assert_eq!(chicken["key"], "Đùi gà|g");
    assert_eq!(chicken["aisle"], "meat_fish");
    assert_eq!(chicken["quantity"], 300.0);
    assert_eq!(chicken["costVnd"], 27000);
    assert_eq!(chicken["from"], json!(["Gà kho"]));
    assert_eq!((chicken["have"].as_bool(), chicken["custom"].as_bool()), (Some(false), Some(false)));
    assert_eq!(list["items"][1]["have"], true);
}

#[test]
fn set_shopping_have_changes_the_list_and_returns_an_empty_object() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    plan_dinner(&app, &id, "2026-10-07");
    let reply = app.call("recipes.set_shopping_have", json!({ "key": "Đùi gà|g", "have": true }));
    assert_eq!(reply, json!({}));
    let list = app.call("recipes.get_shopping_list", json!({ "from": "2026-10-05", "to": "2026-10-11" }));
    assert_eq!(list["items"][0]["have"], true);
    assert_eq!(list["neededCount"], 0);
}

#[test]
fn hand_added_items_can_be_added_and_removed_but_planned_lines_cannot() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    plan_dinner(&app, &id, "2026-10-07");
    assert_eq!(app.call("recipes.add_shopping_item", json!({ "name": "Sữa" })), json!({}));
    let range = json!({ "from": "2026-10-05", "to": "2026-10-11" });
    let list = app.call("recipes.get_shopping_list", range.clone());
    let milk = list["items"].as_array().unwrap().iter().find(|i| i["name"] == "Sữa").unwrap();
    assert_eq!(milk["key"], "Sữa|phần");
    assert_eq!((milk["unit"].as_str(), milk["quantity"].as_f64()), (Some("phần"), Some(1.0)));
    assert_eq!((milk["custom"].as_bool(), milk["aisle"].as_str()), (Some(true), Some("other")));
    assert_eq!(milk["from"], json!([]));
    let derived = app.fail("recipes.remove_shopping_item", json!({ "key": "Đùi gà|g" }));
    assert_eq!(error_code(&derived), "validation");
    assert_eq!(app.call("recipes.remove_shopping_item", json!({ "key": "Sữa|phần" })), json!({}));
    let after = app.call("recipes.get_shopping_list", range);
    assert!(after["items"].as_array().unwrap().iter().all(|i| i["name"] != "Sữa"));
}

#[test]
fn add_shopping_item_rejects_a_blank_name() {
    let app = Harness::start();
    let error = app.fail("recipes.add_shopping_item", json!({ "name": " " }));
    assert_eq!(error_code(&error), "validation");
}

#[test]
fn log_shopping_expense_goes_through_the_spending_contract() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    plan_dinner(&app, &id, "2026-10-07");
    let payload = json!({
        "from": "2026-10-05", "to": "2026-10-11", "walletId": "wallet-cash",
        "categoryId": "category-food", "occurredOn": "2026-10-09"
    });
    let call = app.engine.call(&app.db, &app.env, "recipes.log_shopping_expense", &payload.to_string());
    let transaction: Value = serde_json::from_str(&call.unwrap()).unwrap();
    assert_eq!(transaction["amountVnd"], -27000);
    assert_eq!(transaction["title"], "Đi chợ 05/10 - 11/10");
    let listed = app.engine.call(&app.db, &app.env, "spending.list_transactions", "{}").unwrap();
    assert_eq!(serde_json::from_str::<Value>(&listed).unwrap().as_array().unwrap().len(), 1);
}

#[test]
fn log_shopping_expense_with_nothing_to_buy_is_a_validation_error() {
    let app = Harness::start();
    let payload = json!({
        "from": "2026-10-05", "to": "2026-10-11", "walletId": "wallet-cash",
        "categoryId": "category-food", "occurredOn": "2026-10-09"
    });
    assert_eq!(error_code(&app.fail("recipes.log_shopping_expense", payload)), "validation");
}

#[test]
fn unknown_recipes_commands_fall_through_to_unknown_command() {
    let app = Harness::start();
    assert_eq!(error_code(&app.fail("recipes.nope", json!({}))), "unknown_command");
}

#[test]
fn loading_demo_data_fills_the_recipes_module_through_the_hub_command() {
    let app = Harness::start();
    app.call("hub.load_demo_data", Value::Null);
    app.call("hub.load_demo_data", Value::Null);
    assert_eq!(app.call("recipes.list", Value::Null).as_array().unwrap().len(), 8);
    let plan = app.call("recipes.get_plan", json!({ "from": "2026-10-05" }));
    assert_eq!(plan.as_array().unwrap().len(), 15);
}

#[test]
fn every_write_leaves_a_pending_sync_event() {
    let app = Harness::start();
    assert_eq!(app.call("sync.status", Value::Null)["pendingEvents"], 0);
    app.create("Gà kho");
    assert_eq!(app.call("sync.status", Value::Null)["pendingEvents"], 5);
}

#[test]
fn morning_menus_list_what_is_planned_for_each_date() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    plan_dinner(&app, &id, "2026-10-11");
    let menus = app.call("recipes.morning_menus", json!({ "from": "2026-10-10", "days": 2 }));
    assert_eq!(menus[0]["source"], "suggested");
    assert_eq!(menus[1]["source"], "planned");
    assert_eq!(menus[1]["dishes"][0]["name"], "Gà kho");
    assert_eq!(menus[1]["dishes"][0]["slot"], "dinner");
}

#[test]
fn morning_menus_suggest_the_same_recipe_for_an_empty_day_every_time() {
    let app = Harness::start();
    app.create("Gà kho");
    app.create("Bún chả");
    let first = app.call("recipes.morning_menus", json!({ "from": "2026-10-10" }));
    let second = app.call("recipes.morning_menus", json!({ "from": "2026-10-10" }));
    assert_eq!(first.as_array().unwrap().len(), 3);
    assert_eq!(first, second);
    assert!(first[0]["dishes"][0]["slot"].is_null());
}

#[test]
fn morning_menus_are_empty_when_there_is_nothing_to_suggest() {
    let app = Harness::start();
    let menus = app.call("recipes.morning_menus", json!({ "from": "2026-10-10", "days": 1 }));
    assert_eq!(menus[0]["source"], "empty");
    assert_eq!(menus[0]["dishes"].as_array().unwrap().len(), 0);
}

#[test]
fn morning_menus_reject_a_bad_date_and_a_bad_day_count() {
    let app = Harness::start();
    let bad_date = app.fail("recipes.morning_menus", json!({ "from": "2026-13-45" }));
    assert_eq!(error_code(&bad_date), "validation");
    let too_many = app.fail("recipes.morning_menus", json!({ "from": "2026-10-10", "days": 99 }));
    assert_eq!(error_code(&too_many), "validation");
}

fn suggest(app: &Harness, payload: Value) -> Vec<Value> {
    app.call("recipes.suggest_plan", payload).as_array().unwrap().clone()
}

#[test]
fn suggest_plan_returns_unsaved_entries_in_camel_case() {
    let app = Harness::start();
    for name in ["Gà kho", "Bún chả", "Canh chua", "Phở bò"] {
        app.create(name);
    }
    let payload = json!({ "from": "2026-10-05", "days": 2, "slots": ["dinner"] });
    let entries = suggest(&app, payload);
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0]["date"], "2026-10-05");
    assert_eq!(entries[0]["slot"], "dinner");
    for key in ["recipeId", "recipeName", "recipeIcon"] {
        assert!(entries[0][key].is_string(), "{key}");
    }
    assert_eq!(app.call("recipes.get_plan", json!({ "from": "2026-10-05" })), json!([]));
}

#[test]
fn suggest_plan_is_the_same_for_the_same_seed_and_changes_with_another() {
    let app = Harness::start();
    for index in 0..8 {
        app.create(&format!("Món {index}"));
    }
    let with_seed = |seed: u64| json!({ "from": "2026-10-05", "slots": ["dinner"], "seed": seed });
    assert_eq!(suggest(&app, with_seed(1)), suggest(&app, with_seed(1)));
    let differs = (2..12).any(|seed| suggest(&app, with_seed(seed)) != suggest(&app, with_seed(1)));
    assert!(differs);
}

#[test]
fn suggest_plan_skips_meals_that_are_planned_and_defaults_to_lunch_and_dinner() {
    let app = Harness::start();
    let id = app.create("Gà kho")["id"].clone();
    for index in 0..6 {
        app.create(&format!("Món {index}"));
    }
    plan_dinner(&app, &id, "2026-10-05");
    let entries = suggest(&app, json!({ "from": "2026-10-05", "days": 2 }));
    assert_eq!(entries.len(), 3);
    let slots: Vec<_> = entries.iter().map(|entry| entry["slot"].as_str().unwrap()).collect();
    assert_eq!(slots, ["lunch", "lunch", "dinner"]);
}

#[test]
fn suggest_plan_honours_also_planned_and_avoid() {
    let app = Harness::start();
    let first = app.create("Gà kho")["id"].clone();
    let second = app.create("Bún chả")["id"].clone();
    let third = app.create("Canh chua")["id"].clone();
    let payload = json!({
        "from": "2026-10-05", "days": 1, "slots": ["dinner"],
        "alsoPlanned": [{ "date": "2026-10-06", "slot": "dinner", "recipeId": first }],
        "avoid": [second],
    });
    let entries = suggest(&app, payload);
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0]["recipeId"], third);
}

#[test]
fn suggest_plan_with_no_recipes_is_an_empty_list() {
    let app = Harness::start();
    assert_eq!(suggest(&app, json!({ "from": "2026-10-05" })), Vec::<Value>::new());
}

#[test]
fn suggest_plan_rejects_bad_input() {
    let app = Harness::start();
    let bad_date = app.fail("recipes.suggest_plan", json!({ "from": "2026-13-01" }));
    assert_eq!(error_code(&bad_date), "validation");
    let no_slots = app.fail("recipes.suggest_plan", json!({ "from": "2026-10-05", "slots": [] }));
    assert_eq!(error_code(&no_slots), "validation");
    let bad_slot = app.fail("recipes.suggest_plan", json!({ "from": "2026-10-05", "slots": ["brunch"] }));
    assert_eq!(error_code(&bad_slot), "validation");
}
