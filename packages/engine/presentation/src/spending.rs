use alavo_application::spending::import::{ImportRequest, PreviewRequest};
use alavo_application::spending::recurring::GenerateRecurring;
use alavo_application::spending::{
    bills, budget, categories, estimate_rows, estimates, goals, import, payment_methods, recurring, reports, transactions,
    wallets,
};
use alavo_application::Ctx;
use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::report::ReportRange;
use alavo_domain::spending::{
    CategoryKind, ContributeGoal, DeleteCategory, DeleteWallet, MonthQuery, NewCategory, NewGoal, NewPaymentMethod,
    NewTransaction, NewWallet, NewEstimate, SaveBill, SaveFactor, SaveIncome, SaveItem,
    SetItemPaid, TransactionFilter, UpdateCategory, UpdateEstimate, UpdateGoal,
    UpdatePaymentMethod, UpdateTransaction, UpdateWallet,
};
use serde::Deserialize;
use serde_json::json;

use crate::util::{respond, with_input, Handled};

#[derive(Deserialize)]
struct IdInput {
    id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChildInput {
    estimate_id: String,
    id: String,
}

#[derive(Deserialize)]
struct IdsInput {
    ids: Vec<String>,
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
        .or_else(|| payment_method_command(ctx, command, payload))
        .or_else(|| estimate_command(ctx, command, payload))
        .or_else(|| transaction_command(ctx, command, payload))
        .or_else(|| report_command(ctx, command, payload))
        .or_else(|| recurring_command(ctx, command, payload))
        .or_else(|| statement_command(ctx, command, payload))
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
        "spending.delete_category" => with_input(payload, |input: DeleteCategory| {
            categories::delete(ctx, input).map(|_| json!({}))
        }),
        "spending.reorder_categories" => with_input(payload, |input: IdsInput| {
            categories::reorder(ctx, &input.ids)
        }),
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
        "spending.delete_wallet" => with_input(payload, |input: DeleteWallet| {
            wallets::delete(ctx, input).map(|_| json!({}))
        }),
        _ => return None,
    })
}

fn payment_method_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.list_payment_methods" => respond(payment_methods::list(ctx)),
        "spending.create_payment_method" => with_input(payload, |input: NewPaymentMethod| {
            payment_methods::create(ctx, input)
        }),
        "spending.update_payment_method" => with_input(payload, |input: UpdatePaymentMethod| {
            payment_methods::update(ctx, input)
        }),
        "spending.delete_payment_method" => deleted(payload, |id| payment_methods::delete(ctx, id)),
        _ => return None,
    })
}

fn estimate_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.list_estimates" => respond(estimates::list(ctx)),
        "spending.get_estimate" => {
            with_input(payload, |input: IdInput| estimates::get(ctx, &input.id))
        }
        "spending.create_estimate" => {
            with_input(payload, |input: NewEstimate| estimates::create(ctx, input))
        }
        "spending.update_estimate" => {
            with_input(payload, |input: UpdateEstimate| estimates::update(ctx, input))
        }
        "spending.delete_estimate" => deleted(payload, |id| estimates::delete(ctx, id)),
        _ => return estimate_row_command(ctx, command, payload),
    })
}

fn estimate_row_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.save_estimate_factor" => {
            with_input(payload, |input: SaveFactor| estimate_rows::save_factor(ctx, input))
        }
        "spending.delete_estimate_factor" => with_input(payload, |input: ChildInput| {
            estimate_rows::delete_factor(ctx, &input.estimate_id, &input.id)
        }),
        "spending.save_estimate_item" => {
            with_input(payload, |input: SaveItem| estimate_rows::save_item(ctx, input))
        }
        "spending.delete_estimate_item" => with_input(payload, |input: ChildInput| {
            estimate_rows::delete_item(ctx, &input.estimate_id, &input.id)
        }),
        "spending.set_estimate_item_paid" => {
            with_input(payload, |input: SetItemPaid| estimate_rows::set_item_paid(ctx, input))
        }
        "spending.save_estimate_income" => {
            with_input(payload, |input: SaveIncome| estimate_rows::save_income(ctx, input))
        }
        "spending.delete_estimate_income" => with_input(payload, |input: ChildInput| {
            estimate_rows::delete_income(ctx, &input.estimate_id, &input.id)
        }),
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
        "spending.report" => with_input(payload, |input: ReportRange| reports::report(ctx, input)),
        "spending.export_csv" => {
            with_input(payload, |input: ReportRange| reports::export_csv(ctx, input))
        }
        _ => return None,
    })
}

fn recurring_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.generate_recurring" => {
            with_input(payload, |input: GenerateRecurring| recurring::generate(ctx, input))
        }
        _ => return None,
    })
}

fn statement_command(ctx: &Ctx, command: &str, payload: &str) -> Handled {
    Some(match command {
        "spending.import_preview" => {
            with_input(payload, |input: PreviewRequest| import::preview(ctx, input))
        }
        "spending.import_transactions" => {
            with_input(payload, |input: ImportRequest| import::import(ctx, input))
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
mod tests_import;
#[cfg(test)]
mod tests_ledger;
#[cfg(test)]
mod tests_recurring;
#[cfg(test)]
mod tests_reports;
#[cfg(test)]
mod tests_estimates;
#[cfg(test)]
mod tests_setup;
