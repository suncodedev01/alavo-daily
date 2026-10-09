use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use super::error::AuthError;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct StoredCredentials {
    pub refresh_token: String,
    pub email: Option<String>,
}

pub trait CredentialStore: Send + Sync {
    fn load(&self) -> Result<Option<StoredCredentials>, AuthError>;
    fn save(&self, credentials: &StoredCredentials) -> Result<(), AuthError>;
    fn clear(&self) -> Result<(), AuthError>;
}

/// Keeps the sign-in for this run only. Used where the platform has no keystore binding.
#[derive(Default)]
#[cfg_attr(any(windows, target_os = "macos", target_os = "ios", target_os = "linux"), allow(dead_code))]
pub struct MemoryStore {
    held: Mutex<Option<StoredCredentials>>,
}

impl CredentialStore for MemoryStore {
    fn load(&self) -> Result<Option<StoredCredentials>, AuthError> {
        Ok(self.held.lock().map_err(|_| AuthError::Storage)?.clone())
    }

    fn save(&self, credentials: &StoredCredentials) -> Result<(), AuthError> {
        *self.held.lock().map_err(|_| AuthError::Storage)? = Some(credentials.clone());
        Ok(())
    }

    fn clear(&self) -> Result<(), AuthError> {
        *self.held.lock().map_err(|_| AuthError::Storage)? = None;
        Ok(())
    }
}

#[cfg(any(windows, target_os = "macos", target_os = "ios", target_os = "linux"))]
mod keystore {
    use keyring::Entry;

    use super::{AuthError, CredentialStore, StoredCredentials};

    const SERVICE: &str = "app.alavo.daily";
    const ACCOUNT: &str = "google-drive";

    /// The operating system keystore: Credential Manager, Keychain or Secret Service.
    pub struct KeystoreStore;

    impl KeystoreStore {
        fn entry() -> Result<Entry, AuthError> {
            Entry::new(SERVICE, ACCOUNT).map_err(|_| AuthError::Storage)
        }
    }

    impl CredentialStore for KeystoreStore {
        fn load(&self) -> Result<Option<StoredCredentials>, AuthError> {
            match Self::entry()?.get_password() {
                Ok(secret) => serde_json::from_str(&secret).map(Some).map_err(|_| AuthError::Storage),
                Err(keyring::Error::NoEntry) => Ok(None),
                Err(_) => Err(AuthError::Storage),
            }
        }

        fn save(&self, credentials: &StoredCredentials) -> Result<(), AuthError> {
            let secret = serde_json::to_string(credentials).map_err(|_| AuthError::Storage)?;
            Self::entry()?.set_password(&secret).map_err(|_| AuthError::Storage)
        }

        fn clear(&self) -> Result<(), AuthError> {
            match Self::entry()?.delete_credential() {
                Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
                Err(_) => Err(AuthError::Storage),
            }
        }
    }
}

#[cfg(any(windows, target_os = "macos", target_os = "ios", target_os = "linux"))]
pub fn platform_store() -> Box<dyn CredentialStore> {
    Box::new(keystore::KeystoreStore)
}

#[cfg(not(any(windows, target_os = "macos", target_os = "ios", target_os = "linux")))]
pub fn platform_store() -> Box<dyn CredentialStore> {
    Box::new(MemoryStore::default())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn credentials() -> StoredCredentials {
        StoredCredentials { refresh_token: "r1".into(), email: Some("a@example.com".into()) }
    }

    #[test]
    fn memory_store_starts_empty() {
        assert_eq!(MemoryStore::default().load(), Ok(None));
    }

    #[test]
    fn memory_store_returns_what_was_saved_until_cleared() {
        let store = MemoryStore::default();
        store.save(&credentials()).expect("saves");
        assert_eq!(store.load(), Ok(Some(credentials())));
        store.clear().expect("clears");
        assert_eq!(store.load(), Ok(None));
    }
}
