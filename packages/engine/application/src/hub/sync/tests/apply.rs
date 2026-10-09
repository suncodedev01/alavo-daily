use alavo_domain::shared::error::ErrorCode;
use alavo_domain::sync::remote_event::SyncEvent;
use serde_json::json;

use super::super::apply::{apply_remote, RemoteBatch};
use super::super::pending::peers;
use super::super::test_support::{alive, batch, expense, send_all, Device};

fn a_and_b() -> (Device, Device) {
    let (a, b) = (Device::new("dev-a"), Device::new("dev-b"));
    b.advance(1_000);
    (a, b)
}

fn first_event_of(device: &Device) -> SyncEvent {
    device.events().remove(0)
}

#[test]
fn a_transaction_recorded_on_one_device_appears_on_the_other() {
    let (a, b) = a_and_b();
    let saved = expense(&a, "Phở");
    let report = send_all(&a, &b);
    assert_eq!(report.applied, 1);
    let row = b.row("spending_transactions", &saved.id).unwrap();
    assert_eq!(row["title"], json!("Phở"));
    assert_eq!(row["amount_vnd"], json!(-50_000));
}

#[test]
fn applied_events_leave_no_change_log_entries_on_the_receiver() {
    let (a, b) = a_and_b();
    expense(&a, "Phở");
    send_all(&a, &b);
    assert_eq!(b.events().len(), 0);
    assert_eq!(b.pending_count(), 0);
}

#[test]
fn applying_the_same_events_twice_changes_nothing() {
    let (a, b) = a_and_b();
    expense(&a, "Phở");
    send_all(&a, &b);
    let before = b.dump();
    let again = send_all(&a, &b);
    assert_eq!((again.applied, again.unchanged), (0, 0));
    assert_eq!(b.dump(), before);
}

#[test]
fn replaying_without_the_high_water_mark_is_still_a_no_op() {
    let (a, b) = a_and_b();
    expense(&a, "Phở");
    send_all(&a, &b);
    let before = b.dump();
    b.forget_peers();
    let again = send_all(&a, &b);
    assert_eq!((again.applied, again.unchanged), (0, 1));
    assert_eq!(b.dump(), before);
}

#[test]
fn the_high_water_mark_follows_the_newest_applied_event() {
    let (a, b) = a_and_b();
    expense(&a, "Phở");
    let report = send_all(&a, &b);
    let peer = peers(&b.ctx()).unwrap().remove(0);
    assert_eq!(peer.device_id, "dev-a");
    assert_eq!(peer.high_water_hlc, report.high_water);
    assert_eq!(peer.marker, None);
}

#[test]
fn the_file_marker_is_kept_when_a_later_batch_carries_none() {
    let (a, b) = a_and_b();
    expense(&a, "Phở");
    let mut with_marker = batch(&a, &a.events());
    with_marker.marker = Some("md5-1".into());
    apply_remote(&b.ctx(), with_marker).unwrap();
    let empty = RemoteBatch { device_id: "dev-a".into(), events: vec![], marker: None };
    apply_remote(&b.ctx(), empty).unwrap();
    assert_eq!(peers(&b.ctx()).unwrap()[0].marker.as_deref(), Some("md5-1"));
}

#[test]
fn events_the_app_does_not_know_are_ignored_and_the_rest_still_apply() {
    let (a, b) = a_and_b();
    let saved = expense(&a, "Phở");
    let mut events = a.events();
    let unknown =
        SyncEvent { entity_type: "mystery".into(), event_id: "x1".into(), ..first_event_of(&a) };
    events.push(unknown);
    let mut raw = batch(&a, &events);
    raw.events.push(json!({ "garbage": true }));
    let report = apply_remote(&b.ctx(), raw).unwrap();
    assert_eq!((report.applied, report.ignored), (1, 2));
    assert!(alive(&b, "spending_transactions", &saved.id));
}

#[test]
fn an_event_for_a_module_this_app_does_not_have_is_ignored() {
    let (a, b) = a_and_b();
    expense(&a, "Phở");
    let event = SyncEvent { module: "other".into(), ..first_event_of(&a) };
    let report = apply_remote(&b.ctx(), batch(&a, &[event])).unwrap();
    assert_eq!((report.applied, report.ignored), (0, 1));
}

#[test]
fn events_from_this_device_are_refused() {
    let (a, _) = a_and_b();
    let own = RemoteBatch { device_id: "dev-a".into(), events: vec![], marker: None };
    let error = apply_remote(&a.ctx(), own).unwrap_err();
    assert_eq!(error.code, ErrorCode::Validation);
}

#[test]
fn an_event_signed_by_another_device_than_the_file_is_ignored() {
    let (a, b) = a_and_b();
    expense(&a, "Phở");
    let mut forged = batch(&a, &a.events());
    forged.device_id = "dev-c".into();
    assert_eq!(apply_remote(&b.ctx(), forged).unwrap().ignored, 1);
}

#[test]
fn the_receiving_clock_moves_past_everything_it_received() {
    let (a, b) = a_and_b();
    a.advance(50_000_000);
    expense(&a, "Phở");
    let remote_hlc = first_event_of(&a).hlc;
    send_all(&a, &b);
    assert!(b.ctx().tick().value() > remote_hlc);
}

#[test]
fn a_malformed_event_does_not_stop_the_good_ones() {
    let (a, b) = a_and_b();
    expense(&a, "Phở");
    let mut mixed = batch(&a, &a.events());
    mixed.events.push(serde_json::Value::Null);
    let report = apply_remote(&b.ctx(), mixed).unwrap();
    assert_eq!((report.applied, report.ignored), (1, 1));
}
