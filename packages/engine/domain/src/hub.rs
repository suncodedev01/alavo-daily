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
    /// Minutes between automatic Google syncs while the app is open; 0 turns the timer off.
    #[serde(default = "default_sync_interval_minutes")]
    pub sync_interval_minutes: i64,
}

pub const SYNC_INTERVAL_CHOICES: [i64; 5] = [0, 1, 5, 15, 30];

fn default_sync_interval_minutes() -> i64 {
    5
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "vi".to_string(),
            theme: "light".to_string(),
            household_size: 2,
            pinned_modules: vec!["spending".to_string(), "recipes".to_string()],
            recent_modules: Vec::new(),
            sync_interval_minutes: default_sync_interval_minutes(),
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
    pub sync_interval_minutes: Option<i64>,
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
        if let Some(value) = update.sync_interval_minutes.filter(|v| SYNC_INTERVAL_CHOICES.contains(v)) {
            self.sync_interval_minutes = value;
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
    /// The row the notification is about, such as the category of a budget alert.
    pub subject_id: Option<String>,
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
    fn syncs_every_five_minutes_until_the_person_chooses_otherwise() {
        assert_eq!(Settings::default().sync_interval_minutes, 5);
    }

    #[test]
    fn apply_accepts_only_the_offered_sync_intervals() {
        let off = Settings::default()
            .apply(UpdateSettings { sync_interval_minutes: Some(0), ..Default::default() });
        assert_eq!(off.sync_interval_minutes, 0);
        let odd = Settings::default()
            .apply(UpdateSettings { sync_interval_minutes: Some(7), ..Default::default() });
        assert_eq!(odd.sync_interval_minutes, 5);
    }

    #[test]
    fn settings_saved_before_the_sync_interval_existed_still_load_with_the_default() {
        let old = r#"{"language":"en","theme":"dark","householdSize":3,"pinnedModules":[],"recentModules":[]}"#;
        let loaded: Settings = serde_json::from_str(old).unwrap();
        assert_eq!((loaded.language.as_str(), loaded.sync_interval_minutes), ("en", 5));
    }

    #[test]
    fn apply_ignores_a_language_the_app_does_not_ship() {
        let english = Settings { language: "en".into(), ..Settings::default() };
        let updated =
            english.apply(UpdateSettings { language: Some("fr".into()), ..Default::default() });
        assert_eq!(updated.language, "en");
    }
}
