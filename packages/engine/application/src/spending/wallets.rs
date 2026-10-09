use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{Entity, NewWallet, UpdateWallet, Wallet};
use alavo_infrastructure::persistence::repositories::spending::rows::next_position;
use alavo_infrastructure::persistence::repositories::spending::transactions::count_in_wallet;
use alavo_infrastructure::persistence::repositories::spending::wallets::{
    find_wallet, insert_wallet, list_wallets, update_wallet,
};

use crate::context::Ctx;
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

pub fn delete(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    ctx.transaction(|| {
        require(ctx, id)?;
        if count_in_wallet(ctx.db, id)? > 0 {
            return Err(EngineError::validation("wallet still has transactions"));
        }
        delete_row(ctx, Entity::Wallet, id)
    })
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

    fn change(id: &str) -> UpdateWallet {
        UpdateWallet { id: id.into(), name: None, kind: None, opening_balance_vnd: None }
    }

    #[test]
    fn a_fresh_install_has_one_cash_wallet_with_a_zero_balance() {
        let fixture = Fixture::new();
        let wallets = list(&fixture.ctx()).unwrap();
        assert_eq!(wallets.len(), 1);
        assert_eq!((wallets[0].name.as_str(), wallets[0].kind), ("Tiền mặt", WalletKind::Cash));
        assert_eq!(wallets[0].balance_vnd, Money(0));
    }

    #[test]
    fn create_starts_the_balance_at_the_opening_balance_and_logs_an_insert() {
        let fixture = Fixture::new();
        let created =
            create(&fixture.ctx(), new_wallet("Techcombank", WalletKind::Bank, 5_000_000)).unwrap();
        assert_eq!(created.balance_vnd, Money(5_000_000));
        assert_eq!(created.position, 2);
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
        assert_eq!(delete(&ctx, CASH).unwrap_err().code, ErrorCode::Validation);
        assert_eq!(list(&ctx).unwrap().len(), 1);
    }

    #[test]
    fn deleting_an_empty_wallet_hides_it_and_logs_a_delete() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let bank = create(&ctx, new_wallet("Techcombank", WalletKind::Bank, 0)).unwrap();
        delete(&ctx, &bank.id).unwrap();
        assert_eq!(list(&ctx).unwrap().len(), 1);
        let events = fixture.events("wallet");
        assert_eq!(events.last().unwrap().action, "delete");
        assert_eq!(delete(&ctx, &bank.id).unwrap_err().code, ErrorCode::NotFound);
    }
}
