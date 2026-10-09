use std::time::Duration;

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use serde::Deserialize;
use ureq::Agent;

use super::config::OAuthClient;
use super::error::AuthError;

const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT: &str = "https://oauth2.googleapis.com/revoke";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, PartialEq, Eq)]
pub struct TokenGrant {
    pub access_token: String,
    pub lifetime: Duration,
    pub refresh_token: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum TokenFailure {
    GrantRevoked,
    Rejected,
    Malformed,
}

pub struct CodeExchange<'a> {
    pub code: &'a str,
    pub verifier: &'a str,
    pub redirect_uri: &'a str,
}

#[derive(Deserialize)]
struct TokenBody {
    access_token: String,
    expires_in: u64,
    refresh_token: Option<String>,
    id_token: Option<String>,
}

#[derive(Deserialize)]
struct ErrorBody {
    error: String,
}

#[derive(Deserialize)]
struct IdTokenClaims {
    email: Option<String>,
}

pub fn parse_token_response(status: u16, body: &str) -> Result<TokenGrant, TokenFailure> {
    if status >= 400 {
        return Err(failure_from_error_body(body));
    }
    let parsed: TokenBody = serde_json::from_str(body).map_err(|_| TokenFailure::Malformed)?;
    Ok(TokenGrant {
        access_token: parsed.access_token,
        lifetime: Duration::from_secs(parsed.expires_in),
        refresh_token: parsed.refresh_token,
        email: parsed.id_token.as_deref().and_then(email_from_id_token),
    })
}

fn failure_from_error_body(body: &str) -> TokenFailure {
    match serde_json::from_str::<ErrorBody>(body) {
        Ok(error) if error.error == "invalid_grant" => TokenFailure::GrantRevoked,
        _ => TokenFailure::Rejected,
    }
}

/// The token comes straight from Google over TLS, so its signature is not checked here.
pub fn email_from_id_token(id_token: &str) -> Option<String> {
    let payload = id_token.split('.').nth(1)?;
    let bytes = URL_SAFE_NO_PAD.decode(payload.trim_end_matches('=')).ok()?;
    serde_json::from_slice::<IdTokenClaims>(&bytes).ok()?.email
}

pub fn exchange_code(client: &OAuthClient, exchange: &CodeExchange) -> Result<TokenGrant, AuthError> {
    let form = [
        ("grant_type", "authorization_code"),
        ("code", exchange.code),
        ("code_verifier", exchange.verifier),
        ("redirect_uri", exchange.redirect_uri),
        ("client_id", client.client_id),
        ("client_secret", client.client_secret),
    ];
    parse_or_fail(post_form(TOKEN_ENDPOINT, &form)?)
}

/// Returns Ok(None) when Google says the refresh token no longer works.
pub fn refresh_access_token(client: &OAuthClient, refresh_token: &str) -> Result<Option<TokenGrant>, AuthError> {
    let form = [
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
        ("client_id", client.client_id),
        ("client_secret", client.client_secret),
    ];
    let (status, body) = post_form(TOKEN_ENDPOINT, &form)?;
    match parse_token_response(status, &body) {
        Ok(grant) => Ok(Some(grant)),
        Err(TokenFailure::GrantRevoked) => Ok(None),
        Err(failure) => Err(error_for(failure)),
    }
}

pub fn revoke(token: &str) -> Result<(), AuthError> {
    let (status, _) = post_form(REVOKE_ENDPOINT, &[("token", token)])?;
    if status >= 400 { Err(AuthError::InvalidResponse) } else { Ok(()) }
}

fn parse_or_fail((status, body): (u16, String)) -> Result<TokenGrant, AuthError> {
    parse_token_response(status, &body).map_err(error_for)
}

fn error_for(failure: TokenFailure) -> AuthError {
    match failure {
        TokenFailure::GrantRevoked | TokenFailure::Rejected => AuthError::AccessDenied,
        TokenFailure::Malformed => AuthError::InvalidResponse,
    }
}

fn post_form(url: &str, form: &[(&str, &str)]) -> Result<(u16, String), AuthError> {
    let config = Agent::config_builder()
        .timeout_global(Some(REQUEST_TIMEOUT))
        .http_status_as_error(false)
        .build();
    let mut response = Agent::new_with_config(config)
        .post(url)
        .send_form(form.iter().copied())
        .map_err(|_| AuthError::Network)?;
    let status = response.status().as_u16();
    let body = response.body_mut().read_to_string().map_err(|_| AuthError::Network)?;
    Ok((status, body))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn id_token(claims: &str) -> String {
        format!("header.{}.signature", URL_SAFE_NO_PAD.encode(claims))
    }

    #[test]
    fn reads_tokens_and_the_account_email() {
        let body = format!(
            r#"{{"access_token":"at","expires_in":3599,"refresh_token":"rt","id_token":"{}","scope":"x"}}"#,
            id_token(r#"{"email":"an@example.com","sub":"1"}"#)
        );
        let grant = parse_token_response(200, &body).expect("valid response");
        assert_eq!(grant.access_token, "at");
        assert_eq!(grant.lifetime, Duration::from_secs(3599));
        assert_eq!(grant.refresh_token.as_deref(), Some("rt"));
        assert_eq!(grant.email.as_deref(), Some("an@example.com"));
    }

    #[test]
    fn a_refresh_response_has_no_refresh_token_or_email() {
        let grant = parse_token_response(200, r#"{"access_token":"at","expires_in":60}"#).expect("valid");
        assert_eq!(grant.refresh_token, None);
        assert_eq!(grant.email, None);
    }

    #[test]
    fn invalid_grant_means_the_sign_in_was_revoked() {
        let body = r#"{"error":"invalid_grant","error_description":"Token has been expired or revoked."}"#;
        assert_eq!(parse_token_response(400, body), Err(TokenFailure::GrantRevoked));
    }

    #[test]
    fn other_error_answers_are_rejections() {
        assert_eq!(parse_token_response(401, r#"{"error":"invalid_client"}"#), Err(TokenFailure::Rejected));
        assert_eq!(parse_token_response(500, "oops"), Err(TokenFailure::Rejected));
    }

    #[test]
    fn a_success_without_a_token_is_malformed() {
        assert_eq!(parse_token_response(200, r#"{"expires_in":60}"#), Err(TokenFailure::Malformed));
        assert_eq!(parse_token_response(200, "not json"), Err(TokenFailure::Malformed));
    }

    #[test]
    fn email_is_missing_when_the_id_token_is_unusable() {
        assert_eq!(email_from_id_token("no-dots"), None);
        assert_eq!(email_from_id_token("a.%%%.c"), None);
        assert_eq!(email_from_id_token(&id_token(r#"{"sub":"1"}"#)), None);
        assert_eq!(email_from_id_token(&id_token("not json")), None);
    }

    #[test]
    fn email_decoding_tolerates_padding() {
        let padded = format!("h.{}==.s", URL_SAFE_NO_PAD.encode(r#"{"email":"b@example.com"}"#));
        assert_eq!(email_from_id_token(&padded).as_deref(), Some("b@example.com"));
    }
}
