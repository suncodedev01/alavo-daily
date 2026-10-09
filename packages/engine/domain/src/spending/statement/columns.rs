use super::fold::fold_text;
use super::values::{parse_amount, parse_date};

/// Where the amount lives: one signed column, or separate debit (money out) and credit (money
/// in) columns.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AmountColumns {
    Signed(usize),
    DebitCredit { debit: Option<usize>, credit: Option<usize> },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ColumnMap {
    pub date: usize,
    pub title: Option<usize>,
    pub amount: AmountColumns,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Role {
    Date,
    Debit,
    Credit,
    Signed,
    Title(u8),
}

const DEBIT_PHRASES: [&str; 8] =
    ["ghi no", "debit", "rut ra", "tien ra", "withdrawal", "paid out", "money out", "so tien no"];
const DEBIT_WORDS: [&str; 2] = ["no", "chi"];
const CREDIT_PHRASES: [&str; 8] =
    ["ghi co", "credit", "nop vao", "tien vao", "deposit", "paid in", "money in", "so tien co"];
const CREDIT_WORDS: [&str; 2] = ["co", "thu"];
const SIGNED_PHRASES: [&str; 6] = ["so tien", "amount", "gia tri", "money", "tien", "gia tri gd"];
const DATE_WORDS: [&str; 2] = ["ngay", "date"];
const TITLE_PHRASES: [(&str, u8); 11] = [
    ("noi dung", 0),
    ("mo ta", 1),
    ("description", 1),
    ("dien giai", 1),
    ("narrative", 1),
    ("details", 1),
    ("memo", 1),
    ("chi tiet", 2),
    ("ghi chu", 3),
    ("remarks", 3),
    ("note", 3),
];

/// The column roles named by a header record, when it names a date and an amount.
pub fn from_header(record: &[String]) -> Option<ColumnMap> {
    let roles: Vec<Option<Role>> = record.iter().map(|cell| role_of(&fold_text(cell))).collect();
    let date = position_of(&roles, |role| role == Role::Date)?;
    let debit = position_of(&roles, |role| role == Role::Debit);
    let credit = position_of(&roles, |role| role == Role::Credit);
    let signed = position_of(&roles, |role| role == Role::Signed);
    let amount = match (debit, credit, signed) {
        (None, None, Some(column)) => AmountColumns::Signed(column),
        (None, None, None) => return None,
        _ => AmountColumns::DebitCredit { debit, credit },
    };
    Some(ColumnMap { date, title: best_title(&roles), amount })
}

fn role_of(folded: &str) -> Option<Role> {
    let padded = format!(" {folded} ");
    let has_word = |words: &[&str]| words.iter().any(|word| padded.contains(&format!(" {word} ")));
    if has_word(&DATE_WORDS) || padded.contains(" thoi gian ") {
        return Some(Role::Date);
    }
    if has_word(&DEBIT_PHRASES) {
        return Some(Role::Debit);
    }
    if has_word(&CREDIT_PHRASES) {
        return Some(Role::Credit);
    }
    if let Some((_, rank)) = TITLE_PHRASES.iter().find(|(phrase, _)| has_word(&[*phrase])) {
        return Some(Role::Title(*rank));
    }
    if has_word(&DEBIT_WORDS) {
        return Some(Role::Debit);
    }
    if has_word(&CREDIT_WORDS) {
        return Some(Role::Credit);
    }
    has_word(&SIGNED_PHRASES).then_some(Role::Signed)
}

fn position_of(roles: &[Option<Role>], matches: impl Fn(Role) -> bool) -> Option<usize> {
    roles.iter().position(|role| role.is_some_and(&matches))
}

fn best_title(roles: &[Option<Role>]) -> Option<usize> {
    let ranked = roles.iter().enumerate().filter_map(|(index, role)| match role {
        Some(Role::Title(rank)) => Some((*rank, index)),
        _ => None,
    });
    ranked.min().map(|(_, index)| index)
}

/// For a file with no header: the first date, the first plain amount after it, and the longest
/// remaining text, judged from one data record.
pub fn guess_from_row(record: &[String]) -> Option<ColumnMap> {
    let date = record.iter().position(|cell| parse_date(cell).is_some())?;
    let amount = record
        .iter()
        .enumerate()
        .position(|(index, cell)| index > date && is_plain_amount(cell))?;
    let title = record
        .iter()
        .enumerate()
        .filter(|(index, cell)| *index != date && *index != amount && !cell.is_empty())
        .filter(|(_, cell)| !is_plain_amount(cell) && parse_date(cell).is_none())
        .max_by_key(|(_, cell)| cell.chars().count())
        .map(|(index, _)| index);
    Some(ColumnMap { date, title, amount: AmountColumns::Signed(amount) })
}

fn is_plain_amount(cell: &str) -> bool {
    parse_amount(cell).is_some() && parse_date(cell).is_none()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn header(cells: &[&str]) -> Vec<String> {
        cells.iter().map(|cell| cell.to_string()).collect()
    }

    #[test]
    fn a_vietnamese_bank_header_with_debit_and_credit_columns_is_understood() {
        let record =
            header(&["Ngày giao dịch", "Số tiền ghi nợ", "Số tiền ghi có", "Số dư", "Nội dung"]);
        assert_eq!(
            from_header(&record),
            Some(ColumnMap {
                date: 0,
                title: Some(4),
                amount: AmountColumns::DebitCredit { debit: Some(1), credit: Some(2) },
            })
        );
    }

    #[test]
    fn an_english_header_with_debit_and_credit_columns_is_understood() {
        let record = header(&["Date", "Description", "Debit", "Credit", "Balance"]);
        let map = from_header(&record).unwrap();
        assert_eq!((map.date, map.title), (0, Some(1)));
        assert_eq!(map.amount, AmountColumns::DebitCredit { debit: Some(2), credit: Some(3) });
    }

    #[test]
    fn a_single_amount_column_is_signed() {
        let record = header(&["Date", "Amount", "Description"]);
        let map = from_header(&record).unwrap();
        assert_eq!(map.amount, AmountColumns::Signed(1));
        assert_eq!(map.title, Some(2));
        let vietnamese = header(&["Ngày", "Số tiền", "Mô tả"]);
        assert_eq!(from_header(&vietnamese).unwrap().amount, AmountColumns::Signed(1));
    }

    #[test]
    fn short_nợ_and_có_headers_name_the_money_out_and_money_in_columns() {
        let record = header(&["Ngày GD", "Diễn giải", "Nợ", "Có"]);
        let map = from_header(&record).unwrap();
        assert_eq!(map.amount, AmountColumns::DebitCredit { debit: Some(2), credit: Some(3) });
        assert_eq!(map.title, Some(1));
    }

    #[test]
    fn a_statement_with_only_a_debit_column_is_understood() {
        let record = header(&["Date", "Details", "Withdrawal"]);
        let map = from_header(&record).unwrap();
        assert_eq!(map.amount, AmountColumns::DebitCredit { debit: Some(2), credit: None });
    }

    #[test]
    fn the_content_column_beats_a_note_column_as_the_title() {
        let record = header(&["Ghi chú", "Nội dung giao dịch", "Date", "Amount"]);
        assert_eq!(from_header(&record).unwrap().title, Some(1));
    }

    #[test]
    fn a_record_without_a_date_and_an_amount_is_not_a_header() {
        assert_eq!(from_header(&header(&["Tài khoản", "0123456789"])), None);
        assert_eq!(from_header(&header(&["Ngày", "Nội dung"])), None);
        assert_eq!(from_header(&header(&["Số tiền", "Nội dung"])), None);
        assert_eq!(from_header(&header(&["09/10/2026", "-65.000", "Grab"])), None);
    }

    #[test]
    fn a_data_row_is_enough_to_guess_the_columns_of_a_headerless_file() {
        let record = header(&["09/10/2026", "Thanh toán Highlands Coffee", "-65.000", "9.935.000"]);
        let map = guess_from_row(&record).unwrap();
        assert_eq!((map.date, map.title), (0, Some(1)));
        assert_eq!(map.amount, AmountColumns::Signed(2));
    }

    #[test]
    fn a_row_without_a_date_or_an_amount_cannot_be_guessed() {
        assert_eq!(guess_from_row(&header(&["Grab", "-65.000"])), None);
        assert_eq!(guess_from_row(&header(&["09/10/2026", "Grab"])), None);
    }
}
