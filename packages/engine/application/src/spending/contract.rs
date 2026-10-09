//! The only part of spending that other modules may call.

use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{NewTransaction, Transaction};

use crate::context::Ctx;
use crate::spending::transactions;

/// Records one transaction, exactly as the `spending.record_transaction` command does.
pub fn record_transaction(ctx: &Ctx, input: NewTransaction) -> Result<Transaction, EngineError> {
    transactions::record(ctx, input)
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::error::ErrorCode;
    use alavo_domain::shared::money::Money;

    use crate::spending::test_support::{expense, Fixture, TODAY};

    use super::*;

    #[test]
    fn the_contract_records_a_real_transaction_with_a_sync_event() {
        let fixture = Fixture::new();
        let saved = record_transaction(&fixture.ctx(), expense("Đi chợ", 412_000, TODAY)).unwrap();
        assert_eq!(saved.amount_vnd, Money(-412_000));
        assert_eq!(fixture.events("transaction").len(), 1);
        assert_eq!(fixture.count("SELECT COUNT(*) AS total FROM spending_transactions"), 1);
    }

    #[test]
    fn the_contract_applies_the_same_validation_as_the_command() {
        let fixture = Fixture::new();
        let error = record_transaction(&fixture.ctx(), expense("", 1_000, TODAY)).unwrap_err();
        assert_eq!(error.code, ErrorCode::Validation);
    }
}
