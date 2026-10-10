use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{Estimate, EstimateItem, ExpectedIncome, Factor, Priority};

use super::rows::{query_one, query_rows, Stamp};

const HEADER_COLUMNS: &str = "id, name, icon, contingency_percent, wallet_ids";

/// Ids of the estimates in the order the person sees them.
pub fn list_estimate_ids(db: &dyn Database) -> Result<Vec<String>, EngineError> {
    let sql = r#"
        SELECT id
        FROM spending_estimates
        WHERE deleted_at IS NULL
        ORDER BY position, rowid
    "#;
    query_rows(db, sql, &[], |row| row.text("id"))
}

/// One estimate with all of its factors, items and expected income.
pub fn load_estimate(db: &dyn Database, id: &str) -> Result<Option<Estimate>, EngineError> {
    let sql = format!(
        "SELECT {HEADER_COLUMNS} FROM spending_estimates WHERE id = ? AND deleted_at IS NULL"
    );
    let Some(header) = query_one(db, &sql, &[Value::from(id)], header_from_row)? else {
        return Ok(None);
    };
    Ok(Some(Estimate {
        factors: load_factors(db, id)?,
        items: load_items(db, id)?,
        income: load_income(db, id)?,
        ..header
    }))
}

pub fn insert_estimate(
    db: &dyn Database,
    estimate: &Estimate,
    position: i64,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_estimates
            (id, name, icon, contingency_percent, wallet_ids, position,
             updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(estimate.id.as_str()),
        Value::from(estimate.name.as_str()),
        Value::from(estimate.icon.as_str()),
        Value::from(estimate.contingency_percent),
        Value::from(json_list(&estimate.wallet_ids)?.as_str()),
        Value::from(position),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_estimate(db: &dyn Database, estimate: &Estimate, stamp: &Stamp) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_estimates
        SET name = ?, icon = ?, contingency_percent = ?, wallet_ids = ?,
            updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(estimate.name.as_str()),
        Value::from(estimate.icon.as_str()),
        Value::from(estimate.contingency_percent),
        Value::from(json_list(&estimate.wallet_ids)?.as_str()),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(estimate.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn insert_factor(
    db: &dyn Database,
    estimate_id: &str,
    factor: &Factor,
    position: i64,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_estimate_factors
            (id, estimate_id, label, value, position, updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(factor.id.as_str()),
        Value::from(estimate_id),
        Value::from(factor.label.as_str()),
        Value::from(factor.value),
        Value::from(position),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_factor(db: &dyn Database, factor: &Factor, stamp: &Stamp) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_estimate_factors
        SET label = ?, value = ?, updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(factor.label.as_str()),
        Value::from(factor.value),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(factor.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn insert_item(
    db: &dyn Database,
    estimate_id: &str,
    item: &EstimateItem,
    position: i64,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_estimate_items
            (id, estimate_id, group_name, name, price_vnd, quantity, priority, by_factors,
             paid_vnd, position, updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(item.id.as_str()),
        Value::from(estimate_id),
        Value::from(item.group.as_str()),
        Value::from(item.name.as_str()),
        Value::from(item.price.vnd()),
        Value::from(item.quantity),
        Value::from(priority_text(item.priority)),
        Value::from(json_list(&item.by)?.as_str()),
        Value::from(item.paid.vnd()),
        Value::from(position),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_item(db: &dyn Database, item: &EstimateItem, stamp: &Stamp) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_estimate_items
        SET group_name = ?, name = ?, price_vnd = ?, quantity = ?, priority = ?,
            by_factors = ?, paid_vnd = ?, updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(item.group.as_str()),
        Value::from(item.name.as_str()),
        Value::from(item.price.vnd()),
        Value::from(item.quantity),
        Value::from(priority_text(item.priority)),
        Value::from(json_list(&item.by)?.as_str()),
        Value::from(item.paid.vnd()),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(item.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn insert_income(
    db: &dyn Database,
    estimate_id: &str,
    line: &ExpectedIncome,
    position: i64,
    stamp: &Stamp,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_estimate_income
            (id, estimate_id, label, amount_vnd, position, updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(line.id.as_str()),
        Value::from(estimate_id),
        Value::from(line.label.as_str()),
        Value::from(line.amount.vnd()),
        Value::from(position),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_income(db: &dyn Database, line: &ExpectedIncome, stamp: &Stamp) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_estimate_income
        SET label = ?, amount_vnd = ?, updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(line.label.as_str()),
        Value::from(line.amount.vnd()),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(line.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

/// Ids of the live rows of a child table that belong to an estimate.
pub fn child_ids(db: &dyn Database, table: ChildTable, estimate_id: &str) -> Result<Vec<String>, EngineError> {
    let sql = format!(
        "SELECT id FROM {} WHERE estimate_id = ? AND deleted_at IS NULL ORDER BY position, rowid",
        table.name()
    );
    query_rows(db, &sql, &[Value::from(estimate_id)], |row| row.text("id"))
}

/// The estimate a live child row belongs to, or none when the row does not exist.
pub fn estimate_of(db: &dyn Database, table: ChildTable, id: &str) -> Result<Option<String>, EngineError> {
    let sql = format!("SELECT estimate_id FROM {} WHERE id = ? AND deleted_at IS NULL", table.name());
    query_one(db, &sql, &[Value::from(id)], |row| row.text("estimate_id"))
}

#[derive(Debug, Clone, Copy)]
pub enum ChildTable {
    Factors,
    Items,
    Income,
}

impl ChildTable {
    fn name(self) -> &'static str {
        match self {
            ChildTable::Factors => "spending_estimate_factors",
            ChildTable::Items => "spending_estimate_items",
            ChildTable::Income => "spending_estimate_income",
        }
    }
}

fn load_factors(db: &dyn Database, estimate_id: &str) -> Result<Vec<Factor>, EngineError> {
    let sql = r#"
        SELECT id, label, value
        FROM spending_estimate_factors
        WHERE estimate_id = ? AND deleted_at IS NULL
        ORDER BY position, rowid
    "#;
    query_rows(db, sql, &[Value::from(estimate_id)], |row| {
        Ok(Factor { id: row.text("id")?, label: row.text("label")?, value: row.int("value")? })
    })
}

fn load_items(db: &dyn Database, estimate_id: &str) -> Result<Vec<EstimateItem>, EngineError> {
    let sql = r#"
        SELECT id, group_name, name, price_vnd, quantity, priority, by_factors, paid_vnd
        FROM spending_estimate_items
        WHERE estimate_id = ? AND deleted_at IS NULL
        ORDER BY position, rowid
    "#;
    query_rows(db, sql, &[Value::from(estimate_id)], item_from_row)
}

fn load_income(db: &dyn Database, estimate_id: &str) -> Result<Vec<ExpectedIncome>, EngineError> {
    let sql = r#"
        SELECT id, label, amount_vnd
        FROM spending_estimate_income
        WHERE estimate_id = ? AND deleted_at IS NULL
        ORDER BY position, rowid
    "#;
    query_rows(db, sql, &[Value::from(estimate_id)], |row| {
        Ok(ExpectedIncome {
            id: row.text("id")?,
            label: row.text("label")?,
            amount: Money(row.int("amount_vnd")?),
        })
    })
}

fn header_from_row(row: &Row) -> Result<Estimate, EngineError> {
    Ok(Estimate {
        id: row.text("id")?,
        name: row.text("name")?,
        icon: row.text("icon")?,
        contingency_percent: row.int("contingency_percent")?,
        wallet_ids: parse_list(&row.text("wallet_ids")?),
        factors: Vec::new(),
        items: Vec::new(),
        income: Vec::new(),
    })
}

fn item_from_row(row: &Row) -> Result<EstimateItem, EngineError> {
    Ok(EstimateItem {
        id: row.text("id")?,
        group: row.text("group_name")?,
        name: row.text("name")?,
        price: Money(row.int("price_vnd")?),
        quantity: row.int("quantity")?,
        priority: parse_priority(&row.text("priority")?),
        by: parse_list(&row.text("by_factors")?),
        paid: Money(row.int("paid_vnd")?),
    })
}

fn priority_text(priority: Priority) -> &'static str {
    match priority {
        Priority::Must => "must",
        Priority::Should => "should",
        Priority::Nice => "nice",
    }
}

/// A row written by a newer version with a priority this one does not know counts as "must", so
/// the money is never under-counted.
fn parse_priority(text: &str) -> Priority {
    match text {
        "should" => Priority::Should,
        "nice" => Priority::Nice,
        _ => Priority::Must,
    }
}

fn json_list(list: &[String]) -> Result<String, EngineError> {
    Ok(serde_json::to_string(list)?)
}

fn parse_list(text: &str) -> Vec<String> {
    serde_json::from_str(text).unwrap_or_default()
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use crate::testing::migrated_memory_db;

    use super::*;

    fn stamp() -> Stamp {
        Stamp { updated_at: 9, field_updated_at: "{}".to_string() }
    }

    fn header() -> Estimate {
        Estimate {
            id: "e1".into(),
            name: "Đám cưới".into(),
            icon: "gift".into(),
            contingency_percent: 10,
            wallet_ids: vec!["wallet-cash".into()],
            factors: Vec::new(),
            items: Vec::new(),
            income: Vec::new(),
        }
    }

    fn item(id: &str, priority: Priority) -> EstimateItem {
        EstimateItem {
            id: id.into(),
            group: "Tiệc".into(),
            name: format!("Khoản {id}"),
            price: Money(450_000),
            quantity: 2,
            priority,
            by: vec!["f1".into()],
            paid: Money(1_000),
        }
    }

    #[test]
    fn an_estimate_round_trips_with_its_factors_items_and_income_in_order() {
        let db = migrated_memory_db();
        insert_estimate(&db, &header(), 1, &stamp()).unwrap();
        insert_factor(&db, "e1", &Factor { id: "f1".into(), label: "khách".into(), value: 200 }, 1, &stamp()).unwrap();
        insert_item(&db, "e1", &item("a", Priority::Should), 2, &stamp()).unwrap();
        insert_item(&db, "e1", &item("b", Priority::Nice), 1, &stamp()).unwrap();
        let line = ExpectedIncome { id: "i1".into(), label: "Tiền mừng".into(), amount: Money(70_000_000) };
        insert_income(&db, "e1", &line, 1, &stamp()).unwrap();
        let loaded = load_estimate(&db, "e1").unwrap().unwrap();
        assert_eq!(loaded.wallet_ids, vec!["wallet-cash"]);
        assert_eq!(loaded.factors[0].value, 200);
        let order: Vec<&str> = loaded.items.iter().map(|item| item.id.as_str()).collect();
        assert_eq!(order, ["b", "a"]);
        assert_eq!(loaded.items[1], item("a", Priority::Should));
        assert_eq!(loaded.income, vec![line]);
    }

    #[test]
    fn updates_change_the_stored_values_and_deleted_rows_disappear() {
        let db = migrated_memory_db();
        insert_estimate(&db, &header(), 1, &stamp()).unwrap();
        insert_item(&db, "e1", &item("a", Priority::Must), 1, &stamp()).unwrap();
        update_estimate(&db, &Estimate { name: "Tiệc".into(), contingency_percent: 15, ..header() }, &stamp()).unwrap();
        update_item(&db, &EstimateItem { paid: Money(5), ..item("a", Priority::Must) }, &stamp()).unwrap();
        let loaded = load_estimate(&db, "e1").unwrap().unwrap();
        assert_eq!((loaded.name.as_str(), loaded.contingency_percent, loaded.items[0].paid), ("Tiệc", 15, Money(5)));
        db.execute("UPDATE spending_estimate_items SET deleted_at = 3 WHERE id = 'a'", &[]).unwrap();
        assert!(load_estimate(&db, "e1").unwrap().unwrap().items.is_empty());
        assert_eq!(child_ids(&db, ChildTable::Items, "e1").unwrap(), Vec::<String>::new());
        db.execute("UPDATE spending_estimates SET deleted_at = 3 WHERE id = 'e1'", &[]).unwrap();
        assert!(load_estimate(&db, "e1").unwrap().is_none());
        assert!(list_estimate_ids(&db).unwrap().is_empty());
    }

    #[test]
    fn an_unknown_priority_counts_as_must_so_the_money_is_not_under_counted() {
        assert_eq!(parse_priority("urgent"), Priority::Must);
        assert_eq!(parse_priority("nice"), Priority::Nice);
    }
}
