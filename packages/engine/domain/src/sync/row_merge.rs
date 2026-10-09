use serde_json::{Map, Value};

use super::incoming::{ColumnWrite, Incoming};
use super::json_values::{canonical, canonical_columns, integer, read_stamps, Row};
use super::merge_policy::MergePolicy;

const UPDATED_AT: &str = "updated_at";
const DELETED_AT: &str = "deleted_at";
const FIELD_STAMPS: &str = "field_updated_at";

/// Combines the stored row with what an event says. `current` holds every column of the table,
/// so columns the table does not have are dropped.
pub fn merge(policy: MergePolicy, current: &Row, incoming: &Incoming) -> Row {
    match policy {
        MergePolicy::FieldLevel => merge_field_level(current, incoming),
        MergePolicy::WholeRow => merge_whole_row(current, incoming),
    }
}

/// Every column keeps the value with the latest clock. A delete is a clock on `deleted_at`: the
/// row stays deleted unless some column was edited after it.
pub fn merge_field_level(current: &Row, incoming: &Incoming) -> Row {
    let mut row = current.clone();
    let mut stamps = read_stamps(current.get(FIELD_STAMPS));
    for write in &incoming.writes {
        if row.contains_key(&write.column) {
            write_newer_column(&mut row, &mut stamps, write);
        }
    }
    if let Some(tombstone) = incoming.tombstone {
        raise_stamp(&mut stamps, DELETED_AT, tombstone);
    }
    settle_field_level(row, &stamps)
}

fn write_newer_column(row: &mut Row, stamps: &mut Map<String, Value>, write: &ColumnWrite) {
    let known = integer(stamps.get(&write.column)).unwrap_or(0);
    let stored = row.get(&write.column).map_or_else(|| "null".to_string(), canonical);
    let larger_content = canonical(&write.value) > stored;
    if write.stamp == 0 {
        if known == 0 && larger_content {
            row.insert(write.column.clone(), write.value.clone());
        }
    } else if write.stamp > known || (write.stamp == known && larger_content) {
        row.insert(write.column.clone(), write.value.clone());
        stamps.insert(write.column.clone(), Value::from(write.stamp));
    }
}

fn raise_stamp(stamps: &mut Map<String, Value>, column: &str, stamp: i64) {
    if stamp > integer(stamps.get(column)).unwrap_or(0) {
        stamps.insert(column.to_string(), Value::from(stamp));
    }
}

fn settle_field_level(mut row: Row, stamps: &Map<String, Value>) -> Row {
    let latest_edit = stamps
        .iter()
        .filter(|(column, _)| column.as_str() != DELETED_AT)
        .filter_map(|(_, stamp)| integer(Some(stamp)))
        .max()
        .unwrap_or(0);
    let tombstone = integer(stamps.get(DELETED_AT)).unwrap_or(0);
    let deleted_at = (tombstone > 0 && tombstone >= latest_edit).then_some(tombstone);
    let updated_at = latest_edit.max(tombstone).max(integer(row.get(UPDATED_AT)).unwrap_or(0));
    set_if_present(&mut row, DELETED_AT, deleted_at.map_or(Value::Null, Value::from));
    set_if_present(&mut row, UPDATED_AT, Value::from(updated_at));
    let stamps_text = Value::Object(stamps.clone()).to_string();
    set_if_present(&mut row, FIELD_STAMPS, Value::String(stamps_text));
    row
}

fn set_if_present(row: &mut Row, column: &str, value: Value) {
    if row.contains_key(column) {
        row.insert(column.to_string(), value);
    }
}

/// The version with the larger clock replaces the content. A delete wins over any version that
/// is not newer than it, and a newer version brings the row back.
pub fn merge_whole_row(current: &Row, incoming: &Incoming) -> Row {
    let mut row = current.clone();
    if !incoming.writes.is_empty() {
        apply_version(&mut row, incoming);
    }
    if let Some(tombstone) = incoming.tombstone {
        apply_tombstone(&mut row, tombstone);
    }
    row
}

fn apply_version(row: &mut Row, incoming: &Incoming) {
    if !version_wins(row, incoming) {
        return;
    }
    for write in &incoming.writes {
        set_if_present(row, &write.column, write.value.clone());
    }
    set_if_present(row, UPDATED_AT, Value::from(incoming.version));
    let deleted_at = integer(row.get(DELETED_AT));
    if deleted_at.is_some_and(|deleted| incoming.version > deleted) {
        set_if_present(row, DELETED_AT, Value::Null);
    }
}

/// Equal clocks are rare but possible between two devices; the larger content wins so every
/// device picks the same version.
fn version_wins(row: &Row, incoming: &Incoming) -> bool {
    let stored = integer(row.get(UPDATED_AT)).unwrap_or(0);
    if incoming.version != stored || stored == 0 {
        return incoming.version > stored;
    }
    let columns: Vec<String> = incoming.writes.iter().map(|write| write.column.clone()).collect();
    let mut offered = Row::new();
    for write in &incoming.writes {
        offered.insert(write.column.clone(), write.value.clone());
    }
    canonical_columns(&offered, &columns) > canonical_columns(row, &columns)
}

fn apply_tombstone(row: &mut Row, tombstone: i64) {
    let stored = integer(row.get(UPDATED_AT)).unwrap_or(0);
    let deleted_at = integer(row.get(DELETED_AT));
    if tombstone >= stored && deleted_at.is_none_or(|deleted| tombstone > deleted) {
        set_if_present(row, DELETED_AT, Value::from(tombstone));
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn field_row() -> Row {
        json!({
            "id": "w1", "name": "", "kind": "", "updated_at": 0, "deleted_at": null,
            "field_updated_at": "{}",
        })
        .as_object()
        .unwrap()
        .clone()
    }

    fn whole_row() -> Row {
        json!({ "id": "i1", "name": "", "updated_at": 0, "deleted_at": null })
            .as_object()
            .unwrap()
            .clone()
    }

    fn write(column: &str, value: Value, stamp: i64) -> Incoming {
        let write = ColumnWrite { column: column.into(), value, stamp };
        Incoming { writes: vec![write], tombstone: None, version: stamp }
    }

    fn delete(stamp: i64) -> Incoming {
        Incoming { writes: vec![], tombstone: Some(stamp), version: stamp }
    }

    fn fold(policy: MergePolicy, start: &Row, order: &[&Incoming]) -> Row {
        order.iter().fold(start.clone(), |row, incoming| merge(policy, &row, incoming))
    }

    fn permutations<'a>(items: &[&'a Incoming]) -> Vec<Vec<&'a Incoming>> {
        if items.len() <= 1 {
            return vec![items.to_vec()];
        }
        let mut all = Vec::new();
        for index in 0..items.len() {
            let mut rest = items.to_vec();
            let head = rest.remove(index);
            for mut tail in permutations(&rest) {
                tail.insert(0, head);
                all.push(tail);
            }
        }
        all
    }

    fn assert_every_order_agrees(policy: MergePolicy, start: &Row, events: &[Incoming]) -> Row {
        let refs: Vec<&Incoming> = events.iter().collect();
        let expected = fold(policy, start, &refs);
        for order in permutations(&refs) {
            assert_eq!(fold(policy, start, &order), expected);
        }
        let replayed: Vec<&Incoming> = refs.iter().chain(refs.iter()).copied().collect();
        assert_eq!(fold(policy, start, &replayed), expected, "applying twice changes nothing");
        expected
    }

    #[test]
    fn field_level_keeps_edits_to_different_columns_from_both_devices() {
        let events = [write("name", json!("A"), 10), write("kind", json!("bank"), 12)];
        let row = assert_every_order_agrees(MergePolicy::FieldLevel, &field_row(), &events);
        assert_eq!((row["name"].clone(), row["kind"].clone()), (json!("A"), json!("bank")));
    }

    #[test]
    fn field_level_takes_the_later_edit_of_the_same_column() {
        let events = [write("name", json!("old"), 10), write("name", json!("new"), 20)];
        let row = assert_every_order_agrees(MergePolicy::FieldLevel, &field_row(), &events);
        assert_eq!(row["name"], json!("new"));
    }

    #[test]
    fn field_level_breaks_equal_clocks_the_same_way_in_every_order() {
        let events = [write("name", json!("x"), 10), write("name", json!("y"), 10)];
        let row = assert_every_order_agrees(MergePolicy::FieldLevel, &field_row(), &events);
        assert_eq!(row["name"], json!("y"));
    }

    #[test]
    fn field_level_delete_wins_unless_an_edit_came_after_it() {
        let deleted = [write("name", json!("A"), 10), delete(20)];
        let row = assert_every_order_agrees(MergePolicy::FieldLevel, &field_row(), &deleted);
        assert_eq!(row["deleted_at"], json!(20));
        let revived = [write("name", json!("A"), 10), delete(20), write("kind", json!("k"), 30)];
        let row = assert_every_order_agrees(MergePolicy::FieldLevel, &field_row(), &revived);
        assert!(row["deleted_at"].is_null());
        assert_eq!(row["kind"], json!("k"));
    }

    #[test]
    fn field_level_delete_arriving_before_the_row_still_deletes_it() {
        let row = merge(MergePolicy::FieldLevel, &field_row(), &delete(20));
        assert_eq!(row["deleted_at"], json!(20));
        let later = merge(MergePolicy::FieldLevel, &row, &write("name", json!("A"), 10));
        assert_eq!((later["name"].clone(), later["deleted_at"].clone()), (json!("A"), json!(20)));
    }

    #[test]
    fn whole_row_takes_the_version_with_the_larger_clock() {
        let events = [write("name", json!("old"), 10), write("name", json!("new"), 20)];
        let row = assert_every_order_agrees(MergePolicy::WholeRow, &whole_row(), &events);
        assert_eq!((row["name"].clone(), row["updated_at"].clone()), (json!("new"), json!(20)));
    }

    #[test]
    fn whole_row_delete_then_edit_after_it_brings_the_row_back() {
        let events = [write("name", json!("A"), 10), delete(20), write("name", json!("B"), 30)];
        let row = assert_every_order_agrees(MergePolicy::WholeRow, &whole_row(), &events);
        assert!(row["deleted_at"].is_null());
        assert_eq!(row["name"], json!("B"));
    }

    #[test]
    fn whole_row_delete_after_the_last_edit_wins_in_every_order() {
        let events = [write("name", json!("A"), 10), write("name", json!("B"), 15), delete(20)];
        let row = assert_every_order_agrees(MergePolicy::WholeRow, &whole_row(), &events);
        assert_eq!(row["deleted_at"], json!(20));
    }

    #[test]
    fn whole_row_ignores_a_delete_older_than_the_current_version() {
        let events = [delete(10), write("name", json!("A"), 20)];
        let row = assert_every_order_agrees(MergePolicy::WholeRow, &whole_row(), &events);
        assert!(row["deleted_at"].is_null());
    }

    #[test]
    fn an_unstamped_column_fills_a_blank_one_without_recording_a_stamp() {
        let row = merge(MergePolicy::FieldLevel, &field_row(), &write("name", json!("A"), 0));
        assert_eq!(row["name"], json!("A"));
        assert_eq!(row["field_updated_at"], json!("{}"));
        let stamped = merge(MergePolicy::FieldLevel, &row, &write("name", json!("B"), 5));
        let again = merge(MergePolicy::FieldLevel, &stamped, &write("name", json!("Z"), 0));
        assert_eq!(again["name"], json!("B"));
    }

    #[test]
    fn columns_the_table_does_not_have_are_dropped() {
        let row = merge(MergePolicy::FieldLevel, &field_row(), &write("mystery", json!(1), 5));
        assert!(!row.contains_key("mystery"));
    }
}
