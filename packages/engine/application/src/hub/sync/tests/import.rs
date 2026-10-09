use alavo_domain::shared::error::ErrorCode;
use serde_json::{json, Value};

use super::super::import::{import_data, inspect};
use super::super::test_support::{
    alive, create_recipe, edit_transaction, expense, send_all, Device,
};
use crate::hub::export::export_data;
use crate::spending::transactions;

fn exported_text(device: &Device) -> String {
    export_data(&device.ctx()).unwrap().to_string()
}

fn a_device_with_data() -> (Device, String) {
    let a = Device::new("dev-a");
    let id = expense(&a, "Phở").id;
    edit_transaction(&a, &id, json!({ "note": "nhiều hành" }));
    create_recipe(&a, "Gà kho");
    (a, id)
}

#[test]
fn importing_an_export_recreates_the_data_on_another_device() {
    let (a, id) = a_device_with_data();
    let b = Device::new("dev-b");
    let summary = import_data(&b.ctx(), &exported_text(&a)).unwrap();
    assert!(summary.applied >= 5, "{summary:?}");
    assert_eq!(b.row("spending_transactions", &id).unwrap()["note"], json!("nhiều hành"));
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn importing_the_same_file_twice_changes_nothing_the_second_time() {
    let (a, _) = a_device_with_data();
    let b = Device::new("dev-b");
    let text = exported_text(&a);
    import_data(&b.ctx(), &text).unwrap();
    let before = (b.dump(), b.events().len());
    let again = import_data(&b.ctx(), &text).unwrap();
    assert_eq!(again.applied, 0);
    assert_eq!((b.dump(), b.events().len()), before);
}

#[test]
fn imported_rows_are_logged_so_other_devices_receive_them() {
    let (a, id) = a_device_with_data();
    let b = Device::new("dev-b");
    import_data(&b.ctx(), &exported_text(&a)).unwrap();
    assert!(b.pending_count() > 0);
    let c = Device::new("dev-c");
    send_all(&b, &c);
    assert!(alive(&c, "spending_transactions", &id));
    assert_eq!(c.dump(), a.dump());
}

#[test]
fn an_import_does_not_overwrite_a_newer_local_edit() {
    let (a, id) = a_device_with_data();
    let text = exported_text(&a);
    let b = Device::new("dev-b");
    import_data(&b.ctx(), &text).unwrap();
    b.advance(60_000);
    edit_transaction(&b, &id, json!({ "title": "Đã sửa trên máy B" }));
    import_data(&b.ctx(), &text).unwrap();
    assert_eq!(b.row("spending_transactions", &id).unwrap()["title"], json!("Đã sửa trên máy B"));
}

#[test]
fn a_deleted_row_in_the_file_stays_deleted_after_import() {
    let (a, id) = a_device_with_data();
    a.advance(5_000);
    transactions::delete(&a.ctx(), &id).unwrap();
    let b = Device::new("dev-b");
    import_data(&b.ctx(), &exported_text(&a)).unwrap();
    assert!(!alive(&b, "spending_transactions", &id));
}

#[test]
fn inspect_counts_the_rows_without_changing_anything() {
    let (a, _) = a_device_with_data();
    let b = Device::new("dev-b");
    let before = b.dump();
    let preview = inspect(&exported_text(&a)).unwrap();
    assert!(preview.rows >= 5 && preview.tables >= 3);
    assert_eq!((b.events().len(), b.dump()), (0, before));
}

#[test]
fn text_that_is_not_an_export_is_rejected_with_a_validation_error() {
    let b = Device::new("dev-b");
    for text in [
        "not json",
        "[]",
        r#"{"version":1}"#,
        r#"{"tables":{}}"#,
        r#"{"format":"other","version":1,"tables":{}}"#,
    ] {
        assert_eq!(import_data(&b.ctx(), text).unwrap_err().code, ErrorCode::Validation, "{text}");
    }
}

#[test]
fn a_file_from_a_newer_format_version_is_rejected() {
    let b = Device::new("dev-b");
    let text = json!({ "version": 99, "tables": {} }).to_string();
    let error = import_data(&b.ctx(), &text).unwrap_err();
    assert!(error.message.contains("newer"));
}

#[test]
fn unknown_tables_and_broken_rows_are_skipped_and_the_rest_imports() {
    let (a, id) = a_device_with_data();
    let mut file: Value = serde_json::from_str(&exported_text(&a)).unwrap();
    file["tables"]["mystery_table"] = json!([{ "id": "m1" }]);
    file["tables"]["spending_wallets"] = json!([{ "name": "no id" }, 5]);
    let b = Device::new("dev-b");
    let summary = import_data(&b.ctx(), &file.to_string()).unwrap();
    assert_eq!(summary.skipped, 3);
    assert!(alive(&b, "spending_transactions", &id));
}

#[test]
fn an_import_moves_the_clock_past_the_imported_edits() {
    let (a, id) = a_device_with_data();
    a.advance(90_000_000);
    edit_transaction(&a, &id, json!({ "title": "Từ tương lai" }));
    let b = Device::new("dev-b");
    import_data(&b.ctx(), &exported_text(&a)).unwrap();
    edit_transaction(&b, &id, json!({ "title": "Sau import" }));
    assert_eq!(b.row("spending_transactions", &id).unwrap()["title"], json!("Sau import"));
}
