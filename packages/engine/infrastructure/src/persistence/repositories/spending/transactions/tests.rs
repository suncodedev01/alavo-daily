use alavo_domain::spending::CategoryKind;

use crate::testing::migrated_memory_db;

use super::*;

fn stamp() -> Stamp {
    Stamp { updated_at: 9, field_updated_at: "{}".to_string() }
}

fn sample(id: &str, date: &str, created_at: i64) -> Transaction {
    Transaction {
        id: id.into(),
        occurred_on: date.into(),
        title: "Phở Thìn".into(),
        category_id: "category-food".into(),
        wallet_id: "wallet-cash".into(),
        amount_vnd: Money(-70_000),
        note: "".into(),
        recurring_rule: None,
        recurring_source_id: None,
        created_at,
        updated_at: 9,
    }
}

fn insert(db: &dyn Database, transaction: &Transaction) {
    insert_transaction(db, transaction, &stamp()).unwrap();
}

fn ids(transactions: &[Transaction]) -> Vec<&str> {
    transactions.iter().map(|transaction| transaction.id.as_str()).collect()
}

#[test]
fn insert_then_find_round_trips_every_field() {
    let db = migrated_memory_db();
    let stored = Transaction {
        note: "ghi chú".into(),
        recurring_rule: Some("monthly:5".into()),
        recurring_source_id: Some("template".into()),
        ..sample("t1", "2026-10-06", 1)
    };
    insert(&db, &stored);
    assert_eq!(find_transaction(&db, "t1").unwrap(), Some(stored));
}

#[test]
fn list_is_newest_first_by_date_then_creation_time_then_insert_order() {
    let db = migrated_memory_db();
    insert(&db, &sample("old", "2026-10-01", 5));
    insert(&db, &sample("new-early", "2026-10-09", 1));
    insert(&db, &sample("new-late", "2026-10-09", 2));
    insert(&db, &sample("tie-a", "2026-10-05", 3));
    insert(&db, &sample("tie-b", "2026-10-05", 3));
    let listed = list_transactions(&db, &TransactionFilter::default()).unwrap();
    assert_eq!(ids(&listed), vec!["new-late", "new-early", "tie-b", "tie-a", "old"]);
}

#[test]
fn month_filter_respects_the_month_boundary() {
    let db = migrated_memory_db();
    insert(&db, &sample("last-of-sep", "2026-09-30", 1));
    insert(&db, &sample("first-of-oct", "2026-10-01", 2));
    insert(&db, &sample("last-of-oct", "2026-10-31", 3));
    insert(&db, &sample("first-of-nov", "2026-11-01", 4));
    let filter = TransactionFilter { month: Some("2026-10".into()), ..Default::default() };
    assert_eq!(ids(&list_transactions(&db, &filter).unwrap()), vec!["last-of-oct", "first-of-oct"]);
}

fn seed_for_filters(db: &dyn Database) {
    insert(db, &sample("a", "2026-10-01", 1));
    let income = Transaction {
        category_id: "category-income".into(),
        amount_vnd: Money(5),
        ..sample("b", "2026-10-02", 2)
    };
    insert(db, &income);
    let rule = Transaction {
        recurring_rule: Some("monthly:3".into()),
        wallet_id: "w2".into(),
        ..sample("c", "2026-10-03", 3)
    };
    insert(db, &rule);
}

fn ids_where(db: &dyn Database, filter: TransactionFilter) -> Vec<String> {
    ids_owned(&list_transactions(db, &filter).unwrap())
}

#[test]
fn category_and_wallet_filters_narrow_the_list() {
    let db = migrated_memory_db();
    seed_for_filters(&db);
    let by_category =
        TransactionFilter { category_id: Some("category-income".into()), ..Default::default() };
    assert_eq!(ids_where(&db, by_category), vec!["b"]);
    let by_wallet = TransactionFilter { wallet_id: Some("w2".into()), ..Default::default() };
    assert_eq!(ids_where(&db, by_wallet), vec!["c"]);
}

#[test]
fn kind_and_recurring_filters_narrow_the_list() {
    let db = migrated_memory_db();
    seed_for_filters(&db);
    let income = TransactionFilter { kind: Some(CategoryKind::Income), ..Default::default() };
    assert_eq!(ids_where(&db, income), vec!["b"]);
    let recurring = TransactionFilter { recurring_only: Some(true), ..Default::default() };
    assert_eq!(ids_where(&db, recurring), vec!["c"]);
    let not_only = TransactionFilter { recurring_only: Some(false), ..Default::default() };
    assert_eq!(ids_where(&db, not_only).len(), 3);
}

fn ids_owned(transactions: &[Transaction]) -> Vec<String> {
    transactions.iter().map(|transaction| transaction.id.clone()).collect()
}

#[test]
fn query_matches_title_and_note_ignoring_case_and_applies_the_limit_afterwards() {
    let db = migrated_memory_db();
    insert(&db, &sample("a", "2026-10-01", 1));
    let by_note =
        Transaction {
            title: "Khác".into(), note: "PHỞ bò".into(), ..sample("b", "2026-10-02", 2)
        };
    insert(&db, &by_note);
    insert(&db, &Transaction { title: "Cà phê".into(), ..sample("c", "2026-10-03", 3) });
    let filter = TransactionFilter { query: Some("phở".into()), ..Default::default() };
    assert_eq!(ids(&list_transactions(&db, &filter).unwrap()), vec!["b", "a"]);
    let limited = TransactionFilter { limit: Some(1), ..filter };
    assert_eq!(ids(&list_transactions(&db, &limited).unwrap()), vec!["b"]);
}

#[test]
fn limit_keeps_the_newest_rows() {
    let db = migrated_memory_db();
    insert(&db, &sample("a", "2026-10-01", 1));
    insert(&db, &sample("b", "2026-10-02", 2));
    insert(&db, &sample("c", "2026-10-03", 3));
    let filter = TransactionFilter { limit: Some(2), ..Default::default() };
    assert_eq!(ids(&list_transactions(&db, &filter).unwrap()), vec!["c", "b"]);
}

#[test]
fn deleted_rows_are_hidden_from_list_find_and_counts() {
    let db = migrated_memory_db();
    insert(&db, &sample("a", "2026-10-01", 1));
    db.execute("UPDATE spending_transactions SET deleted_at = 3", &[]).unwrap();
    assert!(list_transactions(&db, &TransactionFilter::default()).unwrap().is_empty());
    assert_eq!(find_transaction(&db, "a").unwrap(), None);
    assert_eq!(count_in_category(&db, "category-food").unwrap(), 0);
    assert_eq!(count_in_wallet(&db, "wallet-cash").unwrap(), 0);
}

#[test]
fn counts_are_per_category_and_per_wallet() {
    let db = migrated_memory_db();
    insert(&db, &sample("a", "2026-10-01", 1));
    insert(&db, &Transaction { wallet_id: "w2".into(), ..sample("b", "2026-10-02", 2) });
    assert_eq!(count_in_category(&db, "category-food").unwrap(), 2);
    assert_eq!(count_in_category(&db, "category-fun").unwrap(), 0);
    assert_eq!(count_in_wallet(&db, "w2").unwrap(), 1);
}

#[test]
fn update_rewrites_every_editable_column() {
    let db = migrated_memory_db();
    insert(&db, &sample("a", "2026-10-01", 1));
    let edited = Transaction {
        title: "Mới".into(),
        amount_vnd: Money(-1),
        note: "n".into(),
        occurred_on: "2026-10-02".into(),
        recurring_rule: Some("monthly:2".into()),
        ..sample("a", "2026-10-01", 1)
    };
    update_transaction(&db, &edited, &Stamp { updated_at: 20, field_updated_at: "{}".into() })
        .unwrap();
    let stored = find_transaction(&db, "a").unwrap().unwrap();
    assert_eq!(
        Transaction { updated_at: 9, ..stored.clone() },
        Transaction { updated_at: 9, ..edited }
    );
    assert_eq!(stored.updated_at, 20);
}

#[test]
fn the_recurring_filter_includes_generated_instances_as_well_as_templates() {
    let db = migrated_memory_db();
    insert(&db, &sample("plain", "2026-10-01", 1));
    let template =
        Transaction { recurring_rule: Some("monthly:3".into()), ..sample("t", "2026-09-03", 2) };
    insert(&db, &template);
    let instance = Transaction {
        recurring_source_id: Some("t".into()),
        ..sample("t@2026-10-03", "2026-10-03", 3)
    };
    insert(&db, &instance);
    let recurring = TransactionFilter { recurring_only: Some(true), ..Default::default() };
    assert_eq!(ids_where(&db, recurring), vec!["t@2026-10-03", "t"]);
}
