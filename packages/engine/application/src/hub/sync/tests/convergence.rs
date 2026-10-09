use alavo_domain::sync::remote_event::SyncEvent;
use serde_json::json;

use super::super::apply::apply_remote;
use super::super::test_support::{
    alive, batch, create_recipe, deliver_in_order, edit_transaction, exchange, expense,
    plan_dinner, send_all, Device,
};
use crate::spending::transactions;

const TX: &str = "spending_transactions";
const RECIPES: &str = "recipes_recipes";

fn devices() -> (Device, Device) {
    let (a, b) = (Device::new("dev-a"), Device::new("dev-b"));
    b.advance(1_000);
    (a, b)
}

fn shared_expense(a: &Device, b: &Device) -> String {
    let id = expense(a, "Phở").id;
    send_all(a, b);
    id
}

#[test]
fn edits_to_different_fields_of_one_transaction_both_survive() {
    let (a, b) = devices();
    let id = shared_expense(&a, &b);
    a.advance(5_000);
    b.advance(7_000);
    edit_transaction(&a, &id, json!({ "title": "Bún bò" }));
    edit_transaction(&b, &id, json!({ "note": "Có hành" }));
    exchange(&a, &b);
    for device in [&a, &b] {
        let row = device.row(TX, &id).unwrap();
        assert_eq!(
            (row["title"].clone(), row["note"].clone()),
            (json!("Bún bò"), json!("Có hành"))
        );
    }
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn the_later_edit_of_the_same_field_wins_on_both_devices() {
    let (a, b) = devices();
    let id = shared_expense(&a, &b);
    a.advance(5_000);
    b.advance(9_000);
    edit_transaction(&a, &id, json!({ "title": "Sớm" }));
    edit_transaction(&b, &id, json!({ "title": "Muộn" }));
    exchange(&a, &b);
    assert_eq!(a.row(TX, &id).unwrap()["title"], json!("Muộn"));
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn a_delete_on_one_device_beats_an_earlier_edit_on_the_other() {
    let (a, b) = devices();
    let id = shared_expense(&a, &b);
    b.advance(5_000);
    edit_transaction(&b, &id, json!({ "note": "sửa" }));
    a.advance(20_000);
    transactions::delete(&a.ctx(), &id).unwrap();
    exchange(&a, &b);
    assert!(!alive(&a, TX, &id) && !alive(&b, TX, &id));
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn an_edit_made_after_a_delete_brings_the_row_back_on_both_devices() {
    let (a, b) = devices();
    let id = shared_expense(&a, &b);
    a.advance(5_000);
    transactions::delete(&a.ctx(), &id).unwrap();
    b.advance(30_000);
    edit_transaction(&b, &id, json!({ "note": "vẫn cần" }));
    exchange(&a, &b);
    assert!(alive(&a, TX, &id) && alive(&b, TX, &id));
    assert_eq!(a.row(TX, &id).unwrap()["note"], json!("vẫn cần"));
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn a_day_offline_then_a_sync_brings_both_devices_together() {
    let (a, b) = devices();
    let shared = shared_expense(&a, &b);
    a.advance(86_400_000);
    b.advance(86_400_000 + 3_000);
    expense(&a, "Cà phê");
    edit_transaction(&a, &shared, json!({ "title": "Phở đặc biệt" }));
    expense(&b, "Bánh mì");
    transactions::delete(&b.ctx(), &shared).unwrap();
    exchange(&a, &b);
    assert_eq!(a.dump(), b.dump());
    assert_eq!(
        a.count("SELECT COUNT(*) AS total FROM spending_transactions WHERE deleted_at IS NULL"),
        2
    );
}

#[test]
fn recipe_children_arriving_before_the_recipe_still_assemble_it() {
    let (a, b) = devices();
    let recipe = create_recipe(&a, "Gà kho");
    let mut events = a.events();
    events.reverse();
    deliver_in_order(&a, &b, &events);
    assert!(alive(&b, RECIPES, &recipe));
    let ingredients =
        b.count("SELECT COUNT(*) AS total FROM recipes_ingredients WHERE deleted_at IS NULL");
    let steps = b.count("SELECT COUNT(*) AS total FROM recipes_steps WHERE deleted_at IS NULL");
    assert_eq!((ingredients, steps), (2, 2));
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn a_plan_entry_for_a_recipe_the_receiver_has_not_seen_yet_is_kept() {
    let (a, b) = devices();
    let recipe = create_recipe(&a, "Gà kho");
    let entry = plan_dinner(&a, &recipe, "2026-10-10");
    let only_plan: Vec<SyncEvent> =
        a.events().into_iter().filter(|event| event.entity_type == "plan_entry").collect();
    apply_remote(&b.ctx(), batch(&a, &only_plan)).unwrap();
    assert!(alive(&b, "recipes_plan_entries", &entry));
    b.forget_peers();
    send_all(&a, &b);
    assert!(alive(&b, RECIPES, &recipe));
    assert_eq!(a.dump(), b.dump());
}

#[test]
fn a_delete_that_reaches_a_third_device_before_the_row_still_deletes_it() {
    let (a, b) = devices();
    let c = Device::new("dev-c");
    let id = shared_expense(&a, &b);
    b.advance(4_000);
    transactions::delete(&b.ctx(), &id).unwrap();
    send_all(&b, &c);
    send_all(&a, &c);
    assert!(!alive(&c, TX, &id));
}

#[test]
fn three_devices_end_in_the_same_state_whatever_order_they_hear_in() {
    let (a, b) = devices();
    let c = Device::new("dev-c");
    c.advance(2_000);
    let id = shared_expense(&a, &b);
    send_all(&a, &c);
    edit_transaction(&a, &id, json!({ "title": "Từ A" }));
    b.advance(3_000);
    edit_transaction(&b, &id, json!({ "note": "Từ B" }));
    c.advance(4_000);
    let recipe = create_recipe(&c, "Canh chua");
    plan_dinner(&c, &recipe, "2026-10-11");
    let (x, y) = (Device::new("dev-x"), Device::new("dev-y"));
    for sender in [&a, &b, &c] {
        send_all(sender, &x);
    }
    for sender in [&c, &b, &a] {
        let mut newest_first = sender.events();
        newest_first.reverse();
        deliver_in_order(sender, &y, &newest_first);
    }
    assert_eq!(x.dump(), y.dump());
    let row = x.row(TX, &id).unwrap();
    assert_eq!((row["title"].clone(), row["note"].clone()), (json!("Từ A"), json!("Từ B")));
}
