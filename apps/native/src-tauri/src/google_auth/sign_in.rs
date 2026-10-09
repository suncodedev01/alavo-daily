use std::time::Duration;

use super::authorization::{authorization_url, AuthorizationRequest};
use super::config::OAuthClient;
use super::error::AuthError;
use super::loopback::LoopbackServer;
use super::pkce::{generate_pkce, random_token, Pkce};
use super::tokens::{exchange_code, CodeExchange, TokenGrant};

/// Everything one sign-in needs between opening the browser and getting tokens back.
pub struct SignInAttempt {
    pkce: Pkce,
    state: String,
    server: LoopbackServer,
    redirect_uri: String,
}

impl SignInAttempt {
    pub fn start() -> Result<Self, AuthError> {
        let server = LoopbackServer::bind().map_err(|_| AuthError::Internal)?;
        let redirect_uri = server.redirect_uri()?;
        Ok(Self { pkce: generate_pkce()?, state: random_token()?, server, redirect_uri })
    }

    pub fn authorization_url(&self, client: &OAuthClient) -> Result<String, AuthError> {
        authorization_url(&AuthorizationRequest {
            client_id: client.client_id,
            redirect_uri: &self.redirect_uri,
            code_challenge: &self.pkce.challenge,
            state: &self.state,
        })
    }

    pub fn wait_and_exchange(self, client: &OAuthClient, timeout: Duration) -> Result<TokenGrant, AuthError> {
        let code = self.server.wait_for_code(&self.state, timeout)?;
        let exchange =
            CodeExchange { code: &code, verifier: &self.pkce.verifier, redirect_uri: &self.redirect_uri };
        exchange_code(client, &exchange)
    }
}
