use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::estimate_input::{factor_from, income_from, item_from};
use alavo_domain::spending::{
    Entity, Estimate, EstimateItem, NewTransaction, RecordPayment, SaveFactor, SaveIncome,
    SaveItem, SetItemPaid,
};
use alavo_infrastructure::persistence::repositories::spending::estimates::{
    estimate_of, insert_factor, insert_income, insert_item, update_factor, update_income,
    update_item, ChildTable,
};
use alavo_infrastructure::persistence::repositories::spending::rows::next_position;

use crate::context::Ctx;
use crate::spending::estimates::{require, view_of, EstimateView};
use crate::spending::transactions;
use crate::spending::writes::{delete_row, log_insert, log_update, stamp_insert, stamp_update};

const ITEM_COLUMNS: &[&str] = &["group_name", "name", "price_vnd", "quantity", "priority", "by_factors"];
const FACTOR_COLUMNS: &[&str] = &["label", "value"];
const INCOME_COLUMNS: &[&str] = &["label", "amount_vnd"];
const PAID_COLUMNS: &[&str] = &["paid_vnd"];

pub fn save_factor(ctx: &Ctx, input: SaveFactor) -> Result<EstimateView, EngineError> {
    ctx.transaction(|| {
        let estimate = require(ctx, &input.estimate_id)?;
        match input.id.as_deref() {
            None => add_factor(ctx, &estimate, &input)?,
            Some(id) => {
                require_child(ctx, ChildTable::Factors, id, &estimate.id)?;
                let factor = factor_from(id.to_string(), &input.label, input.value)?;
                let stamp = stamp_update(ctx, Entity::EstimateFactor, id, FACTOR_COLUMNS)?;
                update_factor(ctx.db, &factor, &stamp)?;
                log_update(ctx, Entity::EstimateFactor, id, FACTOR_COLUMNS)?;
            }
        }
        view_of(ctx, require(ctx, &estimate.id)?)
    })
}

fn add_factor(ctx: &Ctx, estimate: &Estimate, input: &SaveFactor) -> Result<(), EngineError> {
    let factor = factor_from(ctx.new_id(), &input.label, input.value)?;
    let position = next_position(ctx.db, Entity::EstimateFactor)?;
    insert_factor(ctx.db, &estimate.id, &factor, position, &stamp_insert(ctx, Entity::EstimateFactor))?;
    log_insert(ctx, Entity::EstimateFactor, &factor.id)
}

/// An item that multiplied by the deleted factor stops multiplying by it.
pub fn delete_factor(ctx: &Ctx, estimate_id: &str, id: &str) -> Result<EstimateView, EngineError> {
    ctx.transaction(|| {
        let estimate = require(ctx, estimate_id)?;
        require_child(ctx, ChildTable::Factors, id, estimate_id)?;
        for item in estimate.items.iter().filter(|item| item.by.iter().any(|by| by == id)) {
            let without = EstimateItem { by: item.by.iter().filter(|by| *by != id).cloned().collect(), ..item.clone() };
            write_item(ctx, &without, &["by_factors"])?;
        }
        delete_row(ctx, Entity::EstimateFactor, id)?;
        view_of(ctx, require(ctx, estimate_id)?)
    })
}

pub fn save_item(ctx: &Ctx, input: SaveItem) -> Result<EstimateView, EngineError> {
    ctx.transaction(|| {
        let estimate = require(ctx, &input.estimate_id)?;
        match input.id.as_deref() {
            None => add_item(ctx, &estimate, &input)?,
            Some(id) => {
                require_child(ctx, ChildTable::Items, id, &estimate.id)?;
                let paid = estimate.items.iter().find(|item| item.id == id).map_or(Money(0), |item| item.paid);
                write_item(ctx, &item_from(id.to_string(), &estimate, &input, paid)?, ITEM_COLUMNS)?;
            }
        }
        view_of(ctx, require(ctx, &estimate.id)?)
    })
}

fn add_item(ctx: &Ctx, estimate: &Estimate, input: &SaveItem) -> Result<(), EngineError> {
    let item = item_from(ctx.new_id(), estimate, input, Money(0))?;
    let position = next_position(ctx.db, Entity::EstimateItem)?;
    insert_item(ctx.db, &estimate.id, &item, position, &stamp_insert(ctx, Entity::EstimateItem))?;
    log_insert(ctx, Entity::EstimateItem, &item.id)
}

fn write_item(ctx: &Ctx, item: &EstimateItem, columns: &[&str]) -> Result<(), EngineError> {
    let stamp = stamp_update(ctx, Entity::EstimateItem, &item.id, columns)?;
    update_item(ctx.db, item, &stamp)?;
    log_update(ctx, Entity::EstimateItem, &item.id, columns)
}

pub fn delete_item(ctx: &Ctx, estimate_id: &str, id: &str) -> Result<EstimateView, EngineError> {
    ctx.transaction(|| {
        require(ctx, estimate_id)?;
        require_child(ctx, ChildTable::Items, id, estimate_id)?;
        delete_row(ctx, Entity::EstimateItem, id)?;
        view_of(ctx, require(ctx, estimate_id)?)
    })
}

/// Records how much of an item is paid. With `record`, the increase also goes into the ledger as
/// an expense, in the same step, so the money leaves the wallet once and is not counted twice.
pub fn set_item_paid(ctx: &Ctx, input: SetItemPaid) -> Result<EstimateView, EngineError> {
    ctx.transaction(|| {
        let estimate_id = estimate_of(ctx.db, ChildTable::Items, &input.id)?
            .ok_or_else(|| EngineError::not_found("estimate item", &input.id))?;
        let estimate = require(ctx, &estimate_id)?;
        let item = estimate.items.iter().find(|item| item.id == input.id).cloned()
            .ok_or_else(|| EngineError::not_found("estimate item", &input.id))?;
        if input.paid.is_negative() {
            return Err(EngineError::validation("paid must not be negative"));
        }
        let paid = input.paid.min(estimate.amount_of(&item));
        let increase = paid - estimate.paid_of(&item);
        if let Some(record) = input.record.as_ref().filter(|_| increase.vnd() > 0) {
            record_payment(ctx, &estimate, &item, increase, record)?;
        }
        let stamp = stamp_update(ctx, Entity::EstimateItem, &item.id, PAID_COLUMNS)?;
        update_item(ctx.db, &EstimateItem { paid, ..item.clone() }, &stamp)?;
        log_update(ctx, Entity::EstimateItem, &item.id, PAID_COLUMNS)?;
        view_of(ctx, require(ctx, &estimate_id)?)
    })
}

fn record_payment(
    ctx: &Ctx,
    estimate: &Estimate,
    item: &EstimateItem,
    amount: Money,
    record: &RecordPayment,
) -> Result<(), EngineError> {
    let expense = NewTransaction {
        title: item.name.clone(),
        amount_vnd: -amount,
        category_id: record.category_id.clone(),
        wallet_id: record.wallet_id.clone(),
        occurred_on: record.occurred_on.clone(),
        note: estimate.name.clone(),
        recurring_rule: None,
        payment_method_id: record.payment_method_id.clone(),
    };
    transactions::record(ctx, expense).map(|_| ())
}

pub fn save_income(ctx: &Ctx, input: SaveIncome) -> Result<EstimateView, EngineError> {
    ctx.transaction(|| {
        let estimate = require(ctx, &input.estimate_id)?;
        match input.id.as_deref() {
            None => add_income(ctx, &estimate, &input)?,
            Some(id) => {
                require_child(ctx, ChildTable::Income, id, &estimate.id)?;
                let line = income_from(id.to_string(), &input)?;
                let stamp = stamp_update(ctx, Entity::EstimateIncome, id, INCOME_COLUMNS)?;
                update_income(ctx.db, &line, &stamp)?;
                log_update(ctx, Entity::EstimateIncome, id, INCOME_COLUMNS)?;
            }
        }
        view_of(ctx, require(ctx, &estimate.id)?)
    })
}

fn add_income(ctx: &Ctx, estimate: &Estimate, input: &SaveIncome) -> Result<(), EngineError> {
    let line = income_from(ctx.new_id(), input)?;
    let position = next_position(ctx.db, Entity::EstimateIncome)?;
    insert_income(ctx.db, &estimate.id, &line, position, &stamp_insert(ctx, Entity::EstimateIncome))?;
    log_insert(ctx, Entity::EstimateIncome, &line.id)
}

pub fn delete_income(ctx: &Ctx, estimate_id: &str, id: &str) -> Result<EstimateView, EngineError> {
    ctx.transaction(|| {
        require(ctx, estimate_id)?;
        require_child(ctx, ChildTable::Income, id, estimate_id)?;
        delete_row(ctx, Entity::EstimateIncome, id)?;
        view_of(ctx, require(ctx, estimate_id)?)
    })
}

/// A child row can only be changed through the estimate it belongs to.
fn require_child(ctx: &Ctx, table: ChildTable, id: &str, estimate_id: &str) -> Result<(), EngineError> {
    match estimate_of(ctx.db, table, id)? {
        Some(owner) if owner == estimate_id => Ok(()),
        _ => Err(EngineError::not_found("estimate row", id)),
    }
}
