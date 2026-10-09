use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use sha2::{Digest, Sha256};

use super::error::AuthError;

const RANDOM_BYTES: usize = 32;

pub struct Pkce {
    pub verifier: String,
    pub challenge: String,
}

pub fn generate_pkce() -> Result<Pkce, AuthError> {
    let verifier = random_token()?;
    let challenge = challenge_for(&verifier);
    Ok(Pkce { verifier, challenge })
}

pub fn challenge_for(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

pub fn random_token() -> Result<String, AuthError> {
    let mut bytes = [0u8; RANDOM_BYTES];
    getrandom::fill(&mut bytes).map_err(|_| AuthError::Internal)?;
    Ok(URL_SAFE_NO_PAD.encode(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn challenge_matches_the_rfc_7636_example() {
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        assert_eq!(challenge_for(verifier), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    }

    #[test]
    fn verifier_is_long_enough_and_uses_only_url_safe_characters() {
        let pkce = generate_pkce().expect("random bytes are available");
        assert!((43..=128).contains(&pkce.verifier.len()));
        assert!(pkce.verifier.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'));
        assert_eq!(pkce.challenge, challenge_for(&pkce.verifier));
    }

    #[test]
    fn two_tokens_differ() {
        assert_ne!(random_token(), random_token());
    }
}
