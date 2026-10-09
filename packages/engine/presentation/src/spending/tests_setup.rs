use serde_json::{json, Value};

use super::harness::Harness;

#[test]
fn categories_are_listed_with_camel_case_fields_and_lowercase_kinds() {
    let harness = Harness::start();
    let all = harness.call("spending.list_categories", Value::Null);
    assert_eq!(all.as_array().unwrap().len(), 8);
    assert_eq!(all[0]["id"], "category-food");
    assert_eq!(all[0]["name"], "Ăn uống");
    assert_eq!(all[0]["icon"], "fork-knife");
    assert_eq!(all[0]["kind"], "expense");
    assert!(all[0]["budgetVnd"].is_null());
    assert_eq!(all[6]["isFixed"], true);
    assert_eq!(all[7]["kind"], "income");
    assert_eq!(all[7]["position"], 8);
}

#[test]
fn the_category_list_accepts_no_payload_a_null_payload_and_a_kind_filter() {
    let harness = Harness::start();
    let income = harness.call("spending.list_categories", json!({ "kind": "income" }));
    assert_eq!(income.as_array().unwrap().len(), 1);
    let nothing =
        harness.engine.call(&harness.db, &harness.env, "spending.list_categories", "null");
    assert_eq!(
        serde_json::from_str::<Value>(&nothing.unwrap()).unwrap().as_array().unwrap().len(),
        8
    );
    let empty = harness.call("spending.list_categories", json!({}));
    assert_eq!(empty.as_array().unwrap().len(), 8);
}

#[test]
fn a_category_can_be_created_budgeted_cleared_and_deleted() {
    let harness = Harness::start();
    let created = harness.call(
        "spending.create_category",
        json!({ "name": "Thú cưng", "icon": "paw-print", "kind": "expense", "budgetVnd": 300000 }),
    );
    assert_eq!(created["budgetVnd"], 300_000);
    assert_eq!(created["isFixed"], false);
    let id = created["id"].as_str().unwrap();
    let renamed = harness.call("spending.update_category", json!({ "id": id, "name": "Pet" }));
    assert_eq!(
        (renamed["name"].as_str(), renamed["budgetVnd"].as_i64()),
        (Some("Pet"), Some(300_000))
    );
    let cleared = harness.call("spending.update_category", json!({ "id": id, "budgetVnd": null }));
    assert!(cleared["budgetVnd"].is_null());
    assert_eq!(harness.call("spending.delete_category", json!({ "id": id })), json!({}));
    assert_eq!(harness.call("spending.list_categories", Value::Null).as_array().unwrap().len(), 8);
}

#[test]
fn category_errors_carry_validation_and_not_found_codes() {
    let harness = Harness::start();
    let blank = json!({ "name": " ", "icon": "x", "kind": "expense" });
    assert_eq!(harness.fail("spending.create_category", blank)["code"], "validation");
    let missing = harness.fail("spending.update_category", json!({ "id": "nope", "name": "x" }));
    assert_eq!(missing["code"], "not_found");
    harness.record("Phở", -70_000, "2026-10-06");
    let used = harness.fail("spending.delete_category", json!({ "id": "category-food" }));
    assert_eq!(used["code"], "validation");
}

#[test]
fn wallets_report_opening_and_current_balance() {
    let harness = Harness::start();
    let bank = harness.call(
        "spending.create_wallet",
        json!({ "name": "Techcombank", "kind": "bank", "openingBalanceVnd": 5000000 }),
    );
    assert_eq!(bank["kind"], "bank");
    assert_eq!(bank["openingBalanceVnd"], 5_000_000);
    assert_eq!(bank["balanceVnd"], 5_000_000);
    harness.record("Phở", -70_000, "2026-10-06");
    let wallets = harness.call("spending.list_wallets", Value::Null);
    assert_eq!(wallets[0]["id"], "wallet-cash");
    assert_eq!(wallets[0]["balanceVnd"], -70_000);
    assert_eq!(wallets[1]["name"], "Techcombank");
}

#[test]
fn a_wallet_can_be_updated_and_an_empty_one_deleted() {
    let harness = Harness::start();
    let momo = harness.call(
        "spending.create_wallet",
        json!({ "name": "Ví MoMo", "kind": "ewallet", "openingBalanceVnd": 0 }),
    );
    let id = momo["id"].as_str().unwrap();
    let moved =
        harness.call("spending.update_wallet", json!({ "id": id, "openingBalanceVnd": 250000 }));
    assert_eq!(
        (moved["kind"].as_str(), moved["balanceVnd"].as_i64()),
        (Some("ewallet"), Some(250_000))
    );
    assert_eq!(harness.call("spending.delete_wallet", json!({ "id": id })), json!({}));
    harness.record("Phở", -70_000, "2026-10-06");
    let used = harness.fail("spending.delete_wallet", json!({ "id": "wallet-cash" }));
    assert_eq!(used["code"], "validation");
}

#[test]
fn goals_can_be_created_updated_funded_and_deleted() {
    let harness = Harness::start();
    let goal = harness.call(
        "spending.create_goal",
        json!({
            "name": "Đà Lạt", "icon": "calendar-blank", "targetVnd": 15000000,
            "dueOn": "2026-12-20",
        }),
    );
    assert_eq!((goal["savedVnd"].as_i64(), goal["dueOn"].as_str()), (Some(0), Some("2026-12-20")));
    let id = goal["id"].as_str().unwrap();
    let funded =
        harness.call("spending.contribute_goal", json!({ "id": id, "amountVnd": 1000000 }));
    assert_eq!(funded["savedVnd"], 1_000_000);
    let renamed =
        harness.call("spending.update_goal", json!({ "id": id, "name": "Dalat", "dueOn": null }));
    assert_eq!(renamed["name"], "Dalat");
    assert!(renamed["dueOn"].is_null());
    assert_eq!(renamed["targetVnd"], 15_000_000);
    assert_eq!(harness.call("spending.list_goals", Value::Null)[0]["savedVnd"], 1_000_000);
    let zero = harness.fail("spending.contribute_goal", json!({ "id": id, "amountVnd": 0 }));
    assert_eq!(zero["code"], "validation");
    assert_eq!(harness.call("spending.delete_goal", json!({ "id": id })), json!({}));
    assert_eq!(harness.call("spending.list_goals", Value::Null), json!([]));
}

#[test]
fn bills_are_inserted_without_an_id_and_updated_with_one() {
    let harness = Harness::start();
    let bill = harness.call(
        "spending.save_bill",
        json!({
            "title": "Internet FPT", "icon": "lightning", "amountVnd": 230000, "dayOfMonth": 15,
        }),
    );
    assert_eq!((bill["active"].as_bool(), bill["dayOfMonth"].as_i64()), (Some(true), Some(15)));
    let edit = json!({
        "id": bill["id"], "title": "Internet", "icon": "lightning", "amountVnd": 250000,
        "dayOfMonth": 20, "active": false,
    });
    let updated = harness.call("spending.save_bill", edit);
    assert_eq!(
        (updated["amountVnd"].as_i64(), updated["active"].as_bool()),
        (Some(250_000), Some(false))
    );
    let bills = harness.call("spending.list_bills", Value::Null);
    assert_eq!(bills.as_array().unwrap().len(), 1);
    let bad_day = json!({ "title": "x", "icon": "x", "amountVnd": 1, "dayOfMonth": 32 });
    assert_eq!(harness.fail("spending.save_bill", bad_day)["code"], "validation");
    assert_eq!(harness.call("spending.delete_bill", json!({ "id": bill["id"] })), json!({}));
    assert_eq!(harness.call("spending.list_bills", Value::Null), json!([]));
}
