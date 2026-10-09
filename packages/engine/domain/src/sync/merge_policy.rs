/// How two devices' versions of one row are combined. Declared per table, never inferred.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MergePolicy {
    /// Every column carries its own clock; edits to different columns both survive.
    FieldLevel,
    /// The version with the larger clock replaces the whole row. Used when columns only make
    /// sense together.
    WholeRow,
}

/// Every table that takes part in sync and its policy. Add a line when a module adds a table.
pub const TABLE_POLICIES: &[(&str, MergePolicy)] = &[
    ("spending_categories", MergePolicy::FieldLevel),
    ("spending_wallets", MergePolicy::FieldLevel),
    ("spending_transactions", MergePolicy::FieldLevel),
    ("spending_bills", MergePolicy::FieldLevel),
    ("spending_goals", MergePolicy::FieldLevel),
    ("recipes_recipes", MergePolicy::FieldLevel),
    ("recipes_ingredients", MergePolicy::WholeRow),
    ("recipes_steps", MergePolicy::WholeRow),
    ("recipes_plan_entries", MergePolicy::WholeRow),
    ("recipes_shopping_items", MergePolicy::WholeRow),
    ("recipes_shopping_state", MergePolicy::WholeRow),
];

pub fn policy_for(table: &str) -> Option<MergePolicy> {
    TABLE_POLICIES.iter().find(|(name, _)| *name == table).map(|(_, policy)| *policy)
}
