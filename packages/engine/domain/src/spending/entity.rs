#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Entity {
    Category,
    Wallet,
    Transaction,
    Goal,
    Bill,
}

impl Entity {
    pub fn table(self) -> &'static str {
        match self {
            Entity::Category => "spending_categories",
            Entity::Wallet => "spending_wallets",
            Entity::Transaction => "spending_transactions",
            Entity::Goal => "spending_goals",
            Entity::Bill => "spending_bills",
        }
    }

    pub fn entity_type(self) -> &'static str {
        match self {
            Entity::Category => "category",
            Entity::Wallet => "wallet",
            Entity::Transaction => "transaction",
            Entity::Goal => "goal",
            Entity::Bill => "bill",
        }
    }
}

impl Entity {
    pub fn columns(self) -> &'static [&'static str] {
        match self {
            Entity::Category => &["name", "icon", "kind", "budget_vnd", "is_fixed", "position"],
            Entity::Wallet => &["name", "kind", "opening_balance_vnd", "position"],
            Entity::Transaction => &[
                "occurred_on",
                "title",
                "category_id",
                "wallet_id",
                "amount_vnd",
                "note",
                "recurring_rule",
                "recurring_source_id",
                "created_at",
            ],
            Entity::Goal => &["name", "icon", "target_vnd", "saved_vnd", "due_on", "created_at"],
            Entity::Bill => {
                &["title", "icon", "amount_vnd", "day_of_month", "active", "created_at"]
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::merge_policy::policy_for;

    #[test]
    fn every_entity_table_has_a_declared_merge_policy() {
        let all =
            [Entity::Category, Entity::Wallet, Entity::Transaction, Entity::Goal, Entity::Bill];
        for entity in all {
            assert!(policy_for(entity.table()).is_some(), "{}", entity.table());
        }
    }

    #[test]
    fn every_entity_stamps_its_own_columns_on_insert() {
        assert!(Entity::Category.columns().contains(&"budget_vnd"));
        assert!(Entity::Transaction.columns().contains(&"amount_vnd"));
        assert!(Entity::Wallet.columns().contains(&"opening_balance_vnd"));
        assert!(Entity::Goal.columns().contains(&"saved_vnd"));
        assert!(Entity::Bill.columns().contains(&"day_of_month"));
        assert_eq!(Entity::Bill.entity_type(), "bill");
    }
}
