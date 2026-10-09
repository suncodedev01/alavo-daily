use serde_json::{json, Value};

use super::harness::Harness;

const STATEMENT: &str = "Ngày;Số tiền;Nội dung\n\
09/10/2026;-65.000;GRAB*TRIP HCM\n\
08/10/2026;28.000.000;CONG TY ABC TRA LUONG T10\n\
07/10/2026;abc;Lỗi\n";

fn preview(harness: &Harness, csv: &str) -> Value {
    harness.call("spending.import_preview", json!({ "csv": csv }))
}

fn confirmed_rows() -> Value {
    json!([
        { "occurredOn": "2026-10-09", "amountVnd": -65000, "title": "GRAB*TRIP HCM",
          "categoryId": "category-transport" },
        { "occurredOn": "2026-10-08", "amountVnd": 28000000, "title": "CONG TY ABC TRA LUONG T10",
          "categoryId": "category-income" },
    ])
}

#[test]
fn the_preview_has_rows_with_signed_amounts_categories_and_problem_codes() {
    let harness = Harness::start();
    let result = preview(&harness, STATEMENT);
    assert_eq!(result["delimiter"], ";");
    let rows = result["rows"].as_array().unwrap();
    assert_eq!(rows.len(), 3);
    assert_eq!(rows[0]["occurredOn"], "2026-10-09");
    assert_eq!(rows[0]["amountVnd"], -65_000);
    assert_eq!(rows[0]["title"], "GRAB*TRIP HCM");
    assert_eq!(rows[0]["categoryId"], "category-transport");
    assert_eq!(rows[0]["line"], 2);
    assert_eq!(rows[1]["categoryId"], "category-income");
    assert_eq!(rows[2]["problems"], json!(["invalid_amount"]));
    assert!(rows[2]["amountVnd"].is_null());
}

#[test]
fn previewing_does_not_save_anything() {
    let harness = Harness::start();
    preview(&harness, STATEMENT);
    assert_eq!(harness.call("spending.list_transactions", Value::Null), json!([]));
}

#[test]
fn text_that_is_not_a_statement_is_a_validation_error() {
    let harness = Harness::start();
    let error = harness.fail("spending.import_preview", json!({ "csv": "hello" }));
    assert_eq!(error["code"], "validation");
    assert_eq!(harness.fail("spending.import_preview", json!({}))["code"], "validation");
}

#[test]
fn importing_records_the_rows_and_reports_the_counts() {
    let harness = Harness::start();
    let payload = json!({ "walletId": "wallet-cash", "rows": confirmed_rows() });
    let result = harness.call("spending.import_transactions", payload);
    assert_eq!(result, json!({ "imported": 2, "skippedDuplicates": 0 }));
    let listed = harness.call("spending.list_transactions", Value::Null);
    assert_eq!(listed.as_array().unwrap().len(), 2);
    assert_eq!(listed[0]["walletId"], "wallet-cash");
    assert_eq!(harness.call("sync.status", Value::Null)["pendingEvents"], 2);
}

#[test]
fn importing_the_same_rows_again_skips_them_as_duplicates() {
    let harness = Harness::start();
    let payload = json!({ "walletId": "wallet-cash", "rows": confirmed_rows() });
    harness.call("spending.import_transactions", payload.clone());
    let again = harness.call("spending.import_transactions", payload);
    assert_eq!(again, json!({ "imported": 0, "skippedDuplicates": 2 }));
    assert_eq!(
        harness.call("spending.list_transactions", Value::Null).as_array().unwrap().len(),
        2
    );
}

#[test]
fn a_bad_row_fails_the_whole_import_and_leaves_no_trace() {
    let harness = Harness::start();
    let mut rows = confirmed_rows();
    rows.as_array_mut().unwrap().push(json!({
        "occurredOn": "2026-10-07", "amountVnd": 1000, "title": "Sai dấu", "categoryId": "category-food",
    }));
    let error = harness
        .fail("spending.import_transactions", json!({ "walletId": "wallet-cash", "rows": rows }));
    assert_eq!(error["code"], "validation");
    assert_eq!(harness.call("spending.list_transactions", Value::Null), json!([]));
    assert_eq!(harness.call("sync.status", Value::Null)["pendingEvents"], 0);
}

#[test]
fn importing_into_a_missing_wallet_is_a_validation_error() {
    let harness = Harness::start();
    let payload = json!({ "walletId": "gone", "rows": confirmed_rows() });
    assert_eq!(harness.fail("spending.import_transactions", payload)["code"], "validation");
}

#[test]
fn a_preview_row_can_be_sent_back_to_import_unchanged() {
    let harness = Harness::start();
    let first = preview(&harness, STATEMENT)["rows"][0].clone();
    let payload = json!({ "walletId": "wallet-cash", "rows": [first] });
    assert_eq!(harness.call("spending.import_transactions", payload)["imported"], 1);
}
