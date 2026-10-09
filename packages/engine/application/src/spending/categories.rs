use alavo_domain::shared::error::EngineError;
use alavo_domain::spending::{Category, CategoryKind, Entity, NewCategory, UpdateCategory};
use alavo_infrastructure::persistence::repositories::spending::categories::{
    find_category, insert_category, list_categories, update_category,
};
use alavo_infrastructure::persistence::repositories::spending::rows::next_position;
use alavo_infrastructure::persistence::repositories::spending::transactions::count_in_category;

use crate::context::Ctx;
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

pub fn delete(ctx: &Ctx, id: &str) -> Result<(), EngineError> {
    ctx.transaction(|| {
        require(ctx, id)?;
        if count_in_category(ctx.db, id)? > 0 {
            return Err(EngineError::validation("category still has transactions"));
        }
        delete_row(ctx, Entity::Category, id)
    })
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

    fn new_category(name: &str, kind: CategoryKind, budget: Option<i64>) -> NewCategory {
        NewCategory {
            name: name.into(),
            icon: "paw-print".into(),
            kind,
            budget_vnd: budget.map(Money),
        }
    }

    fn rename(id: &str, name: &str) -> UpdateCategory {
        UpdateCategory { id: id.into(), name: Some(name.into()), icon: None, budget_vnd: None }
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
            id: FOOD.into(),
            name: None,
            icon: None,
            budget_vnd: Some(Some(Money(2_600_000))),
        };
        assert_eq!(update(&ctx, budget).unwrap().budget_vnd, Some(Money(2_600_000)));
        let clear =
            UpdateCategory { id: FOOD.into(), name: None, icon: None, budget_vnd: Some(None) };
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
        delete(&ctx, "category-fun").unwrap();
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
        let error = delete(&ctx, FOOD).unwrap_err();
        assert_eq!(error.code, ErrorCode::Validation);
        assert_eq!(list(&ctx, None).unwrap().len(), 8);
    }

    #[test]
    fn a_category_can_be_deleted_once_its_transactions_are_deleted() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        let recorded = transactions::record(&ctx, expense("Phở", 70_000, "2026-10-06")).unwrap();
        transactions::delete(&ctx, &recorded.id).unwrap();
        assert!(delete(&ctx, FOOD).is_ok());
    }

    #[test]
    fn deleting_twice_or_deleting_an_unknown_category_is_not_found() {
        let fixture = Fixture::new();
        let ctx = fixture.ctx();
        delete(&ctx, "category-fun").unwrap();
        assert_eq!(delete(&ctx, "category-fun").unwrap_err().code, ErrorCode::NotFound);
        assert_eq!(delete(&ctx, "nope").unwrap_err().code, ErrorCode::NotFound);
    }
}
