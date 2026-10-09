use serde_json::{json, Value};

use super::harness::Harness;

fn seeded() -> Harness {
    let harness = Harness::start();
    harness.record("Phở", -70_000, "2026-08-20");
    harness.record("Siêu thị", -300_000, "2026-09-10");
    harness.record("Cà phê", -30_000, "2026-10-05");
    let salary = json!({
        "title": "Lương", "amountVnd": 5000000, "categoryId": "category-income",
        "walletId": "wallet-cash", "occurredOn": "2026-09-01",
    });
    harness.call("spending.record_transaction", salary);
    harness
}

#[test]
fn the_report_has_totals_categories_and_a_month_series() {
    let harness = seeded();
    let report =
        harness.call("spending.report", json!({ "from": "2026-08-01", "to": "2026-10-31" }));
    assert_eq!(report["from"], "2026-08-01");
    assert_eq!(report["incomeVnd"], 5_000_000);
    assert_eq!(report["expenseVnd"], 400_000);
    assert_eq!(report["netVnd"], 4_600_000);
    assert_eq!(report["transactionCount"], 4);
    let food = &report["categories"][1];
    assert_eq!(food["categoryId"], "category-food");
    assert_eq!(food["name"], "Ăn uống");
    assert_eq!(food["icon"], "fork-knife");
    assert_eq!(food["kind"], "expense");
    assert_eq!(food["totalVnd"], 400_000);
    assert_eq!(food["share"], 1.0);
    assert_eq!(food["transactionCount"], 3);
    let months: Vec<_> =
        report["months"].as_array().unwrap().iter().map(|bar| bar["month"].clone()).collect();
    assert_eq!(months, vec![json!("2026-08"), json!("2026-09"), json!("2026-10")]);
    assert_eq!(report["months"][1]["incomeVnd"], 5_000_000);
    assert_eq!(report["months"][1]["expenseVnd"], 300_000);
    assert_eq!(report["months"][1]["netVnd"], 4_700_000);
}

#[test]
fn a_report_without_a_range_or_with_a_backwards_one_is_a_validation_error() {
    let harness = Harness::start();
    assert_eq!(harness.fail("spending.report", json!({}))["code"], "validation");
    let backwards =
        harness.fail("spending.report", json!({ "from": "2026-10-02", "to": "2026-10-01" }));
    assert_eq!(backwards["code"], "validation");
}

#[test]
fn the_csv_export_returns_text_and_a_row_count() {
    let harness = seeded();
    let export =
        harness.call("spending.export_csv", json!({ "from": "2026-09-01", "to": "2026-09-30" }));
    assert_eq!(export["rowCount"], 2);
    let csv = export["csv"].as_str().unwrap();
    assert_eq!(
        csv,
        "date,title,category,wallet,amount_vnd,note\r\n\
         2026-09-01,Lương,Thu nhập,Tiền mặt,5000000,\r\n\
         2026-09-10,Siêu thị,Ăn uống,Tiền mặt,-300000,\r\n"
    );
}

#[test]
fn exporting_an_empty_range_gives_only_the_header() {
    let harness = Harness::start();
    let export =
        harness.call("spending.export_csv", json!({ "from": "2026-01-01", "to": "2026-01-31" }));
    assert_eq!(export["rowCount"], 0);
    assert_eq!(export["csv"], "date,title,category,wallet,amount_vnd,note\r\n");
}

#[test]
fn exporting_rejects_a_bad_range() {
    let harness = Harness::start();
    let bad = harness.fail("spending.export_csv", json!({ "from": "x", "to": "2026-01-31" }));
    assert_eq!(bad["code"], "validation");
    assert_eq!(harness.call("spending.list_transactions", Value::Null), json!([]));
}
