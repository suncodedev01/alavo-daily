const CLIENT_ID: Option<&str> = option_env!("ALAVO_GOOGLE_DESKTOP_CLIENT_ID");
const CLIENT_SECRET: Option<&str> = option_env!("ALAVO_GOOGLE_DESKTOP_CLIENT_SECRET");

#[derive(Clone, Copy)]
pub struct OAuthClient {
    pub client_id: &'static str,
    pub client_secret: &'static str,
}

/// Credentials baked in at build time. None when the build was made without them.
pub fn build_time_client() -> Option<OAuthClient> {
    client_from(CLIENT_ID, CLIENT_SECRET)
}

fn client_from(id: Option<&'static str>, secret: Option<&'static str>) -> Option<OAuthClient> {
    match (id, secret) {
        (Some(client_id), Some(client_secret)) if !client_id.is_empty() && !client_secret.is_empty() => {
            Some(OAuthClient { client_id, client_secret })
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn needs_both_the_id_and_the_secret() {
        assert!(client_from(Some("id"), Some("secret")).is_some());
        assert!(client_from(Some("id"), None).is_none());
        assert!(client_from(None, Some("secret")).is_none());
    }

    #[test]
    fn treats_empty_values_as_missing() {
        assert!(client_from(Some(""), Some("secret")).is_none());
        assert!(client_from(Some("id"), Some("")).is_none());
    }
}
