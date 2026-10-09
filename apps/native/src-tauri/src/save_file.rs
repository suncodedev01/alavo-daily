use std::io::Write;

use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::{DialogExt, FilePath};
use tauri_plugin_fs::{FsExt, OpenOptions};

const FALLBACK_FILE_NAME: &str = "alavo-daily.json";
const FORBIDDEN_FILE_NAME_CHARS: [char; 9] = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

/// Returns false when the person closes the dialog without choosing a place.
#[tauri::command]
pub async fn save_text_file<R: Runtime>(
    app: AppHandle<R>,
    file_name: String,
    content: String,
) -> Result<bool, String> {
    let file_name = safe_file_name(&file_name);
    tauri::async_runtime::spawn_blocking(move || {
        let Some(destination) = ask_where_to_save(&app, &file_name) else {
            return Ok(false);
        };
        write_text(&app, destination, &content).map(|()| true)
    })
    .await
    .map_err(|error| error.to_string())?
}

fn ask_where_to_save<R: Runtime>(app: &AppHandle<R>, file_name: &str) -> Option<FilePath> {
    app.dialog().file().set_file_name(file_name).add_filter("JSON", &["json"]).blocking_save_file()
}

fn write_text<R: Runtime>(app: &AppHandle<R>, destination: FilePath, content: &str) -> Result<(), String> {
    let mut options = OpenOptions::new();
    options.write(true).create(true).truncate(true);
    let mut file = app.fs().open(destination, options).map_err(describe_write_error)?;
    file.write_all(content.as_bytes()).map_err(describe_write_error)
}

fn describe_write_error(error: std::io::Error) -> String {
    format!("Could not write the file: {error}")
}

fn safe_file_name(requested: &str) -> String {
    let last_part = requested.rsplit(['/', '\\']).next().unwrap_or_default();
    let cleaned: String = last_part
        .chars()
        .map(|character| {
            if character.is_control() || FORBIDDEN_FILE_NAME_CHARS.contains(&character) {
                '-'
            } else {
                character
            }
        })
        .collect();
    match cleaned.trim() {
        "" | "." | ".." => FALLBACK_FILE_NAME.to_string(),
        name => name.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_an_ordinary_file_name() {
        assert_eq!(safe_file_name("alavo-daily-2026-10-09.json"), "alavo-daily-2026-10-09.json");
    }

    #[test]
    fn drops_folders_from_the_suggested_name() {
        assert_eq!(safe_file_name("../../etc/passwd"), "passwd");
        assert_eq!(safe_file_name("C:\\Users\\a\\backup.json"), "backup.json");
    }

    #[test]
    fn replaces_characters_the_system_would_refuse() {
        assert_eq!(safe_file_name("a:b*c?.json"), "a-b-c-.json");
    }

    #[test]
    fn falls_back_when_nothing_usable_is_left() {
        for name in ["", "   ", "..", "/"] {
            assert_eq!(safe_file_name(name), FALLBACK_FILE_NAME, "{name:?}");
        }
    }
}
