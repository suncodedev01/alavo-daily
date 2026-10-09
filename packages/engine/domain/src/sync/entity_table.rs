use super::merge_policy::TABLE_POLICIES;

/// The table that holds the rows of a (module, entity type) pair, found by the naming rule
/// `<module>_<entity type, plural>` among the tables that take part in sync. An event for a pair
/// with no such table comes from a newer app version and is ignored.
pub fn table_for(module: &str, entity_type: &str) -> Option<&'static str> {
    let prefix = format!("{module}_");
    TABLE_POLICIES
        .iter()
        .map(|(table, _)| *table)
        .filter(|table| table.starts_with(&prefix))
        .find(|table| is_plural_of(&table[prefix.len()..], entity_type))
}

fn is_plural_of(name: &str, entity_type: &str) -> bool {
    let regular = format!("{entity_type}s");
    let with_y = entity_type.strip_suffix('y').map(|stem| format!("{stem}ies"));
    name == entity_type || name == regular || with_y.as_deref() == Some(name)
}

/// The module and entity type of a table, for events written on behalf of a whole row.
pub fn entity_for_table(table: &str) -> Option<(String, String)> {
    let (module, name) = table.split_once('_')?;
    singular_candidates(name)
        .into_iter()
        .find(|candidate| table_for(module, candidate) == Some(table))
        .map(|entity| (module.to_string(), entity))
}

fn singular_candidates(name: &str) -> Vec<String> {
    let mut candidates = Vec::new();
    if let Some(stem) = name.strip_suffix("ies") {
        candidates.push(format!("{stem}y"));
    }
    if let Some(stem) = name.strip_suffix('s') {
        candidates.push(stem.to_string());
    }
    candidates.push(name.to_string());
    candidates
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_synced_table_can_be_reached_from_an_event() {
        for (table, _) in TABLE_POLICIES {
            let (module, entity) = entity_for_table(table).expect(table);
            assert_eq!(table_for(&module, &entity), Some(*table));
        }
    }

    #[test]
    fn the_modules_own_entity_names_resolve_to_their_tables() {
        assert_eq!(table_for("spending", "category"), Some("spending_categories"));
        assert_eq!(table_for("spending", "transaction"), Some("spending_transactions"));
        assert_eq!(table_for("recipes", "recipe"), Some("recipes_recipes"));
        assert_eq!(table_for("recipes", "plan_entry"), Some("recipes_plan_entries"));
        assert_eq!(table_for("recipes", "shopping_state"), Some("recipes_shopping_state"));
        assert_eq!(table_for("recipes", "photo"), Some("recipes_photos"));
    }

    #[test]
    fn unknown_pairs_resolve_to_nothing() {
        assert_eq!(table_for("recipes", "unknown"), None);
        assert_eq!(table_for("nobody", "recipe"), None);
        assert_eq!(table_for("spending", "recipe"), None);
    }

    #[test]
    fn a_table_maps_back_to_the_entity_name_the_module_uses() {
        let entity = entity_for_table("recipes_plan_entries");
        assert_eq!(entity, Some(("recipes".to_string(), "plan_entry".to_string())));
    }
}
