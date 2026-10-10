use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{
    Entity, Estimate, EstimateTotals, NewEstimate, SavingOption, UpdateEstimate,
};
use alavo_infrastructure::persistence::repositories::spending::estimates::{
    child_ids, insert_estimate, insert_factor, list_estimate_ids, load_estimate, update_estimate,
    ChildTable,
};
use alavo_infrastructure::persistence::repositories::spending::rows::next_position;
use alavo_infrastructure::persistence::repositories::spending::wallets::list_wallets;
use serde::Serialize;

use crate::context::Ctx;
use crate::spending::writes::{delete_row, log_insert, log_update, stamp_insert, stamp_update};

/// An estimate as the screen shows it: the list it is made of, the sums, and what dropping
/// the less important items would do to the result.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateView {
    pub estimate: Estimate,
    pub totals: EstimateTotals,
    pub saving_options: Vec<SavingOption>,
    /// What each item costs and how much of it is paid, in the order of `estimate.items`.
    pub amounts: Vec<ItemAmount>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemAmount {
    pub id: String,
    pub amount: Money,
    pub paid: Money,
}

/// One line of the list of estimates.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateSummary {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub item_count: usize,
    pub total: Money,
    pub remaining: Money,
    pub result: Money,
    pub covered_percent: i64,
}

pub fn list(ctx: &Ctx) -> Result<Vec<EstimateSummary>, EngineError> {
    let balances = wallet_balances(ctx)?;
    let mut summaries = Vec::new();
    for id in list_estimate_ids(ctx.db)? {
        let estimate = require(ctx, &id)?;
        let totals = estimate.totals(&balances);
        summaries.push(EstimateSummary {
            item_count: estimate.items.len(),
            id: estimate.id,
            name: estimate.name,
            icon: estimate.icon,
            total: totals.total,
            remaining: totals.remaining,
            result: totals.result,
            covered_percent: totals.covered_percent,
        });
    }
    Ok(summaries)
}

pub fn get(ctx: &Ctx, id: &str) -> Result<EstimateView, EngineError> {
    view_of(ctx, require(ctx, id)?)
}

pub fn create(ctx: &Ctx, input: NewEstimate) -> Result<EstimateView, EngineError> {
    ctx.transaction(|| {
        let factor_ids = input.factors.iter().map(|_| ctx.new_id()).collect();
        let estimate = Estimate::from_new(ctx.new_id(), input, factor_ids)?;
        let position = next_position(ctx.db, Entity::Estimate)?;
        insert_estimate(ctx.db, &estimate, position, &stamp_insert(ctx, Entity::Estimate))?;
        log_insert(ctx, Entity::Estimate, &estimate.id)?;
        for (index, factor) in estimate.factors.iter().enumerate() {
            let stamp = stamp_insert(ctx, Entity::EstimateFactor);
            insert_factor(ctx.db, &estimate.id, factor, index as i64 + 1, &stamp)?;
            log_insert(ctx, Entity::EstimateFactor, &factor.id)?;
        }
        view_of(ctx, require(ctx, &estimate.id)?)
    })
}

pub fn update(ctx: &Ctx, input: UpdateEstimate) -> Result<EstimateView, EngineError> {
    ctx.transaction(|| {
        let current = require(ctx, &input.id)?;
        let columns = input.changed_columns();
        let estimate = current.apply(input)?;
        let stamp = stamp_update(ctx, Entity::Estimate, &estimate.id, &columns)?;
        update_estimate(ctx.db, &estimate, &stamp)?;
        log_update(ctx, Entity::Estimate, &estimate.id, &columns)?;
        view_of(ctx, require(ctx, &estimate.id)?)
    })
}

/// Deleting an estimate takes its factors, items and expected income with it. The payments that
/// were recorded in the ledger stay: that money did leave the wallet.
pub fn delete(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    ctx.transaction(|| {
        require(ctx, id)?;
        for (table, entity) in CHILDREN {
            for child in child_ids(ctx.db, table, id)? {
                delete_row(ctx, entity, &child)?;
            }
        }
        delete_row(ctx, Entity::Estimate, id)
    })
}

const CHILDREN: [(ChildTable, Entity); 3] = [
    (ChildTable::Factors, Entity::EstimateFactor),
    (ChildTable::Items, Entity::EstimateItem),
    (ChildTable::Income, Entity::EstimateIncome),
];

pub fn require(ctx: &Ctx, id: &str) -> Result<Estimate, EngineError> {
    load_estimate(ctx.db, id)?.ok_or_else(|| EngineError::not_found("estimate", id))
}

pub fn view_of(ctx: &Ctx, estimate: Estimate) -> Result<EstimateView, EngineError> {
    let totals = estimate.totals(&wallet_balances(ctx)?);
    let saving_options = estimate.saving_options(&totals);
    let amounts = estimate
        .items
        .iter()
        .map(|item| ItemAmount {
            id: item.id.clone(),
            amount: estimate.amount_of(item),
            paid: estimate.paid_of(item),
        })
        .collect();
    Ok(EstimateView { estimate, totals, saving_options, amounts })
}

fn wallet_balances(ctx: &Ctx) -> Result<Vec<(String, Money)>, EngineError> {
    Ok(list_wallets(ctx.db)?.into_iter().map(|wallet| (wallet.id, wallet.balance_vnd)).collect())
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::error::ErrorCode;
    use alavo_domain::spending::NewFactor;

    use crate::spending::test_support::{income, Fixture, CASH};
    use crate::spending::transactions;

    use super::*;

    fn new_estimate(name: &str) -> NewEstimate {
        NewEstimate {
            name: name.into(),
            icon: "gift".into(),
            contingency_percent: 10,
            wallet_ids: vec![CASH.into()],
            factors: vec![NewFactor { label: "khách".into(), value: 200 }],
        }
    }

    #[test]
    fn create_makes_the_estimate_with_its_starting_factors_and_logs_every_row() {
        let fixture = Fixture::new();
        let view = create(&fixture.ctx(), new_estimate("Đám cưới")).unwrap();
        assert_eq!((view.estimate.name.as_str(), view.estimate.factors.len()), ("Đám cưới", 1));
        assert_eq!(view.totals.base, Money(0));
        assert_eq!(fixture.events("estimate").len(), 1);
        assert_eq!(fixture.events("estimate_factor").len(), 1);
    }

    #[test]
    fn create_rejects_a_blank_name_and_writes_nothing() {
        let fixture = Fixture::new();
        let error = create(&fixture.ctx(), new_estimate(" ")).unwrap_err();
        assert_eq!(error.code, ErrorCode::Validation);
        assert!(list(&fixture.ctx()).unwrap().is_empty());
        assert!(fixture.events("estimate").is_empty());
    }

    #[test]
    fn the_list_shows_each_estimate_in_the_order_it_was_made() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        create(&ctx, new_estimate("Đám cưới")).unwrap();
        create(&ctx, new_estimate("Du lịch")).unwrap();
        let names: Vec<String> = list(&ctx).unwrap().into_iter().map(|line| line.name).collect();
        assert_eq!(names, ["Đám cưới", "Du lịch"]);
    }

    #[test]
    fn update_changes_the_settings_and_logs_only_the_changed_columns() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let id = create(&ctx, new_estimate("Đám cưới")).unwrap().estimate.id;
        let change = UpdateEstimate {
            id: id.clone(),
            name: None,
            icon: None,
            contingency_percent: Some(20),
            wallet_ids: Some(vec![]),
        };
        let view = update(&ctx, change).unwrap();
        assert_eq!((view.estimate.contingency_percent, view.estimate.wallet_ids.len()), (20, 0));
        let update_event = fixture.events("estimate").into_iter().find(|e| e.action == "update").unwrap();
        assert_eq!(update_event.changed_fields, r#"["contingency_percent","wallet_ids"]"#);
    }

    #[test]
    fn update_rejects_a_contingency_that_was_not_offered() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let id = create(&ctx, new_estimate("Đám cưới")).unwrap().estimate.id;
        let change = UpdateEstimate { id, name: None, icon: None, contingency_percent: Some(33), wallet_ids: None };
        assert_eq!(update(&ctx, change).unwrap_err().code, ErrorCode::Validation);
    }

    #[test]
    fn delete_removes_the_estimate_and_everything_under_it() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let id = create(&ctx, new_estimate("Đám cưới")).unwrap().estimate.id;
        delete(&ctx, &id).unwrap();
        assert!(list(&ctx).unwrap().is_empty());
        assert_eq!(get(&ctx, &id).unwrap_err().code, ErrorCode::NotFound);
        let deletes = |kind: &str| fixture.events(kind).iter().filter(|e| e.action == "delete").count();
        assert_eq!((deletes("estimate"), deletes("estimate_factor")), (1, 1));
        assert_eq!(delete(&ctx, &id).unwrap_err().code, ErrorCode::NotFound);
    }

    #[test]
    fn the_money_on_hand_is_the_balance_of_the_chosen_wallets_only() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let id = create(&ctx, new_estimate("Đám cưới")).unwrap().estimate.id;
        transactions::record(&ctx, income("Lương", 5_000_000, "2026-10-07")).unwrap();
        let none = UpdateEstimate { id: id.clone(), name: None, icon: None, contingency_percent: None, wallet_ids: Some(vec![]) };
        assert_eq!(update(&ctx, none).unwrap().totals.available, Money(0));
        let cash = UpdateEstimate { id, name: None, icon: None, contingency_percent: None, wallet_ids: Some(vec![CASH.into()]) };
        assert_eq!(update(&ctx, cash).unwrap().totals.available, Money(5_000_000));
    }
}
