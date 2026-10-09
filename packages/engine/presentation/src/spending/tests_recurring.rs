use serde_json::{json, Value};

use super::harness::{titles, Harness};

fn record_template(harness: &Harness, title: &str, date: &str, day: u32) -> Value {
    let payload = json!({
        "title": title, "amountVnd": -230000, "categoryId": "category-bills",
        "walletId": "wallet-cash", "occurredOn": date, "recurringRule": format!("monthly:{day}"),
    });
    harness.call("spending.record_transaction", payload)
}

fn generate(harness: &Harness, today: &str) -> Value {
    harness.call("spending.generate_recurring", json!({ "today": today }))
}

#[test]
fn generating_creates_the_missing_months_and_reports_how_many() {
    let harness = Harness::start();
    record_template(&harness, "Internet", "2026-08-05", 5);
    assert_eq!(generate(&harness, "2026-10-09"), json!({ "created": 2 }));
    let listed = harness.call("spending.list_transactions", json!({ "month": "2026-10" }));
    assert_eq!(titles(&listed), vec!["Internet"]);
    assert_eq!(listed[0]["occurredOn"], "2026-10-05");
}

#[test]
fn a_generated_transaction_points_back_to_its_template_and_has_no_rule_of_its_own() {
    let harness = Harness::start();
    let template = record_template(&harness, "Internet", "2026-09-05", 5);
    generate(&harness, "2026-10-09");
    let listed = harness.call("spending.list_transactions", json!({ "month": "2026-10" }));
    assert_eq!(listed[0]["recurringSourceId"], template["id"]);
    assert!(listed[0]["recurringRule"].is_null());
    assert!(template["recurringSourceId"].is_null());
}

#[test]
fn generating_twice_on_the_same_day_does_not_repeat_anything() {
    let harness = Harness::start();
    record_template(&harness, "Internet", "2026-08-05", 5);
    generate(&harness, "2026-10-09");
    assert_eq!(generate(&harness, "2026-10-09"), json!({ "created": 0 }));
    let all = harness.call("spending.list_transactions", Value::Null);
    assert_eq!(all.as_array().unwrap().len(), 3);
    assert_eq!(harness.call("sync.status", Value::Null)["pendingEvents"], 3);
}

#[test]
fn the_recurring_filter_lists_templates_and_their_generated_copies() {
    let harness = Harness::start();
    record_template(&harness, "Internet", "2026-08-05", 5);
    harness.record("Phở", -70_000, "2026-10-06");
    generate(&harness, "2026-10-09");
    let recurring = harness.call("spending.list_transactions", json!({ "recurringOnly": true }));
    assert_eq!(recurring.as_array().unwrap().len(), 3);
}

#[test]
fn stopping_the_rule_on_the_template_ends_generation() {
    let harness = Harness::start();
    let template = record_template(&harness, "Internet", "2026-08-05", 5);
    generate(&harness, "2026-09-10");
    let stop = json!({ "id": template["id"], "recurringRule": null });
    harness.call("spending.update_transaction", stop);
    assert_eq!(generate(&harness, "2026-12-31"), json!({ "created": 0 }));
}

#[test]
fn a_deleted_generated_transaction_stays_deleted() {
    let harness = Harness::start();
    record_template(&harness, "Internet", "2026-09-05", 5);
    generate(&harness, "2026-10-09");
    let listed = harness.call("spending.list_transactions", json!({ "month": "2026-10" }));
    harness.call("spending.delete_transaction", json!({ "id": listed[0]["id"] }));
    assert_eq!(generate(&harness, "2026-10-20"), json!({ "created": 0 }));
}

#[test]
fn generating_needs_a_real_date() {
    let harness = Harness::start();
    assert_eq!(harness.fail("spending.generate_recurring", json!({}))["code"], "validation");
    let bad = harness.fail("spending.generate_recurring", json!({ "today": "2026-02-30" }));
    assert_eq!(bad["code"], "validation");
}

#[test]
fn generating_with_nothing_recurring_creates_nothing() {
    let harness = Harness::start();
    harness.record("Phở", -70_000, "2026-10-06");
    assert_eq!(generate(&harness, "2026-10-09"), json!({ "created": 0 }));
}
