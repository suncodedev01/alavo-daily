use alavo_domain::sync::conflict::Keep;
use serde_json::json;

use super::super::conflicts::{list, resolve};
use super::super::test_support::{exchange, send_all, set_have, Device};
use crate::hub::sync_status::status;

const STATE: &str = "recipes_shopping_state";
const KEY: &str = "Hành|g";

fn devices_with_a_shared_flag() -> (Device, Device) {
    let (a, b) = (Device::new("dev-a"), Device::new("dev-b"));
    b.advance(1_000);
    set_have(&a, KEY, false);
    exchange(&a, &b);
    (a, b)
}

fn both_change_the_flag(a: &Device, b: &Device) {
    b.advance(12_000);
    set_have(b, KEY, true);
    a.advance(15_000);
    set_have(a, KEY, false);
    send_all(a, b);
}

#[test]
fn a_whole_row_change_over_an_unsynced_local_change_is_kept_as_a_conflict() {
    let (a, b) = devices_with_a_shared_flag();
    both_change_the_flag(&a, &b);
    let conflicts = list(&b.ctx()).unwrap();
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].entity_id, KEY);
    assert_eq!(conflicts[0].local["have"], json!(1));
    assert_eq!(conflicts[0].remote["have"], json!(0));
    assert_eq!(b.row(STATE, KEY).unwrap()["have"], json!(1), "the local version is untouched");
    assert_eq!(status(&b.ctx()).unwrap().conflict_count, 1);
}

#[test]
fn keeping_the_remote_version_makes_both_devices_agree_on_it() {
    let (a, b) = devices_with_a_shared_flag();
    both_change_the_flag(&a, &b);
    let id = list(&b.ctx()).unwrap()[0].id.clone();
    b.advance(5_000);
    resolve(&b.ctx(), &id, Keep::Remote).unwrap();
    assert!(list(&b.ctx()).unwrap().is_empty());
    send_all(&b, &a);
    assert_eq!(b.row(STATE, KEY).unwrap()["have"], json!(0));
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn keeping_the_local_version_makes_both_devices_agree_on_it() {
    let (a, b) = devices_with_a_shared_flag();
    both_change_the_flag(&a, &b);
    let id = list(&b.ctx()).unwrap()[0].id.clone();
    b.advance(5_000);
    resolve(&b.ctx(), &id, Keep::Local).unwrap();
    send_all(&b, &a);
    assert_eq!(a.row(STATE, KEY).unwrap()["have"], json!(1));
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn resolving_writes_a_new_change_so_it_gets_uploaded() {
    let (a, b) = devices_with_a_shared_flag();
    both_change_the_flag(&a, &b);
    send_all(&b, &a);
    let before = b.pending_count();
    let id = list(&b.ctx()).unwrap()[0].id.clone();
    resolve(&b.ctx(), &id, Keep::Remote).unwrap();
    assert_eq!(b.pending_count(), before + 1);
}

#[test]
fn a_second_remote_change_to_the_same_row_updates_the_open_conflict() {
    let (a, b) = devices_with_a_shared_flag();
    both_change_the_flag(&a, &b);
    a.advance(5_000);
    set_have(&a, KEY, true);
    send_all(&a, &b);
    let conflicts = list(&b.ctx()).unwrap();
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].remote["have"], json!(1));
}

#[test]
fn an_older_remote_change_does_not_replace_a_newer_unsynced_local_one_and_asks_nothing() {
    let (a, b) = devices_with_a_shared_flag();
    a.advance(10_000);
    set_have(&a, KEY, false);
    b.advance(12_000);
    set_have(&b, KEY, true);
    send_all(&a, &b);
    assert!(list(&b.ctx()).unwrap().is_empty());
    assert_eq!(b.row(STATE, KEY).unwrap()["have"], json!(1));
    send_all(&b, &a);
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn a_remote_change_is_applied_without_asking_when_nothing_local_is_waiting() {
    let (a, b) = devices_with_a_shared_flag();
    a.advance(10_000);
    set_have(&a, KEY, true);
    send_all(&a, &b);
    assert!(list(&b.ctx()).unwrap().is_empty());
    assert_eq!(b.row(STATE, KEY).unwrap()["have"], json!(1));
}

#[test]
fn fields_that_merge_per_column_never_raise_a_conflict() {
    let (a, b) = (Device::new("dev-a"), Device::new("dev-b"));
    b.advance(1_000);
    let id = super::super::test_support::expense(&a, "Phở").id;
    send_all(&a, &b);
    a.advance(2_000);
    b.advance(3_000);
    super::super::test_support::edit_transaction(&a, &id, json!({ "title": "A" }));
    super::super::test_support::edit_transaction(&b, &id, json!({ "title": "B" }));
    send_all(&a, &b);
    assert!(list(&b.ctx()).unwrap().is_empty());
}

#[test]
fn resolving_an_unknown_conflict_is_not_found() {
    let b = Device::new("dev-b");
    assert!(resolve(&b.ctx(), "nope", Keep::Local).is_err());
}
