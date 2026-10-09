const LINE_BREAKERS: &[&str] = &["<br>", "<br/>", "<br />", "</p>", "</li>", "</div>"];

/// Plain text of a possibly HTML-flavoured string: tags removed, common entities decoded,
/// whitespace collapsed.
pub fn clean_text(raw: &str) -> String {
    let without_tags = strip_tags(raw);
    let decoded = decode_entities(&without_tags);
    decoded.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Non-empty cleaned lines. Paragraph and line-break tags count as line breaks.
pub fn clean_lines(raw: &str) -> Vec<String> {
    let mut spaced = raw.to_string();
    for breaker in LINE_BREAKERS {
        spaced = spaced.replace(breaker, "\n");
    }
    let lines = spaced.lines().map(clean_text);
    lines.filter(|line| !line.is_empty()).collect()
}

/// The first run of digits in `text` as a number, ignoring everything around it.
pub fn first_integer(text: &str) -> Option<i64> {
    let start = text.find(|symbol: char| symbol.is_ascii_digit())?;
    let digits: String = text[start..].chars().take_while(char::is_ascii_digit).collect();
    digits.parse().ok()
}

fn strip_tags(raw: &str) -> String {
    let mut text = String::with_capacity(raw.len());
    let mut inside_tag = false;
    for symbol in raw.chars() {
        match symbol {
            '<' => inside_tag = true,
            '>' if inside_tag => {
                inside_tag = false;
                text.push(' ');
            }
            _ if !inside_tag => text.push(symbol),
            _ => {}
        }
    }
    text
}

fn decode_entities(text: &str) -> String {
    let mut decoded = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(start) = rest.find('&') {
        decoded.push_str(&rest[..start]);
        let tail = &rest[start..];
        match tail.find(';').and_then(|end| entity_symbol(&tail[1..end]).map(|s| (s, end))) {
            Some((symbol, end)) => {
                decoded.push(symbol);
                rest = &tail[end + 1..];
            }
            None => {
                decoded.push('&');
                rest = &tail[1..];
            }
        }
    }
    decoded.push_str(rest);
    decoded
}

fn entity_symbol(name: &str) -> Option<char> {
    match name {
        "amp" => Some('&'),
        "lt" => Some('<'),
        "gt" => Some('>'),
        "quot" => Some('"'),
        "apos" => Some('\''),
        "nbsp" => Some(' '),
        _ => numeric_entity(name),
    }
}

fn numeric_entity(name: &str) -> Option<char> {
    let digits = name.strip_prefix('#')?;
    let code = match digits.strip_prefix(['x', 'X']) {
        Some(hex) => u32::from_str_radix(hex, 16).ok()?,
        None => digits.parse().ok()?,
    };
    char::from_u32(code)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn removes_tags_and_collapses_whitespace() {
        assert_eq!(clean_text("<p>Rửa   gà,\n chặt <b>miếng</b> vừa</p>"), "Rửa gà, chặt miếng vừa");
    }

    #[test]
    fn decodes_named_and_numeric_entities() {
        assert_eq!(clean_text("Tom &amp; Jerry&#39;s &quot;best&quot; &#x26; more"), "Tom & Jerry's \"best\" & more");
        assert_eq!(clean_text("a&nbsp;b &lt;c&gt;"), "a b <c>");
    }

    #[test]
    fn keeps_an_ampersand_that_is_not_an_entity() {
        assert_eq!(clean_text("salt & pepper & &bogus; &#xZZ;"), "salt & pepper & &bogus; &#xZZ;");
    }

    #[test]
    fn a_trailing_ampersand_survives() {
        assert_eq!(clean_text("fish &"), "fish &");
    }

    #[test]
    fn splits_html_paragraphs_and_plain_lines_into_clean_lines() {
        let lines = clean_lines("<p>Bước một</p><p>Bước   hai</p>\n\nBước ba<br/>Bước bốn");
        assert_eq!(lines, ["Bước một", "Bước hai", "Bước ba", "Bước bốn"]);
    }

    #[test]
    fn no_lines_for_blank_text() {
        assert!(clean_lines("  \n <p></p> ").is_empty());
    }

    #[test]
    fn first_integer_finds_the_first_digit_run() {
        assert_eq!(first_integer("4 servings"), Some(4));
        assert_eq!(first_integer("Serves 6-8"), Some(6));
        assert_eq!(first_integer("270 kcal"), Some(270));
        assert_eq!(first_integer("many"), None);
    }
}
