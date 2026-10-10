use serde::{Deserialize, Serialize};

use crate::shared::money::Money;

pub mod bill;
pub mod budget;
pub mod calendar;
pub mod category;
pub mod csv_export;
pub mod entity;
pub mod goal;
pub mod notice;
pub mod payment_method;
pub mod recurring;
pub mod report;
pub mod statement;
pub mod summary;
pub mod transaction;
pub mod validation;
pub mod wallet;

pub use bill::{Bill, SaveBill};
pub use budget::{BudgetLine, BudgetStatus, BudgetTone};
pub use calendar::{normalize_month, today_utc, MonthContext, MonthQuery};
pub use category::{Category, CategoryKind, NewCategory, UpdateCategory};
pub use entity::Entity;
pub use goal::{ContributeGoal, Goal, NewGoal, UpdateGoal};
pub use notice::{budget_category_id, BudgetAlert};
pub use payment_method::{
    NewPaymentMethod, PaymentMethod, UpdatePaymentMethod, DEFAULT_PAYMENT_METHOD_ID, PAYMENT_ICONS,
};
pub use summary::{MonthSummary, MonthTotals, SummaryParts};
pub use transaction::{TransactionFilter, UpdateTransaction};
pub use wallet::{DeleteWallet, NewWallet, UpdateWallet, Wallet, WalletKind};

/// One money movement. Spending is negative, income is positive.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: String,
    pub occurred_on: String,
    pub title: String,
    pub category_id: String,
    pub wallet_id: String,
    pub amount_vnd: Money,
    pub note: String,
    pub recurring_rule: Option<String>,
    pub recurring_source_id: Option<String>,
    pub payment_method_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// What other modules hand to the spending contract to record a transaction.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTransaction {
    pub title: String,
    pub amount_vnd: Money,
    pub category_id: String,
    pub wallet_id: String,
    pub occurred_on: String,
    #[serde(default)]
    pub note: String,
    #[serde(default)]
    pub recurring_rule: Option<String>,
    #[serde(default)]
    pub payment_method_id: Option<String>,
}
