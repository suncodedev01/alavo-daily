use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{
    DeleteWallet, Entity, NewWallet, TransactionFilter, UpdateTransaction, UpdateWallet, Wallet,
};
use alavo_infrastructure::persistence::repositories::spending::rows::next_position;
use alavo_infrastructure::persistence::repositories::spending::transactions::{
    count_in_wallet, list_transactions,
};
use alavo_infrastructure::persistence::repositories::spending::wallets::{
    find_wallet, insert_wallet, list_wallets, update_wallet,
};

use crate::context::Ctx;
use crate::spending::transactions;
use crate::spending::writes::{delete_row, log_insert, log_update, stamp_insert, stamp_update};

pub fn list(ctx: &Ctx) -> Result<Vec<Wallet>, EngineError> {
    list_wallets(ctx.db)
}

pub fn create(ctx: &Ctx, input: NewWallet) -> Result<Wallet, EngineError> {
    ctx.transaction(|| {
        let position = next_position(ctx.db, Entity::Wallet)?;
        let wallet = Wallet::from_new(ctx.new_id(), position, input)?;
        insert_wallet(ctx.db, &wallet, &stamp_insert(ctx, Entity::Wallet))?;
        log_insert(ctx, Entity::Wallet, &wallet.id)?;
        Ok(wallet)
    })
}

pub fn update(ctx: &Ctx, input: UpdateWallet) -> Result<Wallet, EngineError> {
    ctx.transaction(|| {
        let current = require(ctx, &input.id)?;
        let columns = input.changed_columns();
        let wallet = current.apply(input)?;
        let stamp = stamp_update(ctx, Entity::Wallet, &wallet.id, &columns)?;
        update_wallet(ctx.db, &wallet, &stamp)?;
        log_update(ctx, Entity::Wallet, &wallet.id, &columns)?;
        Ok(wallet)
    })
}

pub fn delete(ctx: &Ctx, input: DeleteWallet) -> Result<(), EngineError> {
    ctx.transaction(|| {
        require(ctx, &input.id)?;
        if count_in_wallet(ctx.db, &input.id)? > 0 {
            settle_transactions(ctx, &input)?;
        }
        delete_row(ctx, Entity::Wallet, &input.id)
    })
}

fn settle_transactions(ctx: &Ctx, input: &DeleteWallet) -> Result<(), EngineError> {
    match (&input.move_transactions_to, input.delete_transactions) {
        (None, false) => Err(EngineError::validation("wallet still has transactions")),
        (Some(_), true) => {
            Err(EngineError::validation("move the transactions or delete them, not both"))
        }
        (None, true) => delete_transactions_of(ctx, &input.id),
        (Some(target), false) => move_transactions(ctx, &input.id, target),
    }
}

fn transaction_ids_of(ctx: &Ctx, wallet_id: &str) -> Result<Vec<String>, EngineError> {
    let filter = TransactionFilter { wallet_id: Some(wallet_id.into()), ..Default::default() };
    Ok(list_transactions(ctx.db, &filter)?.into_iter().map(|item| item.id).collect())
}

fn delete_transactions_of(ctx: &Ctx, wallet_id: &str) -> Result<(), EngineError> {
    for id in transaction_ids_of(ctx, wallet_id)? {
        transactions::delete(ctx, &id)?;
    }
    Ok(())
}

fn move_transactions(ctx: &Ctx, from: &str, to: &str) -> Result<(), EngineError> {
    if from == to {
        return Err(EngineError::validation("choose a different wallet to move the transactions to"));
    }
    require(ctx, to)?;
    for id in transaction_ids_of(ctx, from)? {
        transactions::update(ctx, move_to_wallet(&id, to))?;
    }
    Ok(())
}

fn move_to_wallet(transaction_id: &str, wallet_id: &str) -> UpdateTransaction {
    UpdateTransaction {
        id: transaction_id.into(),
        title: None,
        amount_vnd: None,
        category_id: None,
        wallet_id: Some(wallet_id.into()),
        occurred_on: None,
        note: None,
        recurring_rule: None,
    }
}

pub fn require(ctx: &Ctx, id: &str) -> Result<Wallet, EngineError> {
    find_wallet(ctx.db, id)?.ok_or_else(|| EngineError::not_found("wallet", id))
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::error::ErrorCode;
    use alavo_domain::shared::money::Money;
    use alavo_domain::spending::WalletKind;

    use crate::spending::test_support::{expense, income, Fixture, CASH};
    use crate::spending::transactions;

    use super::*;

    fn new_wallet(name: &str, kind: WalletKind, opening: i64) -> NewWallet {
        NewWallet { name: name.into(), kind, opening_balance_vnd: Money(opening) }
    }

    fn only(id: &str) -> DeleteWallet {
        DeleteWallet::only(id)
    }

    fn change(id: &str) -> UpdateWallet {
        UpdateWallet { id: id.into(), name: None, kind: None, opening_balance_vnd: None }
    }

    #[test]
    fn a_fresh_install_offers_cash_bank_and_ewallet_with_zero_balances() {
        let fixture = Fixture::new();
        let wallets = list(&fixture.ctx()).unwrap();
        let summary: Vec<(&str, WalletKind)> =
            wallets.iter().map(|wallet| (wallet.name.as_str(), wallet.kind)).collect();
        let expected = [
            ("Tiền mặt", WalletKind::Cash),
            ("Chuyển khoản", WalletKind::Bank),
            ("Ví điện tử", WalletKind::Ewallet),
        ];
        assert_eq!(summary, expected);
        assert!(wallets.iter().all(|wallet| wallet.balance_vnd == Money(0)));
    }

    #[test]
    fn create_starts_the_balance_at_the_opening_balance_and_logs_an_insert() {
        let fixture = Fixture::new();
        let created =
            create(&fixture.ctx(), new_wallet("Techcombank", WalletKind::Bank, 5_000_000)).unwrap();
        assert_eq!(created.balance_vnd, Money(5_000_000));
        assert_eq!(created.position, 4);
        let events = fixture.events("wallet");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].payload["opening_balance_vnd"], 5_000_000);
    }

    #[test]
    fn create_rejects_a_blank_name() {
        let fixture = Fixture::new();
        let error = create(&fixture.ctx(), new_wallet(" ", WalletKind::Bank, 0)).unwrap_err();
        assert_eq!(error.code, ErrorCode::Validation);
        assert!(fixture.events("wallet").is_empty());
    }

    #[test]
    fn balance_follows_recorded_updated_and_deleted_transactions() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        update(&ctx, UpdateWallet { opening_balance_vnd: Some(Money(1_000_000)), ..change(CASH) })
            .unwrap();
        let balance = || find_wallet(ctx.db, CASH).unwrap().unwrap().balance_vnd;
        let spent = transactions::record(&ctx, expense("Phở", 70_000, "2026-10-06")).unwrap();
        transactions::record(&ctx, income("Freelance", 500_000, "2026-10-07")).unwrap();
        assert_eq!(balance(), Money(1_430_000));
        let edit = alavo_domain::spending::UpdateTransaction {
            id: spent.id.clone(),
            title: None,
            amount_vnd: Some(Money(-100_000)),
            category_id: None,
            wallet_id: None,
            occurred_on: None,
            note: None,
            recurring_rule: None,
        };
        transactions::update(&ctx, edit).unwrap();
        assert_eq!(balance(), Money(1_400_000));
        transactions::delete(&ctx, &spent.id).unwrap();
        assert_eq!(balance(), Money(1_500_000));
    }

    #[test]
    fn changing_the_opening_balance_moves_the_returned_balance() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        transactions::record(&ctx, expense("Phở", 70_000, "2026-10-06")).unwrap();
        let moved = update(
            &ctx,
            UpdateWallet { opening_balance_vnd: Some(Money(200_000)), ..change(CASH) },
        )
        .unwrap();
        assert_eq!(moved.balance_vnd, Money(130_000));
        assert_eq!(find_wallet(ctx.db, CASH).unwrap().unwrap().balance_vnd, Money(130_000));
        let events = fixture.events("wallet");
        assert_eq!(events[0].changed_fields, r#"["opening_balance_vnd"]"#);
    }

    #[test]
    fn update_renames_and_changes_the_kind() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let edit = UpdateWallet {
            name: Some("Ví".into()),
            kind: Some(WalletKind::Ewallet),
            ..change(CASH)
        };
        let updated = update(&ctx, edit).unwrap();
        assert_eq!((updated.name.as_str(), updated.kind), ("Ví", WalletKind::Ewallet));
    }

    #[test]
    fn update_rejects_a_blank_name_and_unknown_ids() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let blank = UpdateWallet { name: Some("".into()), ..change(CASH) };
        assert_eq!(update(&ctx, blank).unwrap_err().code, ErrorCode::Validation);
        assert_eq!(update(&ctx, change("nope")).unwrap_err().code, ErrorCode::NotFound);
    }

    #[test]
    fn deleting_a_wallet_with_transactions_is_a_validation_error() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        transactions::record(&ctx, expense("Phở", 70_000, "2026-10-06")).unwrap();
        assert_eq!(delete(&ctx, only(CASH)).unwrap_err().code, ErrorCode::Validation);
        assert_eq!(list(&ctx).unwrap().len(), 3);
    }

    #[test]
    fn deleting_an_empty_wallet_hides_it_and_logs_a_delete() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let bank = create(&ctx, new_wallet("Techcombank", WalletKind::Bank, 0)).unwrap();
        delete(&ctx, only(&bank.id)).unwrap();
        assert_eq!(list(&ctx).unwrap().len(), 3);
        let events = fixture.events("wallet");
        assert_eq!(events.last().unwrap().action, "delete");
        assert_eq!(delete(&ctx, only(&bank.id)).unwrap_err().code, ErrorCode::NotFound);
    }

    fn spent_in_two_wallets(ctx: &Ctx) -> String {
        let savings = create(ctx, new_wallet("Tiết kiệm", WalletKind::Bank, 0)).unwrap();
        transactions::record(ctx, expense("Phở", 70_000, "2026-10-06")).unwrap();
        let mut saved = expense("Gửi tiết kiệm", 300_000, "2026-10-07");
        saved.wallet_id = savings.id.clone();
        transactions::record(ctx, saved).unwrap();
        savings.id
    }

    #[test]
    fn deleting_a_wallet_can_move_its_transactions_to_another_wallet() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let savings = spent_in_two_wallets(&ctx);
        let input = DeleteWallet { move_transactions_to: Some(CASH.into()), ..only(&savings) };
        delete(&ctx, input).unwrap();
        assert!(list(&ctx).unwrap().iter().all(|wallet| wallet.id != savings));
        assert_eq!(find_wallet(ctx.db, CASH).unwrap().unwrap().balance_vnd, Money(-370_000));
        let moved = fixture.events("transaction").iter().filter(|e| e.action == "update").count();
        assert_eq!(moved, 1);
    }

    #[test]
    fn deleting_a_wallet_can_delete_its_transactions_too() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let savings = spent_in_two_wallets(&ctx);
        let input = DeleteWallet { delete_transactions: true, ..only(&savings) };
        delete(&ctx, input).unwrap();
        assert_eq!(find_wallet(ctx.db, CASH).unwrap().unwrap().balance_vnd, Money(-70_000));
        let removed = fixture.events("transaction").iter().filter(|e| e.action == "delete").count();
        assert_eq!(removed, 1);
        assert_eq!(fixture.events("wallet").last().unwrap().action, "delete");
    }

    #[test]
    fn moving_transactions_needs_a_different_existing_wallet_and_never_both_options() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let savings = spent_in_two_wallets(&ctx);
        let same = DeleteWallet { move_transactions_to: Some(savings.clone()), ..only(&savings) };
        assert_eq!(delete(&ctx, same).unwrap_err().code, ErrorCode::Validation);
        let missing = DeleteWallet { move_transactions_to: Some("nope".into()), ..only(&savings) };
        assert_eq!(delete(&ctx, missing).unwrap_err().code, ErrorCode::NotFound);
        let both = DeleteWallet {
            move_transactions_to: Some(CASH.into()),
            delete_transactions: true,
            ..only(&savings)
        };
        assert_eq!(delete(&ctx, both).unwrap_err().code, ErrorCode::Validation);
        assert_eq!(list(&ctx).unwrap().len(), 4);
    }
}
