//! A recipe photo is a small image kept as a data URL, so it lives in SQLite with the rest of
//! the recipe and travels with the sync.

use crate::shared::error::EngineError;

pub const MAX_PHOTO_BYTES: usize = 400 * 1024;

const IMAGE_PREFIX: &str = "data:image/";
const BASE64_MARKER: &str = ";base64,";
const IMAGE_KINDS: &[&str] = &["jpeg", "png", "webp", "gif"];

/// Checks that `data_url` is a base64 image data URL no larger than [`MAX_PHOTO_BYTES`] and
/// returns it trimmed.
pub fn validate_photo(data_url: &str) -> Result<String, EngineError> {
    let data_url = data_url.trim();
    if data_url.len() > MAX_PHOTO_BYTES {
        return Err(EngineError::validation(format!(
            "photo is larger than {} KB",
            MAX_PHOTO_BYTES / 1024
        )));
    }
    let (kind, payload) = split_image_data_url(data_url)?;
    if !IMAGE_KINDS.contains(&kind) || !is_base64(payload) {
        return Err(not_an_image());
    }
    Ok(data_url.to_string())
}

fn split_image_data_url(data_url: &str) -> Result<(&str, &str), EngineError> {
    let rest = data_url.strip_prefix(IMAGE_PREFIX).ok_or_else(not_an_image)?;
    rest.split_once(BASE64_MARKER).ok_or_else(not_an_image)
}

fn is_base64(payload: &str) -> bool {
    let is_base64_char =
        |byte: u8| byte.is_ascii_alphanumeric() || matches!(byte, b'+' | b'/' | b'=');
    !payload.is_empty() && payload.bytes().all(is_base64_char)
}

fn not_an_image() -> EngineError {
    EngineError::validation("photo must be a base64 image data URL")
}

#[cfg(test)]
mod tests {
    use super::*;

    const TINY_JPEG: &str = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";

    #[test]
    fn a_base64_image_data_url_is_accepted() {
        assert_eq!(validate_photo(TINY_JPEG).unwrap(), TINY_JPEG);
        assert!(validate_photo("data:image/png;base64,iVBORw0KGgo=").is_ok());
        assert!(validate_photo("data:image/webp;base64,UklGRg==").is_ok());
    }

    #[test]
    fn surrounding_whitespace_is_trimmed() {
        assert_eq!(validate_photo(&format!("  {TINY_JPEG}\n")).unwrap(), TINY_JPEG);
    }

    #[test]
    fn text_that_is_not_a_data_url_is_rejected() {
        assert!(validate_photo("").is_err());
        assert!(validate_photo("https://example.com/a.jpg").is_err());
        assert!(validate_photo("data:text/html;base64,PGgxPg==").is_err());
    }

    #[test]
    fn an_image_type_the_app_does_not_show_is_rejected() {
        assert!(validate_photo("data:image/svg+xml;base64,PHN2Zz4=").is_err());
    }

    #[test]
    fn a_data_url_without_base64_payload_is_rejected() {
        assert!(validate_photo("data:image/jpeg;base64,").is_err());
        assert!(validate_photo("data:image/jpeg,/9j/4AAQ").is_err());
        assert!(validate_photo("data:image/jpeg;base64,not base64!").is_err());
    }

    #[test]
    fn the_size_limit_is_inclusive() {
        let header = "data:image/jpeg;base64,";
        let at_limit = format!("{header}{}", "A".repeat(MAX_PHOTO_BYTES - header.len()));
        assert!(validate_photo(&at_limit).is_ok());
        assert!(validate_photo(&format!("{at_limit}A")).is_err());
    }
}
