use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use alavo_domain::shared::money::Money;
use alavo_domain::spending::{Wallet, WalletKind};

use super::rows::{money_value, query_one, query_rows, Stamp};

const WALLET_WITH_BALANCE: &str = r#"
    SELECT w.id, w.name, w.kind, w.opening_balance_vnd, w.position,
           w.opening_balance_vnd + COALESCE(SUM(t.amount_vnd), 0) AS balance_vnd
    FROM spending_wallets w
    LEFT JOIN spending_transactions t ON t.wallet_id = w.id AND t.deleted_at IS NULL
    WHERE w.deleted_at IS NULL
"#;

pub fn list_wallets(db: &dyn Database) -> Result<Vec<Wallet>, EngineError> {
    let sql = format!("{WALLET_WITH_BALANCE} GROUP BY w.id ORDER BY w.position, w.rowid");
    query_rows(db, &sql, &[], wallet_from_row)
}

pub fn find_wallet(db: &dyn Database, id: &str) -> Result<Option<Wallet>, EngineError> {
    let sql = format!("{WALLET_WITH_BALANCE} AND w.id = ? GROUP BY w.id");
    query_one(db, &sql, &[Value::from(id)], wallet_from_row)
}

pub fn insert_wallet(db: &dyn Database, wallet: &Wallet, stamp: &Stamp) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO spending_wallets
            (id, name, kind, opening_balance_vnd, position,
             updated_at, deleted_at, field_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    "#;
    let params = [
        Value::from(wallet.id.as_str()),
        Value::from(wallet.name.as_str()),
        Value::from(wallet.kind.as_str()),
        money_value(wallet.opening_balance_vnd),
        Value::from(wallet.position),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

pub fn update_wallet(db: &dyn Database, wallet: &Wallet, stamp: &Stamp) -> Result<(), EngineError> {
    let sql = r#"
        UPDATE spending_wallets
        SET name = ?, kind = ?, opening_balance_vnd = ?, updated_at = ?, field_updated_at = ?
        WHERE id = ?
    "#;
    let params = [
        Value::from(wallet.name.as_str()),
        Value::from(wallet.kind.as_str()),
        money_value(wallet.opening_balance_vnd),
        Value::from(stamp.updated_at),
        Value::from(stamp.field_updated_at.as_str()),
        Value::from(wallet.id.as_str()),
    ];
    db.execute(sql, &params).map(|_| ())
}

fn wallet_from_row(row: &Row) -> Result<Wallet, EngineError> {
    Ok(Wallet {
        id: row.text("id")?,
        name: row.text("name")?,
        kind: WalletKind::parse(&row.text("kind")?)?,
        opening_balance_vnd: Money(row.int("opening_balance_vnd")?),
        balance_vnd: Money(row.int("balance_vnd")?),
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

    fn bank() -> Wallet {
        Wallet {
            id: "w-bank".into(),
            name: "Techcombank".into(),
            kind: WalletKind::Bank,
            opening_balance_vnd: Money(5_000_000),
            balance_vnd: Money(5_000_000),
            position: 2,
        }
    }

    #[test]
    fn the_seeded_cash_wallet_starts_at_zero() {
        let db = migrated_memory_db();
        let wallets = list_wallets(&db).unwrap();
        assert_eq!(wallets.len(), 1);
        assert_eq!(wallets[0].id, "wallet-cash");
        assert_eq!(wallets[0].balance_vnd, Money(0));
    }

    #[test]
    fn insert_then_find_round_trips_every_field() {
        let db = migrated_memory_db();
        insert_wallet(&db, &bank(), &stamp()).unwrap();
        assert_eq!(find_wallet(&db, "w-bank").unwrap(), Some(bank()));
    }

    #[test]
    fn balance_adds_only_live_transactions_of_that_wallet() {
        let db = migrated_memory_db();
        insert_wallet(&db, &bank(), &stamp()).unwrap();
        let sql = r#"
            INSERT INTO spending_transactions
                (id, occurred_on, title, category_id, wallet_id, amount_vnd, created_at,
                 updated_at, deleted_at)
            VALUES ('t1', '2026-10-01', 'a', 'category-food', 'w-bank', -100, 1, 1, NULL),
                   ('t2', '2026-10-02', 'b', 'category-income', 'w-bank', 700, 1, 1, NULL),
                   ('t3', '2026-10-03', 'c', 'category-food', 'w-bank', -9000, 1, 1, 5),
                   ('t4', '2026-10-03', 'd', 'category-food', 'wallet-cash', -50, 1, 1, NULL)
        "#;
        db.execute(sql, &[]).unwrap();
        assert_eq!(find_wallet(&db, "w-bank").unwrap().unwrap().balance_vnd, Money(5_000_600));
        assert_eq!(list_wallets(&db).unwrap()[0].balance_vnd, Money(-50));
    }

    #[test]
    fn update_changes_name_kind_and_opening_balance() {
        let db = migrated_memory_db();
        insert_wallet(&db, &bank(), &stamp()).unwrap();
        let changed = Wallet {
            name: "TCB".into(),
            kind: WalletKind::Ewallet,
            opening_balance_vnd: Money(1),
            ..bank()
        };
        update_wallet(&db, &changed, &stamp()).unwrap();
        let stored = find_wallet(&db, "w-bank").unwrap().unwrap();
        assert_eq!((stored.name.as_str(), stored.kind), ("TCB", WalletKind::Ewallet));
        assert_eq!(stored.balance_vnd, Money(1));
    }

    #[test]
    fn missing_wallet_is_none() {
        let db = migrated_memory_db();
        assert_eq!(find_wallet(&db, "nope").unwrap(), None);
    }
}
