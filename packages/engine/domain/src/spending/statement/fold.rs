/// Lowercase text without Vietnamese accents, with every run of other characters turned into one
/// space, so "Số TIỀN (VNĐ)" and "so tien vnd" compare equal.
pub fn fold_text(text: &str) -> String {
    let mut folded = String::with_capacity(text.len());
    for letter in text.chars().flat_map(char::to_lowercase) {
        if let Some(plain) = unaccented(letter) {
            folded.push(plain);
        } else if letter.is_ascii_alphanumeric() {
            folded.push(letter);
        } else if !is_combining_mark(letter) {
            push_separator(&mut folded);
        }
    }
    folded.trim().to_string()
}

fn push_separator(folded: &mut String) {
    if !folded.ends_with(' ') {
        folded.push(' ');
    }
}

fn is_combining_mark(letter: char) -> bool {
    ('\u{0300}'..='\u{036F}').contains(&letter)
}

const ACCENT_GROUPS: [(char, &str); 8] = [
    ('a', "àáảãạăằắẳẵặâầấẩẫậ"),
    ('e', "èéẻẽẹêềếểễệ"),
    ('i', "ìíỉĩị"),
    ('o', "òóỏõọôồốổỗộơờớởỡợ"),
    ('u', "ùúủũụưừứửữự"),
    ('y', "ỳýỷỹỵ"),
    ('d', "đ"),
    ('c', "ç"),
];

fn unaccented(letter: char) -> Option<char> {
    ACCENT_GROUPS.iter().find(|(_, accented)| accented.contains(letter)).map(|(plain, _)| *plain)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accents_and_case_are_removed_from_vietnamese_text() {
        assert_eq!(fold_text("Số TIỀN"), "so tien");
        assert_eq!(fold_text("Đường Nguyễn Huệ"), "duong nguyen hue");
        assert_eq!(fold_text("Nội dung giao dịch"), "noi dung giao dich");
    }

    #[test]
    fn punctuation_and_repeated_spaces_become_one_space() {
        assert_eq!(fold_text("  Số tiền (VNĐ)  "), "so tien vnd");
        assert_eq!(fold_text("GRAB*TRIP-123"), "grab trip 123");
        assert_eq!(fold_text("Ghi   nợ"), "ghi no");
    }

    #[test]
    fn decomposed_accents_fold_like_precomposed_ones() {
        assert_eq!(fold_text("Pho\u{0309}"), "pho");
        assert_eq!(fold_text("Hoa\u{0301} đơn"), "hoa don");
    }

    #[test]
    fn empty_and_symbol_only_text_fold_to_nothing() {
        assert_eq!(fold_text(""), "");
        assert_eq!(fold_text(" -- "), "");
    }
}
