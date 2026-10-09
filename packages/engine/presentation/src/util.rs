use alavo_domain::shared::error::EngineError;
use serde::de::DeserializeOwned;
use serde::Serialize;

/// The result of one command: a JSON string, or `None` when this module does not own it.
pub type Handled = Option<Result<String, EngineError>>;

pub fn respond<T: Serialize>(result: Result<T, EngineError>) -> Result<String, EngineError> {
    result.and_then(|value| serde_json::to_string(&value).map_err(EngineError::from))
}

/// Parses the payload into `I`, runs `work`, and serialises the result. An empty payload is
/// read as `{}` so commands whose inputs are all optional can be called with nothing.
pub fn with_input<I, T>(
    payload: &str,
    work: impl FnOnce(I) -> Result<T, EngineError>,
) -> Result<String, EngineError>
where
    I: DeserializeOwned,
    T: Serialize,
{
    let text = if payload.trim().is_empty() { "{}" } else { payload };
    let input: I = serde_json::from_str(text)?;
    respond(work(input))
}
