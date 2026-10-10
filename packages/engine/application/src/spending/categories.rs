use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{
    Category, CategoryKind, DeleteCategory, Entity, NewCategory, TransactionFilter,
    UpdateCategory, UpdateTransaction,
};
use alavo_infrastructure::persistence::repositories::spending::categories::{
    find_category, insert_category, list_categories, update_category,
};
use alavo_infrastructure::persistence::repositories::spending::rows::next_position;
use alavo_infrastructure::persistence::repositories::spending::transactions::{
    count_in_category, list_transactions,
};

use crate::context::Ctx;
use crate::spending::transactions;
use crate::spending::writes::{delete_row, log_insert, log_update, stamp_insert, stamp_update};

pub fn list(ctx: &Ctx, kind: Option<CategoryKind>) -> Result<Vec<Category>, EngineError> {
    list_categories(ctx.db, kind)
}

pub fn create(ctx: &Ctx, input: NewCategory) -> Result<Category, EngineError> {
    ctx.transaction(|| {
        let position = next_position(ctx.db, Entity::Category)?;
        let category = Category::from_new(ctx.new_id(), position, input)?;
        insert_category(ctx.db, &category, &stamp_insert(ctx, Entity::Category))?;
        log_insert(ctx, Entity::Category, &category.id)?;
        Ok(category)
    })
}

pub fn update(ctx: &Ctx, input: UpdateCategory) -> Result<Category, EngineError> {
    ctx.transaction(|| {
        let current = require(ctx, &input.id)?;
        let columns = input.changed_columns();
        let category = current.apply(input)?;
        let stamp = stamp_update(ctx, Entity::Category, &category.id, &columns)?;
        update_category(ctx.db, &category, &stamp)?;
        log_update(ctx, Entity::Category, &category.id, &columns)?;
        Ok(category)
    })
}

pub fn delete(ctx: &Ctx, input: DeleteCategory) -> Result<(), EngineError> {
    ctx.transaction(|| {
        require(ctx, &input.id)?;
        if count_in_category(ctx.db, &input.id)? > 0 {
            settle_transactions(ctx, &input)?;
        }
        delete_row(ctx, Entity::Category, &input.id)
    })
}

fn settle_transactions(ctx: &Ctx, input: &DeleteCategory) -> Result<(), EngineError> {
    match (&input.move_transactions_to, input.delete_transactions) {
        (None, false) => Err(EngineError::validation("category still has transactions")),
        (Some(_), true) => {
            Err(EngineError::validation("move the transactions or delete them, not both"))
        }
        (None, true) => delete_transactions_of(ctx, &input.id),
        (Some(target), false) => move_transactions(ctx, &input.id, target),
    }
}

fn transaction_ids_of(ctx: &Ctx, category_id: &str) -> Result<Vec<String>, EngineError> {
    let filter = TransactionFilter { category_id: Some(category_id.into()), ..Default::default() };
    Ok(list_transactions(ctx.db, &filter)?.into_iter().map(|item| item.id).collect())
}

fn delete_transactions_of(ctx: &Ctx, category_id: &str) -> Result<(), EngineError> {
    for id in transaction_ids_of(ctx, category_id)? {
        transactions::delete(ctx, &id)?;
    }
    Ok(())
}

fn move_transactions(ctx: &Ctx, from: &str, to: &str) -> Result<(), EngineError> {
    if from == to {
        return Err(EngineError::validation("choose a different category to move the transactions to"));
    }
    let source = require(ctx, from)?;
    let target = require(ctx, to)?;
    if source.kind != target.kind {
        return Err(EngineError::validation("move the transactions to a category of the same kind"));
    }
    for id in transaction_ids_of(ctx, from)? {
        transactions::update(ctx, move_to_category(&id, to))?;
    }
    Ok(())
}

fn move_to_category(transaction_id: &str, category_id: &str) -> UpdateTransaction {
    UpdateTransaction {
        id: transaction_id.into(),
        title: None,
        amount_vnd: None,
        category_id: Some(category_id.into()),
        wallet_id: None,
        occurred_on: None,
        note: None,
        recurring_rule: None,
        payment_method_id: None,
    }
}

/// Puts the given categories in the given order. They keep using the same set of positions, so
/// reordering the expense list never moves a category of the other kind.
pub fn reorder(ctx: &Ctx, ids: &[String]) -> Result<Vec<Category>, EngineError> {
    ctx.transaction(|| {
        let current = ids.iter().map(|id| require(ctx, id)).collect::<Result<Vec<_>, _>>()?;
        check_reorderable(&current)?;
        let mut slots: Vec<i64> = current.iter().map(|category| category.position).collect();
        slots.sort_unstable();
        for (category, slot) in current.iter().zip(slots) {
            if category.position != slot {
                update(ctx, move_to_position(&category.id, slot))?;
            }
        }
        list(ctx, current.first().map(|category| category.kind))
    })
}

fn check_reorderable(current: &[Category]) -> Result<(), EngineError> {
    let distinct: std::collections::HashSet<&str> =
        current.iter().map(|category| category.id.as_str()).collect();
    if distinct.len() != current.len() {
        return Err(EngineError::validation("a category can only appear once in the new order"));
    }
    if current.windows(2).any(|pair| pair[0].kind != pair[1].kind) {
        return Err(EngineError::validation("reorder the categories of one kind at a time"));
    }
    Ok(())
}

fn move_to_position(id: &str, position: i64) -> UpdateCategory {
    UpdateCategory {
        id: id.into(),
        name: None,
        icon: None,
        budget_vnd: None,
        position: Some(position),
    }
}

pub fn require(ctx: &Ctx, id: &str) -> Result<Category, EngineError> {
    find_category(ctx.db, id)?.ok_or_else(|| EngineError::not_found("category", id))
}

#[cfg(test)]
mod tests {
    use alavo_domain::shared::error::ErrorCode;
    use alavo_domain::shared::money::Money;

    use crate::spending::test_support::{expense, Fixture, FOOD};
    use crate::spending::transactions;

    use super::*;

    fn only(id: &str) -> DeleteCategory {
        DeleteCategory::only(id)
    }

    fn new_category(name: &str, kind: CategoryKind, budget: Option<i64>) -> NewCategory {
        NewCategory {
            name: name.into(),
            icon: "paw-print".into(),
            kind,
            budget_vnd: budget.map(Money),
        }
    }

    fn rename(id: &str, name: &str) -> UpdateCategory {
        UpdateCategory { position: None, id: id.into(), name: Some(name.into()), icon: None, budget_vnd: None }
    }

    #[test]
    fn the_eight_default_categories_are_listed_in_order() {
        let fixture = Fixture::new();
        let all = list(&fixture.ctx(), None).unwrap();
        let names: Vec<&str> = all.iter().map(|category| category.name.as_str()).collect();
        assert_eq!(
            names,
            [
                "Ăn uống",
                "Đi lại",
                "Mua sắm",
                "Giải trí",
                "Sức khoẻ",
                "Hoá đơn",
                "Nhà ở",
                "Thu nhập"
            ]
        );
        assert!(all.iter().all(|category| category.budget_vnd.is_none()));
    }

    #[test]
    fn list_can_be_limited_to_one_kind() {
        let fixture = Fixture::new();
        let income = list(&fixture.ctx(), Some(CategoryKind::Income)).unwrap();
        assert_eq!(income.len(), 1);
        assert_eq!(income[0].id, "category-income");
    }

    #[test]
    fn create_puts_the_new_category_last_and_logs_an_insert_event() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let created =
            create(&ctx, new_category("Thú cưng", CategoryKind::Expense, Some(300_000))).unwrap();
        assert_eq!(created.position, 9);
        assert_eq!(created.budget_vnd, Some(Money(300_000)));
        assert!(!created.is_fixed);
        let events = fixture.events("category");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].action, "insert");
        assert_eq!(events[0].payload["id"], created.id.as_str());
        assert_eq!(events[0].payload["name"], "Thú cưng");
        assert!(events[0].payload["field_updated_at"].as_str().unwrap().contains("budget_vnd"));
    }

    #[test]
    fn create_rejects_blank_names_and_non_positive_budgets() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        for input in [
            new_category("  ", CategoryKind::Expense, None),
            new_category("x", CategoryKind::Expense, Some(0)),
            new_category("x", CategoryKind::Expense, Some(-5)),
        ] {
            let error = create(&ctx, input).unwrap_err();
            assert_eq!(error.code, ErrorCode::Validation);
        }
        assert!(fixture.events("category").is_empty());
        assert_eq!(list(&ctx, None).unwrap().len(), 8);
    }

    #[test]
    fn income_categories_are_created_without_a_budget() {
        let fixture = Fixture::new();
        let created =
            create(&fixture.ctx(), new_category("Thưởng", CategoryKind::Income, Some(5))).unwrap();
        assert_eq!(created.budget_vnd, None);
    }

    #[test]
    fn update_sets_and_clears_a_budget_and_stamps_only_the_changed_column() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let budget = UpdateCategory {
            position: None,
            id: FOOD.into(),
            name: None,
            icon: None,
            budget_vnd: Some(Some(Money(2_600_000))),
        };
        assert_eq!(update(&ctx, budget).unwrap().budget_vnd, Some(Money(2_600_000)));
        let clear =
            UpdateCategory { position: None, id: FOOD.into(), name: None, icon: None, budget_vnd: Some(None) };
        assert_eq!(update(&ctx, clear).unwrap().budget_vnd, None);
        let events = fixture.events("category");
        assert_eq!(events[0].action, "update");
        assert_eq!(events[0].changed_fields, r#"["budget_vnd"]"#);
    }

    #[test]
    fn update_keeps_per_column_clocks_so_two_edits_both_stay_stamped() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        update(&ctx, rename(FOOD, "Đồ ăn")).unwrap();
        let budget = UpdateCategory {
            position: None,
            id: FOOD.into(),
            name: None,
            icon: None,
            budget_vnd: Some(Some(Money(9))),
        };
        update(&ctx, budget).unwrap();
        let events = fixture.events("category");
        let stamps: serde_json::Value =
            serde_json::from_str(events[1].payload["field_updated_at"].as_str().unwrap()).unwrap();
        assert!(stamps["name"].as_i64().unwrap() < stamps["budget_vnd"].as_i64().unwrap());
    }

    #[test]
    fn update_of_an_unknown_category_is_not_found() {
        let fixture = Fixture::new();
        let error = update(&fixture.ctx(), rename("nope", "x")).unwrap_err();
        assert_eq!(error.code, ErrorCode::NotFound);
    }

    #[test]
    fn update_rejects_a_blank_name_without_writing() {
        let fixture = Fixture::new();
        let error = update(&fixture.ctx(), rename(FOOD, " ")).unwrap_err();
        assert_eq!(error.code, ErrorCode::Validation);
        assert!(fixture.events("category").is_empty());
    }

    #[test]
    fn deleting_an_unused_category_hides_it_and_keeps_a_tombstone() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        delete(&ctx, only("category-fun")).unwrap();
        assert_eq!(list(&ctx, None).unwrap().len(), 7);
        let kept = fixture.count(
            "SELECT COUNT(*) AS total FROM spending_categories WHERE deleted_at IS NOT NULL",
        );
        assert_eq!(kept, 1);
        let events = fixture.events("category");
        assert_eq!(
            (events[0].action.as_str(), events[0].changed_fields.as_str()),
            ("delete", r#"["deleted_at"]"#)
        );
        assert!(events[0].payload["deleted_at"].is_i64());
    }

    #[test]
    fn deleting_a_category_that_still_has_transactions_is_a_validation_error() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        transactions::record(&ctx, expense("Phở", 70_000, "2026-10-06")).unwrap();
        let error = delete(&ctx, only(FOOD)).unwrap_err();
        assert_eq!(error.code, ErrorCode::Validation);
        assert_eq!(list(&ctx, None).unwrap().len(), 8);
    }

    #[test]
    fn a_category_can_be_deleted_once_its_transactions_are_deleted() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let recorded = transactions::record(&ctx, expense("Phở", 70_000, "2026-10-06")).unwrap();
        transactions::delete(&ctx, &recorded.id).unwrap();
        assert!(delete(&ctx, only(FOOD)).is_ok());
    }

    #[test]
    fn deleting_twice_or_deleting_an_unknown_category_is_not_found() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        delete(&ctx, only("category-fun")).unwrap();
        assert_eq!(delete(&ctx, only("category-fun")).unwrap_err().code, ErrorCode::NotFound);
        assert_eq!(delete(&ctx, only("nope")).unwrap_err().code, ErrorCode::NotFound);
    }

    fn pay(ctx: &Ctx, category_id: &str, title: &str) -> String {
        let mut input = expense(title, 50_000, "2026-10-06");
        input.category_id = category_id.into();
        transactions::record(ctx, input).unwrap().id
    }

    #[test]
    fn deleting_a_category_can_move_its_transactions_to_another_one() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let other = create(&ctx, new_category("Cà phê", CategoryKind::Expense, None)).unwrap();
        let id = pay(&ctx, FOOD, "Phở");
        let input = DeleteCategory { move_transactions_to: Some(other.id.clone()), ..only(FOOD) };
        delete(&ctx, input).unwrap();
        let moved = transactions::get(&ctx, &id).unwrap();
        assert_eq!(moved.category_id, other.id);
        assert!(list(&ctx, None).unwrap().iter().all(|category| category.id != FOOD));
    }

    #[test]
    fn deleting_a_category_can_delete_its_transactions_too() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let id = pay(&ctx, FOOD, "Phở");
        delete(&ctx, DeleteCategory { delete_transactions: true, ..only(FOOD) }).unwrap();
        assert_eq!(transactions::get(&ctx, &id).unwrap_err().code, ErrorCode::NotFound);
    }

    #[test]
    fn moving_needs_a_different_category_of_the_same_kind_and_never_both_options() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let income = create(&ctx, new_category("Thưởng", CategoryKind::Income, None)).unwrap();
        pay(&ctx, FOOD, "Phở");
        let same = DeleteCategory { move_transactions_to: Some(FOOD.into()), ..only(FOOD) };
        assert_eq!(delete(&ctx, same).unwrap_err().code, ErrorCode::Validation);
        let wrong_kind = DeleteCategory { move_transactions_to: Some(income.id), ..only(FOOD) };
        assert_eq!(delete(&ctx, wrong_kind).unwrap_err().code, ErrorCode::Validation);
        let both = DeleteCategory {
            move_transactions_to: Some("category-fun".into()),
            delete_transactions: true,
            ..only(FOOD)
        };
        assert_eq!(delete(&ctx, both).unwrap_err().code, ErrorCode::Validation);
    }

    #[test]
    fn reorder_puts_categories_in_the_given_order_using_the_same_positions() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let first = create(&ctx, new_category("A", CategoryKind::Expense, None)).unwrap();
        let second = create(&ctx, new_category("B", CategoryKind::Expense, None)).unwrap();
        let before: Vec<i64> = [&first, &second].iter().map(|c| c.position).collect();
        let order = vec![second.id.clone(), first.id.clone()];
        let listed = reorder(&ctx, &order).unwrap();
        let names: Vec<&str> = listed.iter().map(|c| c.name.as_str()).collect();
        let at = |name: &str| names.iter().position(|n| *n == name).unwrap();
        assert!(at("B") < at("A"));
        let after: Vec<i64> = ["B", "A"]
            .iter()
            .map(|name| listed.iter().find(|c| c.name == *name).unwrap().position)
            .collect();
        assert_eq!(after, before);
        assert_eq!(fixture.events("category").iter().filter(|e| e.action == "update").count(), 2);
    }

    #[test]
    fn reorder_rejects_repeated_ids_mixed_kinds_and_unknown_ids() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let income = create(&ctx, new_category("Thưởng", CategoryKind::Income, None)).unwrap();
        let twice = vec![FOOD.to_string(), FOOD.to_string()];
        assert_eq!(reorder(&ctx, &twice).unwrap_err().code, ErrorCode::Validation);
        let mixed = vec![FOOD.to_string(), income.id];
        assert_eq!(reorder(&ctx, &mixed).unwrap_err().code, ErrorCode::Validation);
        let unknown = vec!["nope".to_string()];
        assert_eq!(reorder(&ctx, &unknown).unwrap_err().code, ErrorCode::NotFound);
    }
}
