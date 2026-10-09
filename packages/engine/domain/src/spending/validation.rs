use crate::shared::error::EngineError;
use crate::shared::money::Money;

pub fn required_text(field: &str, value: &str) -> Result<String, EngineError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(EngineError::validation(format!("{field} must not be empty")));
    }
    Ok(trimmed.to_string())
}

pub fn updated_text(
    field: &str,
    new_value: Option<&str>,
    current: String,
) -> Result<String, EngineError> {
    match new_value {
        Some(value) => required_text(field, value),
        None => Ok(current),
    }
}

pub fn positive_amount(field: &str, amount: Money) -> Result<Money, EngineError> {
    if amount.vnd() <= 0 {
        return Err(EngineError::validation(format!("{field} must be greater than zero")));
    }
    Ok(amount)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn required_text_trims_and_rejects_blank() {
        assert_eq!(required_text("name", "  Ăn  ").unwrap(), "Ăn");
        assert!(required_text("name", "   ").is_err());
        assert!(required_text("name", "").is_err());
    }

    #[test]
    fn updated_text_keeps_current_when_absent_and_validates_when_given() {
        assert_eq!(updated_text("name", None, "cũ".into()).unwrap(), "cũ");
        assert_eq!(updated_text("name", Some(" mới "), "cũ".into()).unwrap(), "mới");
        assert!(updated_text("name", Some(" "), "cũ".into()).is_err());
    }

    #[test]
    fn positive_amount_rejects_zero_and_negative() {
        assert!(positive_amount("amount", Money(1)).is_ok());
        assert!(positive_amount("amount", Money(0)).is_err());
        assert!(positive_amount("amount", Money(-5)).is_err());
    }
}
