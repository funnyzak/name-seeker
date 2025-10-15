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

// 应用状态
#[derive(Default)]
pub struct AppState {
    pub search_handle: Arc<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>>,
}

/// 检查是否为首次启动
#[tauri::command]
async fn is_first_launch() -> Result<bool, String> {
    Ok(APP_CONFIG.is_first_launch())
}

/// 设置免责声明已接受
#[tauri::command]
async fn set_disclaimer_accepted() -> Result<(), String> {
    APP_CONFIG
        .set_disclaimer_accepted()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 开始搜索
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
    // 解析搜索类型
    let search_type = match search_type.as_deref() {
        Some("email") => SearchType::Email,
        _ => SearchType::Username,
    };

    // 根据搜索类型验证输入
    match search_type {
        SearchType::Username => {
            validate_username(&query).map_err(|e| e.to_string())?;
            log::info!("开始搜索用户名: {}", query);
        }
        SearchType::Email => {
            validate_email(&query).map_err(|e| e.to_string())?;
            log::info!("开始搜索邮箱: {}", query);
        }
    }

    // 创建搜索配置
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

    // 创建搜索引擎
    let search_engine =
        std::sync::Arc::new(SearchEngine::new(search_config).map_err(|e| e.to_string())?);

    // 创建单个结果更新回调
    let app_for_update = app.clone();
    let update_callback = move |payload: SearchUpdatePayload| {
        let app = app_for_update.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = app.emit("search-update", &payload) {
                log::error!("发送搜索更新事件失败: {}", e);
            }
        });
    };

    // 创建进度更新回调
    let app_for_progress = app.clone();
    let progress_callback = move |payload: SearchProgressPayload| {
        let app = app_for_progress.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = app.emit("search-progress", &payload) {
                log::error!("发送进度更新事件失败: {}", e);
            }
        });
    };

    // 克隆必要的数据
    let app_for_search = app.clone();
    let search_engine_clone = search_engine.clone();

    // 启动搜索任务
    let search_handle = tauri::async_runtime::spawn(async move {
        let start_time = std::time::Instant::now();

        // 获取要搜索的网站总数
        let total_sites = match search_engine_clone.get_total_sites(&SITES_MANAGER).await {
            Ok(count) => count,
            Err(e) => {
                log::error!("获取网站总数失败: {}", e);
                if let Err(e) = app_for_search.emit("search-error", &e.to_string()) {
                    log::error!("发送搜索错误事件失败: {}", e);
                }
                return;
            }
        };

        log::info!("准备搜索 {} 个网站", total_sites);

        // 发送初始进度
        let initial_progress = SearchProgressPayload {
            total_sites,
            checked_sites: 0,
            found_count: 0,
            error_count: 0,
            percentage: 0.0,
            current_site: None,
        };

        if let Err(e) = app_for_search.emit("search-progress", &initial_progress) {
            log::error!("发送初始进度事件失败: {}", e);
        }

        // 执行搜索
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
                    "搜索完成: {} 个网站，找到 {} 个账户",
                    total_sites,
                    found_count
                );

                // 发送搜索完成事件
                let finished = SearchFinished {
                    total_sites,
                    found_count,
                    duration_ms: start_time.elapsed().as_millis() as u64,
                };

                if let Err(e) = app_for_search.emit("search-finished", &finished) {
                    log::error!("发送搜索完成事件失败: {}", e);
                }
            }
            Err(e) => {
                log::error!("搜索失败: {}", e);

                // 发送错误事件
                if let Err(e) = app_for_search.emit("search-error", &e.to_string()) {
                    log::error!("发送搜索错误事件失败: {}", e);
                }
            }
        }

        // 搜索完成后清理句柄
        log::debug!("搜索任务完成，句柄将被自动清理");
    });

    // 保存搜索句柄
    {
        let mut search_handle_guard = state.search_handle.lock().await;
        *search_handle_guard = Some(search_handle);
    }

    Ok(())
}

/// 停止当前搜索
#[tauri::command]
async fn stop_search(app: AppHandle, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut search_handle_guard = state.search_handle.lock().await;

    if let Some(search_handle) = search_handle_guard.take() {
        search_handle.abort();

        // 发送搜索停止事件
        if let Err(e) = app.emit("search-stopped", &()) {
            log::error!("发送搜索停止事件失败: {}", e);
        }

        log::info!("搜索已被用户停止");
        Ok(true)
    } else {
        Ok(false)
    }
}

/// 获取搜索统计信息
#[tauri::command]
async fn get_search_stats() -> Result<serde_json::Value, String> {
    // 这里可以实现获取搜索统计信息的功能
    Ok(serde_json::json!({
        "total_searches": 0,
        "total_accounts_found": 0,
        "popular_sites": [],
        "last_search": null
    }))
}

/// 获取可用网站类别
#[tauri::command]
async fn get_categories() -> Result<Vec<String>, String> {
    SITES_MANAGER
        .get_categories(&APP_CONFIG)
        .await
        .map_err(|e| e.to_string())
}

/// 验证用户名格式
#[tauri::command]
async fn validate_username_format(username: String) -> Result<bool, String> {
    Ok(validate_username(&username).is_ok())
}

/// 验证邮箱格式
#[tauri::command]
async fn validate_email_format(email: String) -> Result<bool, String> {
    Ok(validate_email(&email).is_ok())
}

/// 打开外部URL
#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    match open::that(&url) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open URL: {}", e)),
    }
}

/// 打开文件所在目录
#[tauri::command]
async fn open_directory(path: String) -> Result<(), String> {
    use std::path::Path;

    let path = Path::new(&path);

    // 如果传入的是文件路径，获取其父目录
    let dir_path = if path.is_file() {
        path.parent()
            .ok_or_else(|| "无法获取文件的父目录".to_string())?
    } else {
        path
    };

    // 检查目录是否存在
    if !dir_path.exists() {
        return Err(format!("目录不存在: {}", dir_path.display()));
    }

    // 打开目录
    match open::that(dir_path) {
        Ok(_) => {
            log::info!("已打开目录: {}", dir_path.display());
            Ok(())
        }
        Err(e) => {
            log::error!("打开目录失败: {}", e);
            Err(format!("打开目录失败: {}", e))
        }
    }
}

/// 复制文本到剪贴板
#[tauri::command]
async fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    app.clipboard()
        .write_text(text.clone())
        .map_err(|e| {
            log::error!("复制到剪贴板失败: {}", e);
            format!("复制失败: {}", e)
        })?;

    log::info!("已复制文本到剪贴板 (长度: {})", text.len());
    Ok(())
}


/// 获取应用版本信息
#[tauri::command]
async fn get_app_info(app: AppHandle) -> Result<serde_json::Value, String> {
    // 从 Tauri 配置获取 bundle 信息
    let config = app.config();
    let bundle = &config.bundle;
    
    // 获取应用信息
    let app_info = serde_json::json!({
        "name": config.product_name,
        "version": config.version,
        "identifier": config.identifier,
        "description": bundle.short_description,
        "long_description": bundle.long_description,
        "copyright": bundle.copyright,
        "category": bundle.category,
        "authors": env!("CARGO_PKG_AUTHORS"), // 这个还是从 Cargo.toml 获取
        "build_date": env!("VERGEN_BUILD_DATE"), // 构建时间
        "tauri_version": tauri::VERSION,
        "build_profile": if cfg!(debug_assertions) { "debug" } else { "release" }
    });
    
    Ok(app_info)
}

/// 导出搜索结果
#[tauri::command]
async fn export_results_cmd(options: ExportOptions) -> Result<String, String> {
    export_results(options).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    log::info!("启动 Search My Name 应用");

    tauri::Builder::default()
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
            log::info!("Tauri应用初始化完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
