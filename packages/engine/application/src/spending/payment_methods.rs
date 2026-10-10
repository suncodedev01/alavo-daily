use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{
    Entity, NewPaymentMethod, PaymentMethod, UpdatePaymentMethod, UpdateTransaction,
};
use alavo_infrastructure::persistence::repositories::spending::payment_methods::{
    find_payment_method, insert_payment_method, list_payment_methods,
    transaction_ids_with_payment_method, update_payment_method,
};
use alavo_infrastructure::persistence::repositories::spending::rows::next_position;

use crate::context::Ctx;
use crate::spending::transactions;
use crate::spending::writes::{delete_row, log_insert, log_update, stamp_insert, stamp_update};

pub fn list(ctx: &Ctx) -> Result<Vec<PaymentMethod>, EngineError> {
    list_payment_methods(ctx.db)
}

pub fn create(ctx: &Ctx, input: NewPaymentMethod) -> Result<PaymentMethod, EngineError> {
    ctx.transaction(|| {
        let position = next_position(ctx.db, Entity::PaymentMethod)?;
        let method = PaymentMethod::from_new(ctx.new_id(), position, input)?;
        insert_payment_method(ctx.db, &method, &stamp_insert(ctx, Entity::PaymentMethod))?;
        log_insert(ctx, Entity::PaymentMethod, &method.id)?;
        Ok(method)
    })
}

pub fn update(ctx: &Ctx, input: UpdatePaymentMethod) -> Result<PaymentMethod, EngineError> {
    ctx.transaction(|| {
        let current = require(ctx, &input.id)?;
        let columns = input.changed_columns();
        let method = current.apply(input)?;
        let stamp = stamp_update(ctx, Entity::PaymentMethod, &method.id, &columns)?;
        update_payment_method(ctx.db, &method, &stamp)?;
        log_update(ctx, Entity::PaymentMethod, &method.id, &columns)?;
        Ok(method)
    })
}

/// Transactions that used the method are kept and simply lose it. The default cannot be deleted.
pub fn delete(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    ctx.transaction(|| {
        let method = require(ctx, id)?;
        if !method.can_be_deleted() {
            return Err(EngineError::validation("the default payment method cannot be deleted"));
        }
        for transaction_id in transaction_ids_with_payment_method(ctx.db, id)? {
            transactions::update(ctx, without_payment_method(&transaction_id))?;
        }
        delete_row(ctx, Entity::PaymentMethod, id)
    })
}

pub fn require(ctx: &Ctx, id: &str) -> Result<PaymentMethod, EngineError> {
    find_payment_method(ctx.db, id)?.ok_or_else(|| EngineError::not_found("payment method", id))
}

fn without_payment_method(transaction_id: &str) -> UpdateTransaction {
    UpdateTransaction {
        id: transaction_id.into(),
        title: None,
        amount_vnd: None,
        category_id: None,
        wallet_id: None,
        occurred_on: None,
        note: None,
        recurring_rule: None,
        payment_method_id: Some(None),
    }
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::error::ErrorCode;
    use alavo_domain::spending::DEFAULT_PAYMENT_METHOD_ID;
    use alavo_infrastructure::persistence::repositories::spending::transactions::find_transaction;

    use crate::spending::test_support::{expense, Fixture};

    use super::*;

    fn new_method(name: &str, icon: &str) -> NewPaymentMethod {
        NewPaymentMethod { name: name.into(), icon: icon.into() }
    }

    fn pay_with(ctx: &Ctx, method_id: &str) -> String {
        let mut input = expense("Phở", 70_000, "2026-10-06");
        input.payment_method_id = Some(method_id.into());
        transactions::record(ctx, input).unwrap().id
    }

    #[test]
    fn a_fresh_install_offers_cash_bank_transfer_and_ewallet() {
        let fixture = Fixture::new();
        let names: Vec<String> =
            list(&fixture.ctx()).unwrap().into_iter().map(|method| method.name).collect();
        assert_eq!(names, ["Tiền mặt", "Chuyển khoản", "Ví điện tử"]);
    }

    #[test]
    fn create_appends_a_method_and_logs_an_insert() {
        let fixture = Fixture::new();
        let created = create(&fixture.ctx(), new_method("Thẻ Visa", "credit-card")).unwrap();
        assert_eq!((created.position, created.is_default), (4, false));
        assert_eq!(fixture.events("payment_method").len(), 1);
    }

    #[test]
    fn create_rejects_a_blank_name_and_an_unknown_icon() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        assert_eq!(create(&ctx, new_method(" ", "money")).unwrap_err().code, ErrorCode::Validation);
        assert_eq!(create(&ctx, new_method("Thẻ", "rocket")).unwrap_err().code, ErrorCode::Validation);
        assert!(fixture.events("payment_method").is_empty());
    }

    #[test]
    fn update_renames_the_method_and_logs_only_the_changed_column() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let change = UpdatePaymentMethod {
            id: DEFAULT_PAYMENT_METHOD_ID.into(),
            name: Some("Tiền giấy".into()),
            icon: None,
        };
        assert_eq!(update(&ctx, change).unwrap().name, "Tiền giấy");
        assert_eq!(fixture.events("payment_method")[0].changed_fields, r#"["name"]"#);
    }

    #[test]
    fn the_default_method_cannot_be_deleted() {
        let fixture = Fixture::new();
        let error = delete(&fixture.ctx(), DEFAULT_PAYMENT_METHOD_ID).unwrap_err();
        assert_eq!(error.code, ErrorCode::Validation);
        assert_eq!(list(&fixture.ctx()).unwrap().len(), 3);
    }

    #[test]
    fn deleting_a_method_keeps_its_transactions_and_empties_their_method() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let visa = create(&ctx, new_method("Thẻ Visa", "credit-card")).unwrap();
        let transaction_id = pay_with(&ctx, &visa.id);
        assert_eq!(list(&ctx).unwrap().last().unwrap().transaction_count, 1);
        delete(&ctx, &visa.id).unwrap();
        let kept = find_transaction(ctx.db, &transaction_id).unwrap().unwrap();
        assert_eq!(kept.payment_method_id, None);
        assert_eq!(list(&ctx).unwrap().len(), 3);
        assert_eq!(fixture.events("payment_method").last().unwrap().action, "delete");
    }

    #[test]
    fn deleting_an_unknown_method_is_not_found() {
        let fixture = Fixture::new();
        assert_eq!(delete(&fixture.ctx(), "nope").unwrap_err().code, ErrorCode::NotFound);
    }
}
