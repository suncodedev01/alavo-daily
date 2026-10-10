use serde::{Deserialize, Serialize};

use crate::shared::error::EngineError;
use crate::shared::money::Money;
use crate::spending::validation::{required_text, updated_text};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WalletKind {
    Bank,
    Ewallet,
    Cash,
}

impl WalletKind {
    pub fn as_str(self) -> &'static str {
        match self {
            WalletKind::Bank => "bank",
            WalletKind::Ewallet => "ewallet",
            WalletKind::Cash => "cash",
        }
    }

    pub fn parse(text: &str) -> Result<WalletKind, EngineError> {
        match text {
            "bank" => Ok(WalletKind::Bank),
            "ewallet" => Ok(WalletKind::Ewallet),
            "cash" => Ok(WalletKind::Cash),
            other => Err(EngineError::db(format!("unknown wallet kind {other}"))),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Wallet {
    pub id: String,
    pub name: String,
    pub kind: WalletKind,
    pub opening_balance_vnd: Money,
    pub balance_vnd: Money,
    pub position: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewWallet {
    pub name: String,
    pub kind: WalletKind,
    pub opening_balance_vnd: Money,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWallet {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub kind: Option<WalletKind>,
    #[serde(default)]
    pub opening_balance_vnd: Option<Money>,
}

/// What to do with the transactions of a wallet that is being deleted.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteWallet {
    pub id: String,
    #[serde(default)]
    pub move_transactions_to: Option<String>,
    #[serde(default)]
    pub delete_transactions: bool,
}

impl DeleteWallet {
    /// Deletes the wallet and fails when it still has transactions.
    pub fn only(id: &str) -> Self {
        Self { id: id.into(), move_transactions_to: None, delete_transactions: false }
    }
}

impl Wallet {
    pub fn from_new(id: String, position: i64, input: NewWallet) -> Result<Wallet, EngineError> {
        Ok(Wallet {
            id,
            name: required_text("name", &input.name)?,
            kind: input.kind,
            opening_balance_vnd: input.opening_balance_vnd,
            balance_vnd: input.opening_balance_vnd,
            position,
        })
    }

    pub fn apply(self, update: UpdateWallet) -> Result<Wallet, EngineError> {
        let opening = update.opening_balance_vnd.unwrap_or(self.opening_balance_vnd);
        let balance = self.balance_vnd + (opening - self.opening_balance_vnd);
        Ok(Wallet {
            name: updated_text("name", update.name.as_deref(), self.name)?,
            kind: update.kind.unwrap_or(self.kind),
            opening_balance_vnd: opening,
            balance_vnd: balance,
            ..self
        })
    }
}

impl UpdateWallet {
    pub fn changed_columns(&self) -> Vec<&'static str> {
        let mut columns = Vec::new();
        if self.name.is_some() {
            columns.push("name");
        }
        if self.kind.is_some() {
            columns.push("kind");
        }
        if self.opening_balance_vnd.is_some() {
            columns.push("opening_balance_vnd");
        }
        columns
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cash(opening: i64) -> Wallet {
        let input = NewWallet {
            name: " Ví ".into(),
            kind: WalletKind::Cash,
            opening_balance_vnd: Money(opening),
        };
        Wallet::from_new("w1".into(), 1, input).unwrap()
    }

    fn update(id: &str) -> UpdateWallet {
        UpdateWallet { id: id.into(), name: None, kind: None, opening_balance_vnd: None }
    }

    #[test]
    fn new_wallet_starts_with_its_opening_balance() {
        let wallet = cash(120_000);
        assert_eq!(wallet.name, "Ví");
        assert_eq!(wallet.balance_vnd, Money(120_000));
    }

    #[test]
    fn new_wallet_rejects_a_blank_name() {
        let input =
            NewWallet { name: " ".into(), kind: WalletKind::Bank, opening_balance_vnd: Money(0) };
        assert!(Wallet::from_new("w".into(), 1, input).is_err());
    }

    #[test]
    fn changing_the_opening_balance_moves_the_balance_by_the_difference() {
        let spent = Wallet { balance_vnd: Money(80_000), ..cash(100_000) };
        let change = UpdateWallet { opening_balance_vnd: Some(Money(150_000)), ..update("w1") };
        let moved = spent.apply(change).unwrap();
        assert_eq!(moved.opening_balance_vnd, Money(150_000));
        assert_eq!(moved.balance_vnd, Money(130_000));
    }

    #[test]
    fn update_changes_name_and_kind_only_when_given() {
        let change = UpdateWallet { kind: Some(WalletKind::Bank), ..update("w1") };
        let wallet = cash(0).apply(change).unwrap();
        assert_eq!(wallet.kind, WalletKind::Bank);
        assert_eq!(wallet.name, "Ví");
        let blank = UpdateWallet { name: Some("".into()), ..update("w1") };
        assert!(cash(0).apply(blank).is_err());
    }

    #[test]
    fn changed_columns_lists_only_given_fields() {
        let change = UpdateWallet {
            kind: Some(WalletKind::Cash),
            opening_balance_vnd: Some(Money(1)),
            ..update("w")
        };
        assert_eq!(change.changed_columns(), vec!["kind", "opening_balance_vnd"]);
    }

    #[test]
    fn kind_round_trips_through_text() {
        for kind in [WalletKind::Bank, WalletKind::Ewallet, WalletKind::Cash] {
            assert_eq!(WalletKind::parse(kind.as_str()).unwrap(), kind);
        }
        assert!(WalletKind::parse("crypto").is_err());
    }
}
