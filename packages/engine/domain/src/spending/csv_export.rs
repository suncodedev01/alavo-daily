use crate::shared::money::Money;

const HEADER: [&str; 6] = ["date", "title", "category", "wallet", "amount_vnd", "note"];
const LINE_END: &str = "\r\n";

#[derive(Debug, Clone, PartialEq)]
pub struct ExportRow {
    pub occurred_on: String,
    pub title: String,
    pub category_name: String,
    pub wallet_name: String,
    pub amount: Money,
    pub note: String,
}

pub fn to_csv(rows: &[ExportRow]) -> String {
    let mut lines = vec![HEADER.join(",")];
    lines.extend(rows.iter().map(csv_line));
    lines.join(LINE_END) + LINE_END
}

fn csv_line(row: &ExportRow) -> String {
    [
        row.occurred_on.clone(),
        text_field(&row.title),
        text_field(&row.category_name),
        text_field(&row.wallet_name),
        row.amount.vnd().to_string(),
        text_field(&row.note),
    ]
    .join(",")
}

// A cell that starts with = + - @ is run as a formula by spreadsheet apps, and titles come from
// pasted bank statements, so such text gets a leading apostrophe. The apostrophe stays in the
// text if the file is imported again.
fn text_field(text: &str) -> String {
    let safe = if starts_like_formula(text) { format!("'{text}") } else { text.to_string() };
    quote_when_needed(&safe)
}

fn starts_like_formula(text: &str) -> bool {
    text.starts_with(['=', '+', '-', '@', '\t', '\r'])
}

fn quote_when_needed(text: &str) -> String {
    if text.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", text.replace('"', "\"\""))
    } else {
        text.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(title: &str, amount: i64, note: &str) -> ExportRow {
        ExportRow {
            occurred_on: "2026-10-06".into(),
            title: title.into(),
            category_name: "Ăn uống".into(),
            wallet_name: "Tiền mặt".into(),
            amount: Money(amount),
            note: note.into(),
        }
    }

    #[test]
    fn an_empty_export_is_just_the_header() {
        assert_eq!(to_csv(&[]), "date,title,category,wallet,amount_vnd,note\r\n");
    }

    #[test]
    fn rows_keep_iso_dates_signed_integer_amounts_and_vietnamese_text() {
        let csv = to_csv(&[row("Phở Thìn", -70_000, ""), row("Lương", 28_000_000, "tháng 10")]);
        let lines: Vec<_> = csv.lines().collect();
        assert_eq!(lines[1], "2026-10-06,Phở Thìn,Ăn uống,Tiền mặt,-70000,");
        assert_eq!(lines[2], "2026-10-06,Lương,Ăn uống,Tiền mặt,28000000,tháng 10");
        assert!(csv.ends_with("\r\n"));
    }

    #[test]
    fn commas_and_quotes_are_quoted_and_the_quotes_doubled() {
        let csv = to_csv(&[row("Bún bò, chả \"Huế\"", -1, "")]);
        assert!(csv.contains("\"Bún bò, chả \"\"Huế\"\"\""));
    }

    #[test]
    fn a_line_break_inside_a_field_stays_inside_quotes() {
        let csv = to_csv(&[row("Phở", -1, "dòng 1\ndòng 2")]);
        assert!(csv.contains("\"dòng 1\ndòng 2\""));
    }

    #[test]
    fn text_that_would_run_as_a_formula_gets_a_leading_apostrophe() {
        let csv = to_csv(&[row("=SUM(A1)", -1, "+84 912"), row("@ngan hang", -1, "-ghi chú")]);
        assert!(csv.contains(",'=SUM(A1),"));
        assert!(csv.contains(",'+84 912\r\n"));
        assert!(csv.contains(",'@ngan hang,"));
        assert!(csv.contains(",'-ghi chú\r\n"));
    }

    #[test]
    fn negative_amounts_are_not_treated_as_formulas() {
        assert!(to_csv(&[row("x", -5, "")]).contains(",Tiền mặt,-5,"));
    }
}
