use serde::{Deserialize, Serialize};

pub const SUPPORTED_LANGUAGES: [&str; 2] = ["vi", "en"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub language: String,
    pub theme: String,
    pub household_size: i64,
    pub pinned_modules: Vec<String>,
    pub recent_modules: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "vi".to_string(),
            theme: "light".to_string(),
            household_size: 2,
            pinned_modules: vec!["spending".to_string(), "recipes".to_string()],
            recent_modules: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdateSettings {
    pub language: Option<String>,
    pub theme: Option<String>,
    pub household_size: Option<i64>,
    pub pinned_modules: Option<Vec<String>>,
    pub recent_modules: Option<Vec<String>>,
}

fn is_supported_language(language: &String) -> bool {
    SUPPORTED_LANGUAGES.contains(&language.as_str())
}

impl Settings {
    pub fn apply(mut self, update: UpdateSettings) -> Settings {
        if let Some(value) = update.language.filter(is_supported_language) {
            self.language = value;
        }
        if let Some(value) = update.theme {
            self.theme = value;
        }
        if let Some(value) = update.household_size {
            self.household_size = value.clamp(1, 20);
        }
        if let Some(value) = update.pinned_modules {
            self.pinned_modules = value;
        }
        if let Some(value) = update.recent_modules {
            self.recent_modules = value.into_iter().take(4).collect();
        }
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: String,
    pub module: String,
    pub title: String,
    pub body: String,
    pub created_at: i64,
    pub read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationRule {
    pub id: String,
    pub module: String,
    pub label: String,
    pub description: String,
    /// `time` (fires at `time`), `event` (fires when something happens), `always`.
    pub kind: String,
    pub time: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdateNotificationRule {
    pub id: String,
    pub enabled: Option<bool>,
    pub time: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub state: String,
    pub pending_events: i64,
    pub last_synced_at: Option<i64>,
    pub device_id: String,
    pub account_email: Option<String>,
    pub error: Option<String>,
    pub conflict_count: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn apply_clamps_household_size_and_keeps_other_fields() {
        let updated = Settings::default()
            .apply(UpdateSettings { household_size: Some(99), ..Default::default() });
        assert_eq!(updated.household_size, 20);
        assert_eq!(updated.language, "vi");
    }

    #[test]
    fn apply_switches_to_a_supported_language() {
        let updated = Settings::default()
            .apply(UpdateSettings { language: Some("en".into()), ..Default::default() });
        assert_eq!(updated.language, "en");
    }

    #[test]
    fn apply_ignores_a_language_the_app_does_not_ship() {
        let english = Settings { language: "en".into(), ..Settings::default() };
        let updated =
            english.apply(UpdateSettings { language: Some("fr".into()), ..Default::default() });
        assert_eq!(updated.language, "en");
    }
}
