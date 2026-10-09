//! Sort keys for ingredients and steps. Zero-padded counters sort correctly as text, which is
//! all a list that is rewritten as a whole needs.

const WIDTH: usize = 4;

/// Largest list the four-digit keys can order.
pub const MAX_POSITIONS: usize = 9_999;

pub fn position_at(index: usize) -> String {
    format!("{:0width$}", index + 1, width = WIDTH)
}

pub fn positions(count: usize) -> Vec<String> {
    (0..count).map(position_at).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn positions_start_at_one_and_are_zero_padded() {
        assert_eq!(positions(3), ["0001", "0002", "0003"]);
    }

    #[test]
    fn positions_sort_as_text_in_creation_order() {
        let keys = positions(MAX_POSITIONS);
        let mut sorted = keys.clone();
        sorted.sort();
        assert_eq!(keys, sorted);
        assert_eq!(keys.last().unwrap(), "9999");
    }

    #[test]
    fn no_positions_for_an_empty_list() {
        assert!(positions(0).is_empty());
    }
}
