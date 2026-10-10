use alavo_domain::recipes::expense::{draft_expense, ExpenseDraft, LogShoppingExpense};
use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{NewTransaction, Transaction};

use crate::context::Ctx;
use crate::recipes::shopping::get_list;
use crate::spending::contract::record_transaction;

/// Records what is still to be bought in the range as one expense, through the spending
/// contract. This module never touches spending tables.
pub fn log_shopping_expense(
    ctx: &Ctx,
    input: LogShoppingExpense,
) -> Result<Transaction, EngineError> {
    let list = get_list(ctx, &input.from, &input.to)?;
    let draft = draft_expense(&list, input.title.as_deref())?;
    record_transaction(ctx, new_transaction(input, draft))
}

fn new_transaction(input: LogShoppingExpense, draft: ExpenseDraft) -> NewTransaction {
    NewTransaction {
        payment_method_id: None,
        title: draft.title,
        amount_vnd: draft.amount,
        category_id: input.category_id,
        wallet_id: input.wallet_id,
        occurred_on: input.occurred_on,
        note: String::new(),
        recurring_rule: None,
    }
}

#[cfg(test)]
mod tests;
