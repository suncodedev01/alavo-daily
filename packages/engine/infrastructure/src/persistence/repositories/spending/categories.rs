use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{Category, CategoryKind};

use super::rows::{query_one, query_rows, Stamp};

pub fn list_categories(
    db: &dyn Database,
    kind: Option<CategoryKind>,
) -> Result<Vec<Category>, EngineError> {
    let sql = r#"
        SELECT id, name, icon, kind, budget_vnd, is_fixed, position
        FROM spending_categories
        WHERE deleted_at IS NULL
          AND (? IS NULL OR kind = ?)
        ORDER BY position, rowid
    "#;
    let kind = kind.map(CategoryKind::as_str);
    query_rows(db, sql, &[Value::from(kind), Value::from(kind)], category_from_row)
}

pub fn find_category(db: &dyn Database, id: &str) -> Result<Option<Category>, EngineError> {
    let sql = r#"
        SELECT id, name, icon, kind, budget_vnd, is_fixed, position
        FROM spending_categories
        WHERE id = ? AND deleted_at IS NULL
    "#;
    query_one(db, sql, &[Value::from(id)], category_from_row)
}

pub fn insert_category(
    db: &dyn Database,
    category: &Category,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_categories
            (id, name, icon, kind, budget_vnd, is_fixed, position,
             updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(category.id.as_str()),
        Value::from(category.name.as_str()),
        Value::from(category.icon.as_str()),
        Value::from(category.kind.as_str()),
        Value::from(category.budget_vnd.map(Money::vnd)),
        Value::from(category.is_fixed),
        Value::from(category.position),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_category(
    db: &dyn Database,
    category: &Category,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_categories
        SET name = ?, icon = ?, budget_vnd = ?, updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(category.name.as_str()),
        Value::from(category.icon.as_str()),
        Value::from(category.budget_vnd.map(Money::vnd)),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(category.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

fn category_from_row(row: &Row) -> Result<Category, EngineError> {
    Ok(Category {
        id: row.text("id")?,
        name: row.text("name")?,
        icon: row.text("icon")?,
        kind: CategoryKind::parse(&row.text("kind")?)?,
        budget_vnd: row.opt_int("budget_vnd")?.map(Money),
        is_fixed: row.bool("is_fixed")?,
        position: row.int("position")?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    fn stamp() -> Stamp {
        Stamp { updated_at: 9, field_updated_at: "{}".to_string() }
    }

    fn pets() -> Category {
        Category {
            id: "c-pets".into(),
            name: "Thú cưng".into(),
            icon: "paw-print".into(),
            kind: CategoryKind::Expense,
            budget_vnd: Some(Money(300_000)),
            is_fixed: false,
            position: 9,
        }
    }

    #[test]
    fn the_seeded_categories_list_in_position_order() {
        let db = migrated_memory_db();
        let all = list_categories(&db, None).unwrap();
        assert_eq!(all.len(), 8);
        assert_eq!(all[0].id, "category-food");
        assert_eq!(all[7].id, "category-income");
        assert!(all[6].is_fixed);
    }

    #[test]
    fn kind_filter_keeps_only_that_kind() {
        let db = migrated_memory_db();
        let income = list_categories(&db, Some(CategoryKind::Income)).unwrap();
        assert_eq!(income.len(), 1);
        let expense = list_categories(&db, Some(CategoryKind::Expense)).unwrap();
        assert_eq!(expense.len(), 7);
    }

    #[test]
    fn insert_then_find_round_trips_every_field() {
        let db = migrated_memory_db();
        insert_category(&db, &pets(), &stamp()).unwrap();
        assert_eq!(find_category(&db, "c-pets").unwrap(), Some(pets()));
    }

    #[test]
    fn update_changes_name_icon_and_budget_but_not_kind() {
        let db = migrated_memory_db();
        insert_category(&db, &pets(), &stamp()).unwrap();
        let changed =
            Category { name: "Pet".into(), budget_vnd: None, kind: CategoryKind::Income, ..pets() };
        update_category(&db, &changed, &stamp()).unwrap();
        let stored = find_category(&db, "c-pets").unwrap().unwrap();
        assert_eq!(stored.name, "Pet");
        assert_eq!(stored.budget_vnd, None);
        assert_eq!(stored.kind, CategoryKind::Expense);
    }

    #[test]
    fn missing_category_is_none() {
        let db = migrated_memory_db();
        assert_eq!(find_category(&db, "nope").unwrap(), None);
    }
}
