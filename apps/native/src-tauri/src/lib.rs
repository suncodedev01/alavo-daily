use std::sync::Mutex;

use alavo_infrastructure::native_env::NativeEnv;
use alavo_infrastructure::persistence::native_db::NativeDb;
use alavo_presentation::engine::Engine;
use tauri::{Manager, State};

const DATABASE_FILE: &str = "alavo-daily.sqlite3";

struct AppEngine {
    db: Mutex<NativeDb>,
    engine: Engine,
}

#[tauri::command]
fn engine_start(state: State<AppEngine>) -> Result<String, String> {
    Ok(serde_json::json!({ "deviceId": state.engine.device_id() }).to_string())
}

#[tauri::command]
fn engine_call(state: State<AppEngine>, command: String, payload: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|_| "database lock poisoned".to_string())?;
    state.engine.call(&*db, &NativeEnv, &command, &payload).map_err(|error| error.to_json())
}

fn open_engine(app: &tauri::App) -> Result<AppEngine, Box<dyn std::error::Error>> {
    let directory = app.path().app_data_dir()?;
    std::fs::create_dir_all(&directory)?;
    let db = NativeDb::open(&directory.join(DATABASE_FILE))?;
    let engine = Engine::start(&db, &NativeEnv)?;
    Ok(AppEngine { db: Mutex::new(db), engine })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let engine = open_engine(app)?;
            app.manage(engine);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![engine_start, engine_call])
        .run(tauri::generate_context!())
        .expect("error while running the application");
}
