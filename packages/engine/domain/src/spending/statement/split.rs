use std::collections::HashMap;

const DELIMITERS: [char; 3] = ['\t', ';', ','];
const SAMPLE_LINES: usize = 20;
const BYTE_ORDER_MARK: char = '\u{FEFF}';

pub fn strip_byte_order_mark(text: &str) -> &str {
    text.strip_prefix(BYTE_ORDER_MARK).unwrap_or(text)
}

/// The delimiter that splits the most sample lines into the same number of cells. Commas inside
/// quotes or inside "1,250,000" style amounts do not count, because they are quoted or uneven.
pub fn detect_delimiter(text: &str) -> char {
    let lines: Vec<&str> =
        text.lines().filter(|line| !line.trim().is_empty()).take(SAMPLE_LINES).collect();
    let best = DELIMITERS
        .iter()
        .map(|delimiter| (*delimiter, consistency(&lines, *delimiter)))
        .filter(|(_, (_, cells))| *cells > 0)
        .fold(None, keep_better);
    best.map_or(',', |(delimiter, _)| delimiter)
}

fn keep_better(
    best: Option<(char, (usize, usize))>,
    candidate: (char, (usize, usize)),
) -> Option<(char, (usize, usize))> {
    match best {
        Some((_, score)) if score >= candidate.1 => best,
        _ => Some(candidate),
    }
}

/// (lines that have the most common delimiter count, that count).
fn consistency(lines: &[&str], delimiter: char) -> (usize, usize) {
    let mut frequency: HashMap<usize, usize> = HashMap::new();
    for line in lines {
        let count = count_outside_quotes(line, delimiter);
        if count > 0 {
            *frequency.entry(count).or_insert(0) += 1;
        }
    }
    let common = frequency.into_iter().max_by_key(|(count, lines)| (*lines, *count));
    common.map_or((0, 0), |(count, lines)| (lines, count))
}

fn count_outside_quotes(line: &str, delimiter: char) -> usize {
    let mut quoted = false;
    let mut count = 0;
    for letter in line.chars() {
        if letter == '"' {
            quoted = !quoted;
        } else if letter == delimiter && !quoted {
            count += 1;
        }
    }
    count
}

/// Splits CSV text into records of trimmed cells. Quoted cells may hold the delimiter, line
/// breaks and doubled quotes.
pub fn split_records(text: &str, delimiter: char) -> Vec<Vec<String>> {
    let mut reader = RecordReader::default();
    let mut letters = text.chars().peekable();
    while let Some(letter) = letters.next() {
        let escaped_quote = letter == '"' && letters.peek() == Some(&'"');
        if reader.quoted && escaped_quote {
            reader.cell.push('"');
            letters.next();
        } else if letter == '"' {
            reader.toggle_quote();
        } else if reader.quoted {
            reader.cell.push(letter);
        } else if letter == delimiter {
            reader.end_cell();
        } else if letter == '\n' {
            reader.end_record();
        } else if letter != '\r' {
            reader.cell.push(letter);
        }
    }
    reader.end_record();
    reader.records
}

#[derive(Default)]
struct RecordReader {
    records: Vec<Vec<String>>,
    record: Vec<String>,
    cell: String,
    quoted: bool,
}

impl RecordReader {
    fn toggle_quote(&mut self) {
        self.quoted = !self.quoted;
    }

    fn end_cell(&mut self) {
        self.record.push(self.cell.trim().to_string());
        self.cell.clear();
    }

    fn end_record(&mut self) {
        self.end_cell();
        self.records.push(std::mem::take(&mut self.record));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cells(record: &[&str]) -> Vec<String> {
        record.iter().map(|cell| cell.to_string()).collect()
    }

    #[test]
    fn a_semicolon_file_with_decimal_commas_is_still_semicolon_separated() {
        let text = "Ngày;Số tiền;Nội dung\n09/10/2026;-65.000,50;Grab\n08/10/2026;1.250.000;Lương";
        assert_eq!(detect_delimiter(text), ';');
    }

    #[test]
    fn a_comma_file_with_quoted_thousands_separators_is_comma_separated() {
        let text = "Date,Debit,Credit\n09/10/2026,\"1,250,000\",\n10/10/2026,,\"2,000,000\"";
        assert_eq!(detect_delimiter(text), ',');
    }

    #[test]
    fn a_tab_separated_paste_from_a_spreadsheet_is_detected() {
        let text = "Ngày\tSố tiền\tNội dung\n09/10/2026\t-65,000\tGrab, đi làm";
        assert_eq!(detect_delimiter(text), '\t');
    }

    #[test]
    fn text_without_any_delimiter_falls_back_to_comma() {
        assert_eq!(detect_delimiter("one column\nanother"), ',');
        assert_eq!(detect_delimiter(""), ',');
    }

    #[test]
    fn preamble_lines_with_other_counts_do_not_hide_the_real_delimiter() {
        let text = "Tài khoản: 0123456789\nChủ tài khoản: Nguyễn Văn A\nNgày;Số tiền;Nội dung\n1/10/2026;-5;a\n2/10/2026;-6;b";
        assert_eq!(detect_delimiter(text), ';');
    }

    #[test]
    fn records_are_split_on_the_delimiter_and_trimmed() {
        let records = split_records("a; b ;c\r\nd;e;f\r\n", ';');
        assert_eq!(records, vec![cells(&["a", "b", "c"]), cells(&["d", "e", "f"]), cells(&[""])]);
    }

    #[test]
    fn quoted_cells_keep_delimiters_line_breaks_and_doubled_quotes() {
        let records = split_records("\"Bún bò, chả\",\"dòng 1\ndòng 2\",\"nói \"\"hi\"\"\"", ',');
        assert_eq!(records, vec![cells(&["Bún bò, chả", "dòng 1\ndòng 2", "nói \"hi\""])]);
    }

    #[test]
    fn a_last_record_without_a_line_break_is_kept() {
        assert_eq!(split_records("a,b", ','), vec![cells(&["a", "b"])]);
    }

    #[test]
    fn the_byte_order_mark_is_removed() {
        assert_eq!(strip_byte_order_mark("\u{FEFF}date,amount"), "date,amount");
        assert_eq!(strip_byte_order_mark("date"), "date");
    }
}
