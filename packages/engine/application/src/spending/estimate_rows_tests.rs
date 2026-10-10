use alavo_domain::shared::error::ErrorCode;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{
    NewEstimate, NewFactor, Priority, RecordPayment, SaveFactor, SaveIncome, SaveItem, SetItemPaid,
};

use crate::context::Ctx;
use crate::spending::estimate_rows::{
    delete_factor, delete_income, delete_item, save_factor, save_income, save_item, set_item_paid,
};
use crate::spending::estimates::{create, delete, get, EstimateView};
use crate::spending::test_support::{income, Fixture, CASH, FOOD};
use crate::spending::{transactions, wallets};

fn plan(ctx: &Ctx) -> EstimateView {
    let input = NewEstimate {
        name: "Đám cưới".into(),
        icon: "gift".into(),
        contingency_percent: 10,
        wallet_ids: vec![CASH.into()],
        factors: vec![NewFactor { label: "khách".into(), value: 200 }],
    };
    create(ctx, input).unwrap()
}

fn item(view: &EstimateView, name: &str, price: i64) -> SaveItem {
    SaveItem {
        estimate_id: view.estimate.id.clone(),
        id: None,
        group: "Tiệc".into(),
        name: name.into(),
        price: Money(price),
        quantity: 1,
        priority: Priority::Must,
        by: view.estimate.factors.iter().map(|factor| factor.id.clone()).collect(),
    }
}

fn plain_item(view: &EstimateView, name: &str, price: i64) -> SaveItem {
    SaveItem { by: Vec::new(), ..item(view, name, price) }
}

fn cash_balance(ctx: &Ctx) -> Money {
    wallets::list(ctx).unwrap().into_iter().find(|wallet| wallet.id == CASH).unwrap().balance_vnd
}

fn payment() -> RecordPayment {
    RecordPayment {
        category_id: FOOD.into(),
        wallet_id: CASH.into(),
        occurred_on: "2026-10-08".into(),
        payment_method_id: None,
    }
}

fn pay(id: &str, amount: i64, record: Option<RecordPayment>) -> SetItemPaid {
    SetItemPaid { id: id.into(), paid: Money(amount), record }
}

#[test]
fn an_item_multiplied_by_a_factor_is_added_up_with_it() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let view = plan(&ctx);
    let view = save_item(&ctx, item(&view, "Tiệc nhà hàng", 450_000)).unwrap();
    assert_eq!(view.totals.base, Money(90_000_000));
    assert_eq!(view.totals.contingency, Money(9_000_000));
    assert_eq!(fixture.events("estimate_item").len(), 1);
}

#[test]
fn changing_a_factor_recalculates_every_item_that_uses_it() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let view = plan(&ctx);
    let view = save_item(&ctx, item(&view, "Tiệc", 100_000)).unwrap();
    let factor_id = view.estimate.factors[0].id.clone();
    let change = SaveFactor {
        estimate_id: view.estimate.id.clone(),
        id: Some(factor_id),
        label: "khách".into(),
        value: 300,
    };
    assert_eq!(save_factor(&ctx, change).unwrap().totals.base, Money(30_000_000));
}

#[test]
fn deleting_a_factor_stops_the_items_multiplying_by_it() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let view = plan(&ctx);
    let view = save_item(&ctx, item(&view, "Tiệc", 100_000)).unwrap();
    let factor_id = view.estimate.factors[0].id.clone();
    let view = delete_factor(&ctx, &view.estimate.id, &factor_id).unwrap();
    assert!(view.estimate.factors.is_empty());
    assert!(view.estimate.items[0].by.is_empty());
    assert_eq!(view.totals.base, Money(100_000));
}

#[test]
fn an_item_keeps_what_was_paid_when_its_other_fields_are_edited() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let view = plan(&ctx);
    let view = save_item(&ctx, plain_item(&view, "Nhẫn", 5_000_000)).unwrap();
    let id = view.estimate.items[0].id.clone();
    set_item_paid(&ctx, pay(&id, 2_000_000, None)).unwrap();
    let edit = SaveItem { id: Some(id), ..plain_item(&view, "Nhẫn", 6_000_000) };
    let view = save_item(&ctx, edit).unwrap();
    assert_eq!(view.estimate.items[0].paid, Money(2_000_000));
    assert_eq!(view.totals.base, Money(6_000_000));
}

#[test]
fn marking_paid_without_recording_leaves_the_wallet_alone_and_counts_the_money_as_gone() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let view = plan(&ctx);
    let view = save_item(&ctx, plain_item(&view, "Nhẫn", 5_000_000)).unwrap();
    let id = view.estimate.items[0].id.clone();
    let view = set_item_paid(&ctx, pay(&id, 5_000_000, None)).unwrap();
    assert_eq!(view.totals.paid, Money(5_000_000));
    assert_eq!(view.totals.remaining, Money(500_000));
    assert_eq!(cash_balance(&ctx), Money(0));
}

#[test]
fn recording_a_payment_takes_the_increase_out_of_the_wallet_once() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    transactions::record(&ctx, income("Lương", 10_000_000, "2026-10-07")).unwrap();
    let view = plan(&ctx);
    let view = save_item(&ctx, plain_item(&view, "Nhẫn", 5_000_000)).unwrap();
    let id = view.estimate.items[0].id.clone();
    set_item_paid(&ctx, pay(&id, 2_000_000, Some(payment()))).unwrap();
    assert_eq!(cash_balance(&ctx), Money(8_000_000));
    set_item_paid(&ctx, pay(&id, 5_000_000, Some(payment()))).unwrap();
    assert_eq!(cash_balance(&ctx), Money(5_000_000));
}

#[test]
fn lowering_or_repeating_a_payment_records_nothing_more() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    transactions::record(&ctx, income("Lương", 10_000_000, "2026-10-07")).unwrap();
    let view = plan(&ctx);
    let view = save_item(&ctx, plain_item(&view, "Nhẫn", 5_000_000)).unwrap();
    let id = view.estimate.items[0].id.clone();
    set_item_paid(&ctx, pay(&id, 3_000_000, Some(payment()))).unwrap();
    set_item_paid(&ctx, pay(&id, 3_000_000, Some(payment()))).unwrap();
    let view = set_item_paid(&ctx, pay(&id, 1_000_000, Some(payment()))).unwrap();
    assert_eq!(cash_balance(&ctx), Money(7_000_000));
    assert_eq!(view.estimate.items[0].paid, Money(1_000_000));
}

#[test]
fn paying_more_than_the_item_costs_only_counts_the_cost() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    transactions::record(&ctx, income("Lương", 10_000_000, "2026-10-07")).unwrap();
    let view = plan(&ctx);
    let view = save_item(&ctx, plain_item(&view, "Nhẫn", 1_000_000)).unwrap();
    let id = view.estimate.items[0].id.clone();
    let view = set_item_paid(&ctx, pay(&id, 9_000_000, Some(payment()))).unwrap();
    assert_eq!(view.estimate.items[0].paid, Money(1_000_000));
    assert_eq!(cash_balance(&ctx), Money(9_000_000));
}

#[test]
fn a_failed_recording_leaves_the_item_unpaid() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let view = plan(&ctx);
    let view = save_item(&ctx, plain_item(&view, "Nhẫn", 1_000_000)).unwrap();
    let id = view.estimate.items[0].id.clone();
    let broken = RecordPayment { wallet_id: "nope".into(), ..payment() };
    let error = set_item_paid(&ctx, pay(&id, 500_000, Some(broken))).unwrap_err();
    assert_eq!(error.code, ErrorCode::Validation);
    assert_eq!(get(&ctx, &view.estimate.id).unwrap().estimate.items[0].paid, Money(0));
}

#[test]
fn expected_income_is_added_to_the_result_and_shown_without_it_too() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let view = plan(&ctx);
    let view = save_item(&ctx, plain_item(&view, "Tiệc", 10_000_000)).unwrap();
    let line = SaveIncome {
        estimate_id: view.estimate.id.clone(),
        id: None,
        label: "Tiền mừng".into(),
        amount: Money(4_000_000),
    };
    let view = save_income(&ctx, line).unwrap();
    assert_eq!(view.totals.result, Money(-11_000_000 + 4_000_000));
    assert_eq!(view.totals.without_incoming, Money(-11_000_000));
    let id = view.estimate.income[0].id.clone();
    let view = delete_income(&ctx, &view.estimate.id, &id).unwrap();
    assert!(view.estimate.income.is_empty());
}

#[test]
fn a_row_can_only_be_changed_through_its_own_estimate() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    let first = plan(&ctx);
    let first = save_item(&ctx, item(&first, "Tiệc", 1_000)).unwrap();
    let second = plan(&ctx);
    let item_id = first.estimate.items[0].id.clone();
    let error = delete_item(&ctx, &second.estimate.id, &item_id).unwrap_err();
    assert_eq!(error.code, ErrorCode::NotFound);
}

#[test]
fn deleting_an_estimate_keeps_the_payments_that_were_recorded() {
    let fixture = Fixture::new();
    let ctx = fixture.ctx();
    transactions::record(&ctx, income("Lương", 10_000_000, "2026-10-07")).unwrap();
    let view = plan(&ctx);
    let view = save_item(&ctx, plain_item(&view, "Nhẫn", 5_000_000)).unwrap();
    let id = view.estimate.items[0].id.clone();
    set_item_paid(&ctx, pay(&id, 2_000_000, Some(payment()))).unwrap();
    delete(&ctx, &view.estimate.id).unwrap();
    assert_eq!(cash_balance(&ctx), Money(8_000_000));
}
