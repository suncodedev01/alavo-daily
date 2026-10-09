use std::fmt;

use serde::ser::{Serialize, Serializer};

use crate::command_error::serialize_code_and_message;

#[derive(Debug, PartialEq, Eq)]
pub enum AuthError {
    NotConfigured,
    BrowserUnavailable,
    TimedOut,
    AccessDenied,
    Network,
    InvalidResponse,
    Storage,
    Internal,
}

impl AuthError {
    fn code(&self) -> &'static str {
        match self {
            Self::NotConfigured => "not_configured",
            Self::BrowserUnavailable => "browser_unavailable",
            Self::TimedOut => "timed_out",
            Self::AccessDenied => "access_denied",
            Self::Network => "network",
            Self::InvalidResponse => "invalid_response",
            Self::Storage => "storage",
            Self::Internal => "internal",
        }
    }
}

impl fmt::Display for AuthError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::NotConfigured => "This build has no Google sign-in credentials",
            Self::BrowserUnavailable => "Could not open the system browser",
            Self::TimedOut => "Sign-in was not finished in time",
            Self::AccessDenied => "Google sign-in was cancelled or refused",
            Self::Network => "Could not reach Google",
            Self::InvalidResponse => "Google sent an answer the app could not read",
            Self::Storage => "Could not read or write the saved sign-in",
            Self::Internal => "Sign-in failed unexpectedly",
        };
        formatter.write_str(message)
    }
}

impl Serialize for AuthError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serialize_code_and_message(serializer, self.code(), &self.to_string())
    }
}
