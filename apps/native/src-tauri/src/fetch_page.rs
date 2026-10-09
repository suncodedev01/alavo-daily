use std::fmt;
use std::io::{self, Read};
use std::time::Duration;

use serde::ser::{Serialize, Serializer};
use ureq::config::Config;
use ureq::unversioned::resolver::{DefaultResolver, ResolvedSocketAddrs, Resolver};
use ureq::unversioned::transport::{DefaultConnector, NextTimeout};
use ureq::Agent;

use crate::address_guard::{is_public_address, parse_public_url, UrlRejection};
use crate::command_error::serialize_code_and_message;

const MAX_BODY_BYTES: u64 = 2 * 1024 * 1024;
const MAX_REDIRECTS: u32 = 5;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
const BROWSER_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
    (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const BLOCKED_ADDRESS_MARKER: &str = "address not allowed";

#[derive(Debug, PartialEq, Eq)]
pub enum FetchPageError {
    InvalidUrl,
    UnsupportedScheme,
    BlockedAddress,
    Timeout,
    TooLarge,
    Status(u16),
    Network,
}

impl FetchPageError {
    fn code(&self) -> &'static str {
        match self {
            Self::InvalidUrl => "invalid_url",
            Self::UnsupportedScheme => "unsupported_scheme",
            Self::BlockedAddress => "blocked_address",
            Self::Timeout => "timeout",
            Self::TooLarge => "too_large",
            Self::Status(_) => "http_status",
            Self::Network => "network",
        }
    }
}

impl fmt::Display for FetchPageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidUrl => write!(formatter, "The link is not a valid web address"),
            Self::UnsupportedScheme => write!(formatter, "Only http and https links can be opened"),
            Self::BlockedAddress => write!(formatter, "This address points to a private network"),
            Self::Timeout => write!(formatter, "The site took too long to answer"),
            Self::TooLarge => write!(formatter, "The page is larger than 2 MB"),
            Self::Status(status) => write!(formatter, "The site answered with status {status}"),
            Self::Network => write!(formatter, "Could not reach the site"),
        }
    }
}

impl Serialize for FetchPageError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serialize_code_and_message(serializer, self.code(), &self.to_string())
    }
}

impl From<UrlRejection> for FetchPageError {
    fn from(rejection: UrlRejection) -> Self {
        match rejection {
            UrlRejection::NotAUrl | UrlRejection::MissingHost => Self::InvalidUrl,
            UrlRejection::UnsupportedScheme => Self::UnsupportedScheme,
            UrlRejection::BlockedAddress => Self::BlockedAddress,
        }
    }
}

impl From<ureq::Error> for FetchPageError {
    fn from(error: ureq::Error) -> Self {
        match error {
            ureq::Error::StatusCode(status) => Self::Status(status),
            ureq::Error::Timeout(_) => Self::Timeout,
            ureq::Error::BodyExceedsLimit(_) => Self::TooLarge,
            ureq::Error::Io(io_error) if is_blocked_address_error(&io_error) => Self::BlockedAddress,
            _ => Self::Network,
        }
    }
}

#[tauri::command]
pub async fn fetch_page(url: String) -> Result<String, FetchPageError> {
    tauri::async_runtime::spawn_blocking(move || download_page(&url))
        .await
        .map_err(|_| FetchPageError::Network)?
}

fn download_page(url: &str) -> Result<String, FetchPageError> {
    let url = parse_public_url(url)?;
    let mut response = guarded_agent().get(url.as_str()).call()?;
    let body = read_limited(response.body_mut().as_reader(), MAX_BODY_BYTES)?;
    Ok(String::from_utf8_lossy(&body).into_owned())
}

fn guarded_agent() -> Agent {
    let config = Config::builder()
        .timeout_global(Some(REQUEST_TIMEOUT))
        .max_redirects(MAX_REDIRECTS)
        .user_agent(BROWSER_USER_AGENT)
        .build();
    Agent::with_parts(config, DefaultConnector::default(), PublicAddressResolver)
}

fn read_limited(reader: impl Read, max_bytes: u64) -> Result<Vec<u8>, FetchPageError> {
    let mut body = Vec::new();
    reader.take(max_bytes + 1).read_to_end(&mut body).map_err(|_| FetchPageError::Network)?;
    if body.len() as u64 > max_bytes {
        return Err(FetchPageError::TooLarge);
    }
    Ok(body)
}

fn is_blocked_address_error(error: &io::Error) -> bool {
    error.kind() == io::ErrorKind::PermissionDenied && error.to_string() == BLOCKED_ADDRESS_MARKER
}

/// Checks every address at connect time, so redirects and DNS answers cannot reach a private network.
#[derive(Debug)]
struct PublicAddressResolver;

impl Resolver for PublicAddressResolver {
    fn resolve(
        &self,
        uri: &ureq::http::Uri,
        config: &Config,
        timeout: NextTimeout,
    ) -> Result<ResolvedSocketAddrs, ureq::Error> {
        let resolved = DefaultResolver::default().resolve(uri, config, timeout)?;
        let mut allowed = self.empty();
        for address in resolved.iter().filter(|address| is_public_address(address.ip())) {
            allowed.push(*address);
        }
        if allowed.is_empty() {
            let blocked = io::Error::new(io::ErrorKind::PermissionDenied, BLOCKED_ADDRESS_MARKER);
            return Err(ureq::Error::Io(blocked));
        }
        Ok(allowed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_body_that_fits_the_limit() {
        let body = read_limited(&b"<html></html>"[..], 100);
        assert_eq!(body, Ok(b"<html></html>".to_vec()));
    }

    #[test]
    fn accepts_a_body_exactly_at_the_limit() {
        let body = read_limited(&[b'a'; 10][..], 10).expect("fits the limit");
        assert_eq!(body.len(), 10);
    }

    #[test]
    fn refuses_a_body_one_byte_over_the_limit() {
        assert_eq!(read_limited(&[b'a'; 11][..], 10), Err(FetchPageError::TooLarge));
    }

    #[test]
    fn stops_reading_an_endless_body() {
        let endless = io::repeat(b'a');
        assert_eq!(read_limited(endless, 1024), Err(FetchPageError::TooLarge));
    }

    #[test]
    fn refuses_private_addresses_before_any_request() {
        assert_eq!(download_page("http://127.0.0.1:9/"), Err(FetchPageError::BlockedAddress));
        assert_eq!(download_page("http://localhost/"), Err(FetchPageError::BlockedAddress));
        assert_eq!(download_page("file:///etc/passwd"), Err(FetchPageError::UnsupportedScheme));
        assert_eq!(download_page("not a link"), Err(FetchPageError::InvalidUrl));
    }

    #[test]
    fn resolver_rejects_a_host_that_only_has_private_addresses() {
        let uri: ureq::http::Uri = "http://127.0.0.1:9/".parse().expect("uri parses");
        let timeout = NextTimeout { after: Duration::from_secs(5).into(), reason: ureq::Timeout::Global };
        let result = PublicAddressResolver.resolve(&uri, &Config::default(), timeout);
        match result {
            Err(ureq::Error::Io(error)) => assert!(is_blocked_address_error(&error)),
            other => panic!("expected the blocked-address error, got {other:?}"),
        }
    }

    #[test]
    fn serializes_the_error_with_a_code_and_a_message() {
        let json = serde_json::to_value(FetchPageError::Status(404)).expect("serializes");
        assert_eq!(json["code"], "http_status");
        assert_eq!(json["message"], "The site answered with status 404");
    }

    #[test]
    fn maps_ureq_failures_to_typed_errors() {
        assert_eq!(FetchPageError::from(ureq::Error::StatusCode(503)), FetchPageError::Status(503));
        assert_eq!(FetchPageError::from(ureq::Error::HostNotFound), FetchPageError::Network);
    }
}
