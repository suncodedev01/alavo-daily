use alavo_domain::recipes::kinds::MealSlot;
use alavo_domain::shared::error::ErrorCode;
use alavo_domain::shared::money::Money;

use super::*;
use crate::recipes::shopping::set_have;
use crate::recipes::test_support::{
    all_event_count, assert_code, create_recipe, plan_meal, with_ctx,
};

fn request(title: Option<&str>) -> LogShoppingExpense {
    LogShoppingExpense {
        from: "2026-10-05".into(),
        to: "2026-10-11".into(),
        wallet_id: "wallet-cash".into(),
        category_id: "category-food".into(),
        occurred_on: "2026-10-09".into(),
        title: title.map(String::from),
    }
}

fn plan_one_recipe(ctx: &Ctx) {
    let id = create_recipe(ctx, "Gà kho").summary.id;
    plan_meal(ctx, "2026-10-07", MealSlot::Dinner, &id);
}

#[test]
fn the_transaction_carries_the_negative_needed_cost_the_given_ids_and_no_note() {
    let draft = ExpenseDraft { title: "Đi chợ".into(), amount: Money(-27_000) };
    let transaction = new_transaction(request(None), draft);
    assert_eq!(transaction.amount_vnd, Money(-27_000));
    assert_eq!(transaction.wallet_id, "wallet-cash");
    assert_eq!(transaction.category_id, "category-food");
    assert_eq!(transaction.occurred_on, "2026-10-09");
    assert_eq!(transaction.note, "");
    assert_eq!(transaction.recurring_rule, None);
}

#[test]
fn an_empty_plan_has_nothing_to_record_and_never_reaches_spending() {
    with_ctx(|ctx| {
        assert_code(log_shopping_expense(ctx, request(None)), ErrorCode::Validation);
        assert_eq!(all_event_count(ctx), 0);
    });
}

#[test]
fn a_list_where_everything_is_at_home_has_nothing_to_record() {
    with_ctx(|ctx| {
        plan_one_recipe(ctx);
        set_have(ctx, "Đùi gà|g", true).unwrap();
        assert_code(log_shopping_expense(ctx, request(None)), ErrorCode::Validation);
    });
}

#[test]
fn a_broken_range_is_rejected_before_spending_is_called() {
    with_ctx(|ctx| {
        let input = LogShoppingExpense { from: "soon".into(), ..request(None) };
        assert_code(log_shopping_expense(ctx, input), ErrorCode::Validation);
    });
}

#[test]
fn recording_goes_through_the_spending_contract() {
    with_ctx(|ctx| {
        plan_one_recipe(ctx);
        let transaction = log_shopping_expense(ctx, request(Some("Chợ tuần"))).unwrap();
        assert_eq!(transaction.amount_vnd, Money(-27_000));
        assert_eq!(transaction.title, "Chợ tuần");
    });
}
