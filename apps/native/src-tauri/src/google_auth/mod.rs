mod authorization;
mod config;
mod credentials;
mod error;
mod loopback;
mod pkce;
mod sign_in;
mod tokens;

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Runtime, State};
use tauri_plugin_opener::OpenerExt;

use self::config::{build_time_client, OAuthClient};
use self::credentials::{platform_store, CredentialStore, StoredCredentials};
use self::error::AuthError;
use self::sign_in::SignInAttempt;
use self::tokens::{refresh_access_token, revoke, TokenGrant};

const SIGN_IN_TIMEOUT: Duration = Duration::from_secs(180);
const EXPIRY_MARGIN: Duration = Duration::from_secs(60);

#[derive(Debug, PartialEq, Eq, Serialize)]
pub struct GoogleSession {
    pub email: Option<String>,
}

struct CachedToken {
    value: String,
    expires_at: Instant,
}

struct AuthInner {
    store: Box<dyn CredentialStore>,
    cached: Mutex<Option<CachedToken>>,
}

#[derive(Clone)]
pub struct GoogleAuthState(Arc<AuthInner>);

impl GoogleAuthState {
    pub fn new() -> Self {
        Self::with_store(platform_store())
    }

    fn with_store(store: Box<dyn CredentialStore>) -> Self {
        Self(Arc::new(AuthInner { store, cached: Mutex::new(None) }))
    }

    fn session(&self) -> Result<Option<GoogleSession>, AuthError> {
        let credentials = self.0.store.load()?;
        Ok(credentials.map(|saved| GoogleSession { email: saved.email }))
    }

    fn finish_sign_in(&self, grant: TokenGrant) -> Result<GoogleSession, AuthError> {
        let refresh_token = grant.refresh_token.clone().ok_or(AuthError::InvalidResponse)?;
        self.0.store.save(&StoredCredentials { refresh_token, email: grant.email.clone() })?;
        self.remember_access_token(&grant)?;
        Ok(GoogleSession { email: grant.email })
    }

    fn access_token(&self, client: &OAuthClient) -> Result<Option<String>, AuthError> {
        if let Some(fresh) = self.fresh_cached_token(Instant::now())? {
            return Ok(Some(fresh));
        }
        let Some(credentials) = self.0.store.load()? else {
            return Ok(None);
        };
        match refresh_access_token(client, &credentials.refresh_token)? {
            Some(grant) => self.remember_access_token(&grant).map(|()| Some(grant.access_token)),
            None => self.forget().map(|_| None),
        }
    }

    fn fresh_cached_token(&self, now: Instant) -> Result<Option<String>, AuthError> {
        let cached = self.0.cached.lock().map_err(|_| AuthError::Internal)?;
        Ok(cached
            .as_ref()
            .filter(|token| token.expires_at > now + EXPIRY_MARGIN)
            .map(|token| token.value.clone()))
    }

    fn remember_access_token(&self, grant: &TokenGrant) -> Result<(), AuthError> {
        let expires_at = Instant::now() + grant.lifetime;
        let token = CachedToken { value: grant.access_token.clone(), expires_at };
        *self.0.cached.lock().map_err(|_| AuthError::Internal)? = Some(token);
        Ok(())
    }

    /// Removes the saved sign-in and returns the refresh token it held, if any.
    fn forget(&self) -> Result<Option<String>, AuthError> {
        let saved = self.0.store.load()?;
        self.0.store.clear()?;
        *self.0.cached.lock().map_err(|_| AuthError::Internal)? = None;
        Ok(saved.map(|credentials| credentials.refresh_token))
    }
}

#[tauri::command]
pub async fn google_sign_in<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, GoogleAuthState>,
) -> Result<GoogleSession, AuthError> {
    let client = build_time_client().ok_or(AuthError::NotConfigured)?;
    let auth = state.inner().clone();
    let attempt = SignInAttempt::start()?;
    open_in_browser(&app, &attempt.authorization_url(&client)?)?;
    run_blocking(move || {
        let grant = attempt.wait_and_exchange(&client, SIGN_IN_TIMEOUT)?;
        auth.finish_sign_in(grant)
    })
    .await
}

#[tauri::command]
pub async fn google_session(state: State<'_, GoogleAuthState>) -> Result<Option<GoogleSession>, AuthError> {
    state.session()
}

#[tauri::command]
pub async fn google_access_token(state: State<'_, GoogleAuthState>) -> Result<Option<String>, AuthError> {
    let Some(client) = build_time_client() else {
        return Ok(None);
    };
    let auth = state.inner().clone();
    run_blocking(move || auth.access_token(&client)).await
}

#[tauri::command]
pub async fn google_sign_out(state: State<'_, GoogleAuthState>) -> Result<(), AuthError> {
    let auth = state.inner().clone();
    run_blocking(move || {
        if let Some(refresh_token) = auth.forget()? {
            try_revoke_remotely(&refresh_token);
        }
        Ok(())
    })
    .await
}

fn try_revoke_remotely(refresh_token: &str) {
    let _ = revoke(refresh_token);
}

fn open_in_browser<R: Runtime>(app: &AppHandle<R>, url: &str) -> Result<(), AuthError> {
    app.opener().open_url(url, None::<&str>).map_err(|_| AuthError::BrowserUnavailable)
}

async fn run_blocking<T, F>(work: F) -> Result<T, AuthError>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, AuthError> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work).await.map_err(|_| AuthError::Internal)?
}

#[cfg(test)]
mod tests {
    use super::credentials::MemoryStore;
    use super::*;

    fn state_with_saved_sign_in() -> GoogleAuthState {
        let store = MemoryStore::default();
        let saved = StoredCredentials { refresh_token: "rt".into(), email: Some("a@example.com".into()) };
        store.save(&saved).expect("saves");
        GoogleAuthState::with_store(Box::new(store))
    }

    fn empty_state() -> GoogleAuthState {
        GoogleAuthState::with_store(Box::new(MemoryStore::default()))
    }

    fn grant(refresh_token: Option<&str>, lifetime_seconds: u64) -> TokenGrant {
        TokenGrant {
            access_token: "at".into(),
            lifetime: Duration::from_secs(lifetime_seconds),
            refresh_token: refresh_token.map(String::from),
            email: Some("a@example.com".into()),
        }
    }

    #[test]
    fn there_is_no_session_before_signing_in() {
        assert_eq!(empty_state().session(), Ok(None));
    }

    #[test]
    fn the_saved_sign_in_is_the_session() {
        let session = state_with_saved_sign_in().session();
        assert_eq!(session, Ok(Some(GoogleSession { email: Some("a@example.com".into()) })));
    }

    #[test]
    fn finishing_sign_in_saves_the_refresh_token_and_caches_the_access_token() {
        let state = empty_state();
        let session = state.finish_sign_in(grant(Some("rt"), 3600)).expect("signs in");
        assert_eq!(session.email.as_deref(), Some("a@example.com"));
        let saved = state.0.store.load().expect("loads").map(|credentials| credentials.refresh_token);
        assert_eq!(saved.as_deref(), Some("rt"));
        assert_eq!(state.fresh_cached_token(Instant::now()), Ok(Some("at".into())));
    }

    #[test]
    fn finishing_sign_in_needs_a_refresh_token() {
        let state = empty_state();
        assert_eq!(state.finish_sign_in(grant(None, 3600)), Err(AuthError::InvalidResponse));
        assert_eq!(state.session(), Ok(None));
    }

    #[test]
    fn a_token_about_to_expire_is_not_reused() {
        let state = empty_state();
        state.remember_access_token(&grant(None, 30)).expect("caches");
        assert_eq!(state.fresh_cached_token(Instant::now()), Ok(None));
    }

    #[test]
    fn forgetting_returns_the_refresh_token_and_clears_everything() {
        let state = state_with_saved_sign_in();
        state.remember_access_token(&grant(None, 3600)).expect("caches");
        assert_eq!(state.forget(), Ok(Some("rt".to_string())));
        assert_eq!(state.session(), Ok(None));
        assert_eq!(state.fresh_cached_token(Instant::now()), Ok(None));
        assert_eq!(state.forget(), Ok(None));
    }
}
