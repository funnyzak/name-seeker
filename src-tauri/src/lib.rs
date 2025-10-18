mod core;

use core::config::APP_CONFIG;
use core::export::export_results;
use core::models::{
    ExportOptions, SearchConfig, SearchFinished, SearchProgressPayload, SearchType,
    SearchUpdatePayload,
};
use core::search::SearchEngine;
use core::sites::SITES_MANAGER;
use core::utils::{validate_email, validate_username};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

// Application state
#[derive(Default)]
pub struct AppState {
    pub search_handle: Arc<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>>,
}

/// Check if this is the first launch
#[tauri::command]
async fn is_first_launch() -> Result<bool, String> {
    Ok(APP_CONFIG.is_first_launch())
}

/// Set disclaimer as accepted
#[tauri::command]
async fn set_disclaimer_accepted() -> Result<(), String> {
    APP_CONFIG
        .set_disclaimer_accepted()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Start search
#[tauri::command]
async fn start_search(
    app: AppHandle,
    query: String,
    search_type: Option<String>,
    max_concurrent_requests: Option<usize>,
    timeout_seconds: Option<u64>,
    exclude_nsfw: Option<bool>,
    category_filter: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    // Parse search type
    let search_type = match search_type.as_deref() {
        Some("email") => SearchType::Email,
        _ => SearchType::Username,
    };

    // Validate input based on search type
    match search_type {
        SearchType::Username => {
            validate_username(&query).map_err(|e| e.to_string())?;
            log::info!("Starting username search: {}", query);
        }
        SearchType::Email => {
            validate_email(&query).map_err(|e| e.to_string())?;
            log::info!("Starting email search: {}", query);
        }
    }

    // Create search configuration
    let search_config = SearchConfig {
        search_type,
        query: query.clone(),
        max_concurrent_requests: max_concurrent_requests.unwrap_or(30),
        timeout_seconds: timeout_seconds.unwrap_or(30),
        user_agent: APP_CONFIG
            .get_random_user_agent()
            .await
            .map_err(|e| e.to_string())?,
        exclude_nsfw: exclude_nsfw.unwrap_or(true),
        category_filter,
    };

    // Create search engine
    let search_engine =
        std::sync::Arc::new(SearchEngine::new(search_config).map_err(|e| e.to_string())?);

    // Create single result update callback
    let app_for_update = app.clone();
    let update_callback = move |payload: SearchUpdatePayload| {
        let app = app_for_update.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = app.emit("search-update", &payload) {
                log::error!("Failed to emit search update event: {}", e);
            }
        });
    };

    // Create progress update callback
    let app_for_progress = app.clone();
    let progress_callback = move |payload: SearchProgressPayload| {
        let app = app_for_progress.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = app.emit("search-progress", &payload) {
                log::error!("Failed to emit progress update event: {}", e);
            }
        });
    };

    // Clone necessary data
    let app_for_search = app.clone();
    let search_engine_clone = search_engine.clone();

    // Start search task
    let search_handle = tauri::async_runtime::spawn(async move {
        let start_time = std::time::Instant::now();

        // Get total number of sites to search
        let total_sites = match search_engine_clone.get_total_sites(&SITES_MANAGER).await {
            Ok(count) => count,
            Err(e) => {
                log::error!("Failed to get total sites count: {}", e);
                if let Err(e) = app_for_search.emit("search-error", &e.to_string()) {
                    log::error!("Failed to emit search error event: {}", e);
                }
                return;
            }
        };

        log::info!("Preparing to search {} sites", total_sites);

        // Send initial progress
        let initial_progress = SearchProgressPayload {
            total_sites,
            checked_sites: 0,
            found_count: 0,
            error_count: 0,
            percentage: 0.0,
            current_site: None,
        };

        if let Err(e) = app_for_search.emit("search-progress", &initial_progress) {
            log::error!("Failed to emit initial progress event: {}", e);
        }

        // Execute search
        match search_engine_clone
            .search(&SITES_MANAGER, update_callback, progress_callback)
            .await
        {
            Ok(results) => {
                let found_count = results
                    .iter()
                    .filter(|r| r.status == core::models::SearchResultStatus::Found)
                    .count() as u32;

                log::info!(
                    "Search completed: {} sites, found {} accounts",
                    total_sites,
                    found_count
                );

                // Send search completion event
                let finished = SearchFinished {
                    total_sites,
                    found_count,
                    duration_ms: start_time.elapsed().as_millis() as u64,
                };

                if let Err(e) = app_for_search.emit("search-finished", &finished) {
                    log::error!("Failed to emit search completion event: {}", e);
                }
            }
            Err(e) => {
                log::error!("Search failed: {}", e);

                // Send error event
                if let Err(e) = app_for_search.emit("search-error", &e.to_string()) {
                    log::error!("Failed to emit search error event: {}", e);
                }
            }
        }

        // Clean up handle after search completion
        log::debug!("Search task completed, handle will be automatically cleaned up");
    });

    // Save search handle
    {
        let mut search_handle_guard = state.search_handle.lock().await;
        *search_handle_guard = Some(search_handle);
    }

    Ok(())
}

/// Stop current search
#[tauri::command]
async fn stop_search(app: AppHandle, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut search_handle_guard = state.search_handle.lock().await;

    if let Some(search_handle) = search_handle_guard.take() {
        search_handle.abort();

        // Send search stopped event
        if let Err(e) = app.emit("search-stopped", &()) {
            log::error!("Failed to emit search stopped event: {}", e);
        }

        log::info!("Search stopped by user");
        Ok(true)
    } else {
        Ok(false)
    }
}

/// Get search statistics
#[tauri::command]
async fn get_search_stats() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "total_searches": 0,
        "total_accounts_found": 0,
        "popular_sites": [],
        "last_search": null
    }))
}

/// Get available website categories
#[tauri::command]
async fn get_categories() -> Result<Vec<String>, String> {
    SITES_MANAGER
        .get_categories(&APP_CONFIG)
        .await
        .map_err(|e| e.to_string())
}

/// Validate username format
#[tauri::command]
async fn validate_username_format(username: String) -> Result<bool, String> {
    Ok(validate_username(&username).is_ok())
}

/// Validate email format
#[tauri::command]
async fn validate_email_format(email: String) -> Result<bool, String> {
    Ok(validate_email(&email).is_ok())
}

/// Open external URL
#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    match open::that(&url) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open URL: {}", e)),
    }
}

/// Open file directory
#[tauri::command]
async fn open_directory(path: String) -> Result<(), String> {
    use std::path::Path;

    let path = Path::new(&path);

    // If it's a file path, get its parent directory
    let dir_path = if path.is_file() {
        path.parent()
            .ok_or_else(|| "Unable to get parent directory".to_string())?
    } else {
        path
    };

    // Check if directory exists
    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", dir_path.display()));
    }

    // Open directory
    match open::that(dir_path) {
        Ok(_) => {
            log::info!("Opened directory: {}", dir_path.display());
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to open directory: {}", e);
            Err(format!("Failed to open directory: {}", e))
        }
    }
}

/// Copy text to clipboard
#[tauri::command]
async fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    app.clipboard().write_text(text.clone()).map_err(|e| {
        log::error!("Failed to copy to clipboard: {}", e);
        format!("Copy failed: {}", e)
    })?;

    log::info!("Copied text to clipboard (length: {})", text.len());
    Ok(())
}

/// Get application version information
#[tauri::command]
async fn get_app_info(app: AppHandle) -> Result<serde_json::Value, String> {
    // Get bundle information from Tauri configuration
    let config = app.config();
    let bundle = &config.bundle;

    // Get application information
    let app_info = serde_json::json!({
        "name": config.product_name,
        "version": config.version,
        "identifier": config.identifier,
        "description": bundle.short_description,
        "long_description": bundle.long_description,
        "copyright": bundle.copyright,
        "category": bundle.category,
        "authors": env!("CARGO_PKG_AUTHORS"),
        "build_date": env!("VERGEN_BUILD_DATE"), // Build time
        "tauri_version": tauri::VERSION,
        "build_profile": if cfg!(debug_assertions) { "debug" } else { "release" }
    });

    Ok(app_info)
}

/// Export search results
#[tauri::command]
async fn export_results_cmd(options: ExportOptions) -> Result<String, String> {
    export_results(options).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    log::info!("Starting NameSeeker application");

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            is_first_launch,
            set_disclaimer_accepted,
            start_search,
            stop_search,
            get_search_stats,
            get_categories,
            validate_username_format,
            validate_email_format,
            open_url,
            open_directory,
            copy_to_clipboard,
            get_app_info,
            export_results_cmd
        ])
        .setup(|app| {
            log::info!("Tauri application initialization completed");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
