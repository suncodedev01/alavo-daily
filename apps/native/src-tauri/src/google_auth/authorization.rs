use url::Url;

use super::error::AuthError;

const AUTHORIZATION_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
pub const SCOPES: &str = "https://www.googleapis.com/auth/drive.file openid email";

pub struct AuthorizationRequest<'a> {
    pub client_id: &'a str,
    pub redirect_uri: &'a str,
    pub code_challenge: &'a str,
    pub state: &'a str,
}

#[derive(Debug, PartialEq, Eq)]
pub enum RedirectOutcome {
    Code(String),
    Denied,
    Ignored,
}

pub fn authorization_url(request: &AuthorizationRequest) -> Result<String, AuthError> {
    let parameters = [
        ("client_id", request.client_id),
        ("redirect_uri", request.redirect_uri),
        ("response_type", "code"),
        ("scope", SCOPES),
        ("code_challenge", request.code_challenge),
        ("code_challenge_method", "S256"),
        ("state", request.state),
        ("access_type", "offline"),
        ("prompt", "consent"),
    ];
    Url::parse_with_params(AUTHORIZATION_ENDPOINT, parameters)
        .map(String::from)
        .map_err(|_| AuthError::Internal)
}

/// Reads the first line of the browser's request to the loopback address.
pub fn parse_redirect_request(request: &str, expected_state: &str) -> RedirectOutcome {
    let Some(query) = redirect_query(request) else {
        return RedirectOutcome::Ignored;
    };
    let value_of = |name: &str| {
        query.iter().find(|(key, _)| key == name).map(|(_, value)| value.as_str())
    };
    if value_of("state") != Some(expected_state) {
        return RedirectOutcome::Ignored;
    }
    match (value_of("code"), value_of("error")) {
        (_, Some(_)) => RedirectOutcome::Denied,
        (Some(code), None) if !code.is_empty() => RedirectOutcome::Code(code.to_string()),
        _ => RedirectOutcome::Ignored,
    }
}

fn redirect_query(request: &str) -> Option<Vec<(String, String)>> {
    let mut parts = request.lines().next()?.split_whitespace();
    let (method, target) = (parts.next()?, parts.next()?);
    if method != "GET" {
        return None;
    }
    let url = Url::parse("http://127.0.0.1").ok()?.join(target).ok()?;
    if url.path() != "/" {
        return None;
    }
    Some(url.query_pairs().into_owned().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn query_of(url: &str) -> Vec<(String, String)> {
        Url::parse(url).expect("url parses").query_pairs().into_owned().collect()
    }

    fn value<'a>(query: &'a [(String, String)], name: &str) -> Option<&'a str> {
        query.iter().find(|(key, _)| key == name).map(|(_, v)| v.as_str())
    }

    #[test]
    fn authorization_url_carries_pkce_state_and_the_drive_file_scope() {
        let url = authorization_url(&AuthorizationRequest {
            client_id: "id.apps.googleusercontent.com",
            redirect_uri: "http://127.0.0.1:5000/",
            code_challenge: "challenge",
            state: "state-1",
        })
        .expect("url builds");
        assert!(url.starts_with("https://accounts.google.com/o/oauth2/v2/auth?"));
        let query = query_of(&url);
        assert_eq!(value(&query, "code_challenge_method"), Some("S256"));
        assert_eq!(value(&query, "code_challenge"), Some("challenge"));
        assert_eq!(value(&query, "state"), Some("state-1"));
        assert_eq!(value(&query, "redirect_uri"), Some("http://127.0.0.1:5000/"));
        assert_eq!(value(&query, "response_type"), Some("code"));
        assert_eq!(value(&query, "access_type"), Some("offline"));
        assert_eq!(
            value(&query, "scope"),
            Some("https://www.googleapis.com/auth/drive.file openid email")
        );
    }

    #[test]
    fn reads_the_code_from_a_matching_redirect() {
        let request = "GET /?state=s1&code=4%2F0AbC HTTP/1.1\r\nHost: 127.0.0.1:5000\r\n\r\n";
        assert_eq!(parse_redirect_request(request, "s1"), RedirectOutcome::Code("4/0AbC".into()));
    }

    #[test]
    fn ignores_a_redirect_with_the_wrong_state() {
        let request = "GET /?state=other&code=abc HTTP/1.1\r\n\r\n";
        assert_eq!(parse_redirect_request(request, "s1"), RedirectOutcome::Ignored);
    }

    #[test]
    fn ignores_a_redirect_without_state() {
        assert_eq!(parse_redirect_request("GET /?code=abc HTTP/1.1\r\n\r\n", "s1"), RedirectOutcome::Ignored);
    }

    #[test]
    fn reports_a_refusal_when_google_sends_an_error() {
        let request = "GET /?error=access_denied&state=s1 HTTP/1.1\r\n\r\n";
        assert_eq!(parse_redirect_request(request, "s1"), RedirectOutcome::Denied);
    }

    #[test]
    fn ignores_other_paths_and_methods() {
        assert_eq!(parse_redirect_request("GET /favicon.ico HTTP/1.1\r\n\r\n", "s1"), RedirectOutcome::Ignored);
        assert_eq!(parse_redirect_request("POST /?state=s1&code=a HTTP/1.1\r\n\r\n", "s1"), RedirectOutcome::Ignored);
    }

    #[test]
    fn ignores_garbage_and_empty_codes() {
        assert_eq!(parse_redirect_request("", "s1"), RedirectOutcome::Ignored);
        assert_eq!(parse_redirect_request("\u{0}\u{1}", "s1"), RedirectOutcome::Ignored);
        assert_eq!(parse_redirect_request("GET /?state=s1&code= HTTP/1.1\r\n", "s1"), RedirectOutcome::Ignored);
        assert_eq!(parse_redirect_request("GET /?state=s1 HTTP/1.1\r\n", "s1"), RedirectOutcome::Ignored);
    }
}
