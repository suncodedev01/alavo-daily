use serde_json::{json, Value};

use super::harness::{titles, Harness};

#[test]
fn recording_returns_the_transaction_with_camel_case_fields() {
    let harness = Harness::start();
    let saved = harness.call(
        "spending.record_transaction",
        json!({
            "title": " Phở Thìn ", "amountVnd": -70000, "categoryId": "category-food",
            "walletId": "wallet-cash", "occurredOn": "2026-10-06", "note": "trưa",
            "recurringRule": "monthly:6",
        }),
    );
    assert_eq!(saved["title"], "Phở Thìn");
    assert_eq!(saved["amountVnd"], -70_000);
    assert_eq!(saved["categoryId"], "category-food");
    assert_eq!(saved["walletId"], "wallet-cash");
    assert_eq!(saved["occurredOn"], "2026-10-06");
    assert_eq!(saved["note"], "trưa");
    assert_eq!(saved["recurringRule"], "monthly:6");
    assert_eq!(saved["createdAt"], 1_791_532_800_000_i64);
    assert!(saved["updatedAt"].is_i64());
    let fetched = harness.call("spending.get_transaction", json!({ "id": saved["id"] }));
    assert_eq!(fetched, saved);
}

#[test]
fn note_and_recurring_rule_are_optional_when_recording() {
    let harness = Harness::start();
    let saved = harness.record("Phở", -70_000, "2026-10-06");
    assert_eq!(saved["note"], "");
    assert!(saved["recurringRule"].is_null());
}

#[test]
fn invalid_transactions_are_rejected_with_validation_errors() {
    let harness = Harness::start();
    let cases = [
        ("", -1000, "2026-10-06"),
        ("x", 0, "2026-10-06"),
        ("x", 1000, "2026-10-06"),
        ("x", -1000, "2026-02-30"),
    ];
    for (title, amount, date) in cases {
        let payload = json!({
            "title": title, "amountVnd": amount, "categoryId": "category-food",
            "walletId": "wallet-cash", "occurredOn": date,
        });
        assert_eq!(harness.fail("spending.record_transaction", payload)["code"], "validation");
    }
    assert_eq!(harness.call("spending.list_transactions", Value::Null), json!([]));
}

#[test]
fn transactions_list_newest_first_and_honour_every_filter_field() {
    let harness = Harness::start();
    harness.record("Phở Thìn", -70_000, "2026-10-06");
    harness.record("Cà phê", -30_000, "2026-09-30");
    harness.record("Bún bò", -50_000, "2026-10-09");
    let income = json!({
        "title": "Lương", "amountVnd": 5000000, "categoryId": "category-income",
        "walletId": "wallet-cash", "occurredOn": "2026-10-05", "recurringRule": "monthly:5",
    });
    harness.call("spending.record_transaction", income);
    let list =
        |filter: Value| titles(&harness.call("spending.list_transactions", filter)).join(",");
    assert_eq!(list(Value::Null), "Bún bò,Phở Thìn,Lương,Cà phê");
    assert_eq!(list(json!({ "month": "2026-10" })), "Bún bò,Phở Thìn,Lương");
    assert_eq!(list(json!({ "categoryId": "category-income" })), "Lương");
    assert_eq!(list(json!({ "walletId": "wallet-cash", "limit": 2 })), "Bún bò,Phở Thìn");
    assert_eq!(list(json!({ "kind": "income" })), "Lương");
    assert_eq!(list(json!({ "query": "PHỞ" })), "Phở Thìn");
    assert_eq!(list(json!({ "recurringOnly": true })), "Lương");
}

#[test]
fn a_transaction_can_be_updated_and_deleted() {
    let harness = Harness::start();
    let saved = harness.record("Phở", -70_000, "2026-10-06");
    let id = saved["id"].as_str().unwrap();
    let edit = json!({ "id": id, "amountVnd": -80000, "recurringRule": "monthly:6", "note": "n" });
    let updated = harness.call("spending.update_transaction", edit);
    assert_eq!(
        (updated["amountVnd"].as_i64(), updated["recurringRule"].as_str()),
        (Some(-80_000), Some("monthly:6"))
    );
    let cleared =
        harness.call("spending.update_transaction", json!({ "id": id, "recurringRule": null }));
    assert!(cleared["recurringRule"].is_null());
    assert_eq!(harness.call("spending.delete_transaction", json!({ "id": id })), json!({}));
    assert_eq!(harness.fail("spending.get_transaction", json!({ "id": id }))["code"], "not_found");
    assert_eq!(
        harness.fail("spending.delete_transaction", json!({ "id": id }))["code"],
        "not_found"
    );
}

#[test]
fn month_summary_has_every_documented_field() {
    let harness = Harness::start();
    harness.record("Phở", -70_000, "2026-10-06");
    harness.record("Tháng trước", -100_000, "2026-09-12");
    let income = json!({
        "title": "Lương", "amountVnd": 500000, "categoryId": "category-income",
        "walletId": "wallet-cash", "occurredOn": "2026-10-05",
    });
    harness.call("spending.record_transaction", income);
    let summary = harness
        .call("spending.month_summary", json!({ "month": "2026-10", "today": "2026-10-09" }));
    assert_eq!(summary["month"], "2026-10");
    assert_eq!(summary["incomeVnd"], 500_000);
    assert_eq!(summary["expenseVnd"], 70_000);
    assert_eq!(summary["netVnd"], 430_000);
    assert_eq!(summary["previousExpenseVnd"], 100_000);
    assert_eq!(summary["expenseDeltaPct"], -0.3);
    assert_eq!(summary["totalBalanceVnd"], 330_000);
    assert_eq!(summary["transactionCount"], 2);
    assert_eq!(summary["dailyExpenseVnd"].as_array().unwrap().len(), 9);
    assert_eq!(summary["dailyExpenseVnd"][5], 70_000);
}

#[test]
fn budget_status_has_every_documented_field() {
    let harness = Harness::start();
    harness.call("spending.update_category", json!({ "id": "category-food", "budgetVnd": 100000 }));
    harness.record("Tiệc", -90_000, "2026-10-06");
    let status = harness
        .call("spending.budget_status", json!({ "month": "2026-10", "today": "2026-10-09" }));
    assert_eq!(status["month"], "2026-10");
    assert_eq!(status["totalBudgetVnd"], 100_000);
    assert_eq!(status["totalSpentVnd"], 90_000);
    assert_eq!(status["totalRemainingVnd"], 10_000);
    assert_eq!(status["daysLeft"], 22);
    assert_eq!(status["perDayVnd"], 454);
    let line = &status["lines"][0];
    assert_eq!(line["categoryId"], "category-food");
    assert_eq!(line["name"], "Ăn uống");
    assert_eq!(line["icon"], "fork-knife");
    assert_eq!(
        (line["budgetVnd"].as_i64(), line["spentVnd"].as_i64()),
        (Some(100_000), Some(90_000))
    );
    assert_eq!(line["pct"], 0.9);
    assert_eq!(line["remainingVnd"], 10_000);
    assert_eq!(line["tone"], "warn");
}

#[test]
fn reports_reject_a_malformed_month_or_missing_today() {
    let harness = Harness::start();
    let bad_month = harness
        .fail("spending.month_summary", json!({ "month": "2026-13", "today": "2026-10-09" }));
    assert_eq!(bad_month["code"], "validation");
    assert_eq!(
        harness.fail("spending.budget_status", json!({ "month": "2026-10" }))["code"],
        "validation"
    );
}

#[test]
fn crossing_a_budget_through_the_command_adds_one_hub_notification() {
    let harness = Harness::start();
    harness.call("spending.update_category", json!({ "id": "category-food", "budgetVnd": 100000 }));
    harness.record("Tiệc", -90_000, "2026-10-06");
    harness.record("Thêm", -1_000, "2026-10-07");
    let notices = harness.call("hub.list_notifications", Value::Null);
    assert_eq!(notices.as_array().unwrap().len(), 1);
    assert_eq!(notices[0]["module"], "spending");
    assert_eq!(notices[0]["title"], "Ăn uống đã dùng 90% ngân sách");
    assert_eq!(notices[0]["subjectId"], "category-food");
}
