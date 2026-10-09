use alavo_application::spending::{bills, budget, categories, goals, transactions, wallets};
use alavo_application::Ctx;
use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{
    CategoryKind, ContributeGoal, MonthQuery, NewCategory, NewGoal, NewTransaction, NewWallet,
    SaveBill, TransactionFilter, UpdateCategory, UpdateGoal, UpdateTransaction, UpdateWallet,
};
use serde::Deserialize;
use serde_json::json;

use crate::util::{respond, with_input, Handled};

#[derive(Deserialize)]
struct IdInput {
    id: String,
}

#[derive(Deserialize, Default)]
struct KindInput {
    kind: Option<CategoryKind>,
}

fn deleted(
    payload: &str,
    work: impl FnOnce(&str) -> Result<(), EngineError>,
) -> Result<String, EngineError> {
    with_input(payload, |input: IdInput| work(&input.id).map(|_| json!({})))
}

pub fn handle(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    category_command(ctx, command, payload)
        .or_else(|| wallet_command(ctx, command, payload))
        .or_else(|| transaction_command(ctx, command, payload))
        .or_else(|| report_command(ctx, command, payload))
        .or_else(|| goal_command(ctx, command, payload))
        .or_else(|| bill_command(ctx, command, payload))
}

fn category_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.list_categories" => with_input(payload, |input: Option<KindInput>| {
            categories::list(ctx, input.unwrap_or_default().kind)
        }),
        "spending.create_category" => {
            with_input(payload, |input: NewCategory| categories::create(ctx, input))
        }
        "spending.update_category" => {
            with_input(payload, |input: UpdateCategory| categories::update(ctx, input))
        }
        "spending.delete_category" => deleted(payload, |id| categories::delete(ctx, id)),
        _ => return None,
    })
}

fn wallet_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.list_wallets" => respond(wallets::list(ctx)),
        "spending.create_wallet" => {
            with_input(payload, |input: NewWallet| wallets::create(ctx, input))
        }
        "spending.update_wallet" => {
            with_input(payload, |input: UpdateWallet| wallets::update(ctx, input))
        }
        "spending.delete_wallet" => deleted(payload, |id| wallets::delete(ctx, id)),
        _ => return None,
    })
}

fn transaction_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.list_transactions" => with_input(payload, |input: Option<TransactionFilter>| {
            transactions::list(ctx, input.unwrap_or_default())
        }),
        "spending.get_transaction" => {
            with_input(payload, |input: IdInput| transactions::get(ctx, &input.id))
        }
        "spending.record_transaction" => {
            with_input(payload, |input: NewTransaction| transactions::record(ctx, input))
        }
        "spending.update_transaction" => {
            with_input(payload, |input: UpdateTransaction| transactions::update(ctx, input))
        }
        "spending.delete_transaction" => deleted(payload, |id| transactions::delete(ctx, id)),
        _ => return None,
    })
}

fn report_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.month_summary" => {
            with_input(payload, |input: MonthQuery| budget::month_summary(ctx, input))
        }
        "spending.budget_status" => {
            with_input(payload, |input: MonthQuery| budget::budget_status(ctx, input))
        }
        _ => return None,
    })
}

fn goal_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.list_goals" => respond(goals::list(ctx)),
        "spending.create_goal" => with_input(payload, |input: NewGoal| goals::create(ctx, input)),
        "spending.update_goal" => {
            with_input(payload, |input: UpdateGoal| goals::update(ctx, input))
        }
        "spending.contribute_goal" => {
            with_input(payload, |input: ContributeGoal| goals::contribute(ctx, input))
        }
        "spending.delete_goal" => deleted(payload, |id| goals::delete(ctx, id)),
        _ => return None,
    })
}

fn bill_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.list_bills" => respond(bills::list(ctx)),
        "spending.save_bill" => with_input(payload, |input: SaveBill| bills::save(ctx, input)),
        "spending.delete_bill" => deleted(payload, |id| bills::delete(ctx, id)),
        _ => return None,
    })
}

#[cfg(test)]
mod harness;
#[cfg(test)]
mod tests_engine;
#[cfg(test)]
mod tests_ledger;
#[cfg(test)]
mod tests_setup;
