use serde_json::json;

use super::harness::Harness;

fn new_wedding(harness: &Harness) -> serde_json::Value {
    harness.call(
        "spending.create_estimate",
        json!({
            "name": "Đám cưới", "icon": "gift", "contingencyPercent": 10,
            "walletIds": ["wallet-cash"], "factors": [{ "label": "khách", "value": 200 }]
        }),
    )
}

#[test]
fn an_estimate_is_made_filled_in_and_answers_whether_the_money_is_enough() {
    let harness = Harness::start();
    harness.call(
        "spending.record_transaction",
        json!({
            "title": "Lương", "amountVnd": 10000000, "categoryId": "category-income",
            "walletId": "wallet-cash", "occurredOn": "2026-10-07"
        }),
    );
    let made = new_wedding(&harness);
    let id = made["estimate"]["id"].as_str().unwrap().to_string();
    let factor = made["estimate"]["factors"][0]["id"].as_str().unwrap().to_string();
    let view = harness.call(
        "spending.save_estimate_item",
        json!({
            "estimateId": id, "group": "Tiệc", "name": "Tiệc nhà hàng", "price": 100000,
            "quantity": 1, "priority": "must", "by": [factor]
        }),
    );
    assert_eq!(view["totals"]["base"], 20_000_000);
    assert_eq!(view["totals"]["contingency"], 2_000_000);
    assert_eq!(view["totals"]["available"], 10_000_000);
    assert!(view["totals"]["result"].as_i64().unwrap() < 0);
    assert_eq!(view["savingOptions"].as_array().map(Vec::len), Some(2));
    assert_eq!(view["estimate"]["items"][0]["by"], json!([factor]));
}

#[test]
fn the_list_summarises_each_estimate() {
    let harness = Harness::start();
    new_wedding(&harness);
    let list = harness.call("spending.list_estimates", json!({}));
    assert_eq!(list[0]["name"], "Đám cưới");
    assert_eq!(list[0]["itemCount"], 0);
    assert_eq!(list[0]["coveredPercent"], 100);
}

#[test]
fn a_payment_can_be_marked_with_or_without_writing_it_into_spending() {
    let harness = Harness::start();
    let made = new_wedding(&harness);
    let id = made["estimate"]["id"].as_str().unwrap().to_string();
    let view = harness.call(
        "spending.save_estimate_item",
        json!({ "estimateId": id, "group": "Lễ", "name": "Nhẫn", "price": 5000000, "priority": "must" }),
    );
    let item = view["estimate"]["items"][0]["id"].as_str().unwrap().to_string();
    let only = harness.call("spending.set_estimate_item_paid", json!({ "id": item, "paid": 1000000 }));
    assert_eq!(only["totals"]["paid"], 1_000_000);
    assert_eq!(harness.call("spending.list_transactions", json!({})).as_array().map(Vec::len), Some(0));
    let recorded = harness.call(
        "spending.set_estimate_item_paid",
        json!({
            "id": item, "paid": 3000000,
            "record": { "categoryId": "category-food", "walletId": "wallet-cash", "occurredOn": "2026-10-08" }
        }),
    );
    assert_eq!(recorded["totals"]["paid"], 3_000_000);
    let spent = harness.call("spending.list_transactions", json!({}));
    assert_eq!(spent[0]["amountVnd"], -2_000_000);
    assert_eq!(spent[0]["title"], "Nhẫn");
}

#[test]
fn bad_input_is_a_validation_error_and_an_unknown_estimate_is_not_found() {
    let harness = Harness::start();
    let blank = harness.fail("spending.create_estimate", json!({ "name": " ", "icon": "gift" }));
    assert_eq!(blank["code"], "validation");
    let odd = harness.fail(
        "spending.create_estimate",
        json!({ "name": "A", "icon": "gift", "contingencyPercent": 33 }),
    );
    assert_eq!(odd["code"], "validation");
    let missing = harness.fail("spending.get_estimate", json!({ "id": "nope" }));
    assert_eq!(missing["code"], "not_found");
}

#[test]
fn deleting_an_estimate_removes_it_from_the_list() {
    let harness = Harness::start();
    let made = new_wedding(&harness);
    let id = made["estimate"]["id"].clone();
    assert_eq!(harness.call("spending.delete_estimate", json!({ "id": id })), json!({}));
    assert_eq!(harness.call("spending.list_estimates", json!({})), json!([]));
}
