use std::collections::HashMap;

use serde::Deserialize;

use crate::shared::money::Money;

/// One confirmed statement line, ready to be recorded.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRow {
    pub occurred_on: String,
    pub amount_vnd: Money,
    pub title: String,
    pub category_id: String,
}

/// What makes two lines "the same" for duplicate detection.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct LedgerKey {
    pub occurred_on: String,
    pub amount_vnd: i64,
    pub title: String,
}

impl ImportRow {
    pub fn ledger_key(&self) -> LedgerKey {
        LedgerKey {
            occurred_on: self.occurred_on.clone(),
            amount_vnd: self.amount_vnd.vnd(),
            title: self.title.trim().to_string(),
        }
    }
}

/// Splits `rows` into the ones to record and the number skipped as duplicates. Each existing
/// transaction cancels out at most one line, so a statement that really has two identical coffees
/// still records both when the wallet has none, and importing the same file twice adds nothing.
pub fn drop_known_duplicates(
    rows: Vec<ImportRow>,
    mut known: HashMap<LedgerKey, usize>,
) -> (Vec<ImportRow>, usize) {
    let mut fresh = Vec::with_capacity(rows.len());
    let mut skipped = 0;
    for row in rows {
        match known.get_mut(&row.ledger_key()) {
            Some(remaining) if *remaining > 0 => {
                *remaining -= 1;
                skipped += 1;
            }
            _ => fresh.push(row),
        }
    }
    (fresh, skipped)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(date: &str, amount: i64, title: &str) -> ImportRow {
        ImportRow {
            occurred_on: date.into(),
            amount_vnd: Money(amount),
            title: title.into(),
            category_id: "category-food".into(),
        }
    }

    fn known(rows: &[(&str, i64, &str, usize)]) -> HashMap<LedgerKey, usize> {
        rows.iter()
            .map(|(date, amount, title, count)| (row(date, *amount, title).ledger_key(), *count))
            .collect()
    }

    #[test]
    fn a_line_matching_date_amount_and_title_is_skipped() {
        let rows =
            vec![row("2026-10-09", -65_000, "Highlands"), row("2026-10-09", -65_000, "Grab")];
        let (fresh, skipped) =
            drop_known_duplicates(rows, known(&[("2026-10-09", -65_000, "Highlands", 1)]));
        assert_eq!((fresh.len(), skipped), (1, 1));
        assert_eq!(fresh[0].title, "Grab");
    }

    #[test]
    fn a_different_date_amount_or_title_is_not_a_duplicate() {
        let known = known(&[("2026-10-09", -65_000, "Highlands", 1)]);
        let rows = vec![
            row("2026-10-10", -65_000, "Highlands"),
            row("2026-10-09", -60_000, "Highlands"),
            row("2026-10-09", -65_000, "highlands"),
        ];
        let (fresh, skipped) = drop_known_duplicates(rows, known);
        assert_eq!((fresh.len(), skipped), (3, 0));
    }

    #[test]
    fn each_existing_transaction_cancels_only_one_identical_line() {
        let rows = vec![
            row("2026-10-09", -65_000, "Highlands"),
            row("2026-10-09", -65_000, "Highlands"),
            row("2026-10-09", -65_000, "Highlands"),
        ];
        let (fresh, skipped) =
            drop_known_duplicates(rows, known(&[("2026-10-09", -65_000, "Highlands", 2)]));
        assert_eq!((fresh.len(), skipped), (1, 2));
    }

    #[test]
    fn identical_lines_in_one_statement_are_all_kept_when_nothing_exists_yet() {
        let rows =
            vec![row("2026-10-09", -65_000, "Highlands"), row("2026-10-09", -65_000, "Highlands")];
        let (fresh, skipped) = drop_known_duplicates(rows, HashMap::new());
        assert_eq!((fresh.len(), skipped), (2, 0));
    }

    #[test]
    fn spaces_around_the_title_do_not_hide_a_duplicate() {
        let rows = vec![row("2026-10-09", -65_000, "  Highlands ")];
        let (fresh, skipped) =
            drop_known_duplicates(rows, known(&[("2026-10-09", -65_000, "Highlands", 1)]));
        assert_eq!((fresh.len(), skipped), (0, 1));
    }
}
