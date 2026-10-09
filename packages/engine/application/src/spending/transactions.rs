use alavo_domain::shared::date::Date;
use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::transaction::validate_transaction;
use alavo_domain::spending::{
    normalize_month, Category, Entity, NewTransaction, Transaction, TransactionFilter,
    UpdateTransaction,
};
use alavo_infrastructure::persistence::repositories::spending::categories::find_category;
use alavo_infrastructure::persistence::repositories::spending::transactions::{
    find_transaction, insert_transaction, list_transactions, update_transaction,
};
use alavo_infrastructure::persistence::repositories::spending::wallets::find_wallet;

use crate::context::Ctx;
use crate::spending::budget_alert::BudgetWatch;
use crate::spending::writes::{delete_row, log_insert, log_update, stamp_insert, stamp_update};

pub fn list(ctx: &Ctx, filter: TransactionFilter) -> Result<Vec<Transaction>, EngineError> {
    let month = filter.month.as_deref().map(normalize_month).transpose()?;
    list_transactions(ctx.db, &TransactionFilter { month, ..filter })
}

pub fn get(ctx: &Ctx, id: &str) -> Result<Transaction, EngineError> {
    require(ctx, id)
}

pub fn record(ctx: &Ctx, input: NewTransaction) -> Result<Transaction, EngineError> {
    ctx.transaction(|| {
        let transaction = input.into_transaction(ctx.new_id(), ctx.now_ms(), 0);
        insert_checked(ctx, transaction, Alerts::Raise)
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum Alerts {
    Raise,
    Skip,
}

/// Validates `transaction` and inserts it with its sync event. With `Alerts::Raise` it also
/// raises the budget alert the new amount causes.
pub(super) fn insert_checked(
    ctx: &Ctx,
    transaction: Transaction,
    alerts: Alerts,
) -> Result<Transaction, EngineError> {
    let category = check_references(ctx, &transaction)?;
    let watch = match alerts {
        Alerts::Raise => Some(BudgetWatch::start(ctx, category, month_of(&transaction)?)?),
        Alerts::Skip => None,
    };
    let stamp = stamp_insert(ctx, Entity::Transaction);
    let transaction = Transaction { updated_at: stamp.updated_at, ..transaction };
    insert_transaction(ctx.db, &transaction, &stamp)?;
    log_insert(ctx, Entity::Transaction, &transaction.id)?;
    if let Some(watch) = watch {
        watch.finish(ctx)?;
    }
    Ok(transaction)
}

pub fn update(ctx: &Ctx, input: UpdateTransaction) -> Result<Transaction, EngineError> {
    ctx.transaction(|| {
        let current = require(ctx, &input.id)?;
        let columns = input.changed_columns();
        let merged = current.apply(input);
        check_references(ctx, &merged)?;
        let stamp = stamp_update(ctx, Entity::Transaction, &merged.id, &columns)?;
        update_transaction(ctx.db, &merged, &stamp)?;
        log_update(ctx, Entity::Transaction, &merged.id, &columns)?;
        Ok(Transaction { updated_at: stamp.updated_at, ..merged })
    })
}

pub fn delete(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    ctx.transaction(|| {
        require(ctx, id)?;
        delete_row(ctx, Entity::Transaction, id)
    })
}

fn require(ctx: &Ctx, id: &str) -> Result<Transaction, EngineError> {
    find_transaction(ctx.db, id)?.ok_or_else(|| EngineError::not_found("transaction", id))
}

fn check_references(ctx: &Ctx, transaction: &Transaction) -> Result<Category, EngineError> {
    let category = find_category(ctx.db, &transaction.category_id)?.ok_or_else(|| {
        EngineError::validation(format!("category {} does not exist", transaction.category_id))
    })?;
    if find_wallet(ctx.db, &transaction.wallet_id)?.is_none() {
        let message = format!("wallet {} does not exist", transaction.wallet_id);
        return Err(EngineError::validation(message));
    }
    let amount = transaction.amount_vnd;
    validate_transaction(&transaction.title, &transaction.occurred_on, amount, category.kind)?;
    Ok(category)
}

fn month_of(transaction: &Transaction) -> Result<String, EngineError> {
    Ok(Date::parse(&transaction.occurred_on)?.month_text())
}

#[cfg(test)]
mod tests;
