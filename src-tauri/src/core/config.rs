use crate::core::error::{AppError, AppResult};
use directories::ProjectDirs;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tokio::fs as async_fs;

/// Application configuration
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// Application data directory
    pub app_data_dir: PathBuf,
    /// Username website data file path
    pub sites_data_path: PathBuf,
    /// Email website data file path
    pub email_data_path: PathBuf,
    /// Metadata configuration file path
    pub metadata_path: PathBuf,
    /// User agent list file path
    pub user_agents_path: PathBuf,
    /// First launch flag file path
    pub first_launch_flag_path: PathBuf,
    /// Log file path
    pub log_path: PathBuf,
}

impl AppConfig {
    /// Create application configuration
    pub fn new() -> AppResult<Self> {
        let proj_dirs = ProjectDirs::from("com", "NameSeeker", "NameSeeker")
            .ok_or_else(|| AppError::ConfigError("Unable to get application data directory".to_string()))?;

        let data_dir = proj_dirs.data_dir().to_path_buf();

        // Ensure data directory exists
        fs::create_dir_all(&data_dir)?;

        let config = Self {
            app_data_dir: data_dir.clone(),
            sites_data_path: data_dir.join("wmn-data.json"),
            email_data_path: data_dir.join("email-data.json"),
            metadata_path: data_dir.join("wmn-metadata.json"),
            user_agents_path: data_dir.join("useragents.txt"),
            first_launch_flag_path: data_dir.join(".disclaimer_accepted"),
            log_path: data_dir.join("app.log"),
        };

        // Ensure necessary files exist
        config.ensure_data_files_exist()?;

        Ok(config)
    }

    /// Ensure data files exist
    fn ensure_data_files_exist(&self) -> AppResult<()> {
        // Copy built-in data files to user data directory (as initial cache)
        self.copy_bundled_data_files()?;

        // Create user agent file (if it doesn't exist)
        if !self.user_agents_path.exists() {
            let default_user_agents = vec![
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0",
                "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0",
            ];
            fs::write(&self.user_agents_path, default_user_agents.join("\n"))?;
        }

        Ok(())
    }

    /// Copy built-in data files to user directory
    fn copy_bundled_data_files(&self) -> AppResult<()> {
        // Get built-in data file path (relative to executable)
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()));

        if let Some(exe_dir) = exe_dir {
            // Try multiple possible locations
            let possible_data_dirs = vec![
                exe_dir.join("data"),          // Release mode
                exe_dir.join("../../../data"), // Debug mode (target/debug)
                exe_dir.join("../../data"),    // Other cases
            ];

            for bundled_data_dir in possible_data_dirs {
                if bundled_data_dir.exists() {
                    log::info!("Found built-in data directory: {:?}", bundled_data_dir);

                    // Copy email data file
                    let bundled_email = bundled_data_dir.join("email-data.json");
                    if bundled_email.exists() && !self.email_data_path.exists() {
                        fs::copy(&bundled_email, &self.email_data_path)?;
                        log::info!("Copied email data file");
                    }

                    // Copy metadata configuration file
                    let bundled_metadata = bundled_data_dir.join("wmn-metadata.json");
                    if bundled_metadata.exists() && !self.metadata_path.exists() {
                        fs::copy(&bundled_metadata, &self.metadata_path)?;
                        log::info!("Copied metadata configuration file");
                    }

                    // Copy user agent file
                    let bundled_useragents = bundled_data_dir.join("useragents.txt");
                    if bundled_useragents.exists() && !self.user_agents_path.exists() {
                        fs::copy(&bundled_useragents, &self.user_agents_path)?;
                        log::info!("Copied user agent file");
                    }

                    // Copy username data file
                    let bundled_wmn = bundled_data_dir.join("wmn-data.json");
                    if bundled_wmn.exists() && !self.sites_data_path.exists() {
                        fs::copy(&bundled_wmn, &self.sites_data_path)?;
                        log::info!("Copied username data file");
                    }

                    return Ok(());
                }
            }

            log::warn!("Built-in data directory not found, will use online download");
        }

        Ok(())
    }

    /// Check if this is the first launch
    pub fn is_first_launch(&self) -> bool {
        !self.first_launch_flag_path.exists()
    }

    /// Set disclaimer as accepted
    pub fn set_disclaimer_accepted(&self) -> AppResult<()> {
        fs::write(&self.first_launch_flag_path, "accepted")?;
        Ok(())
    }

    /// Read user agent list
    pub async fn read_user_agents(&self) -> AppResult<Vec<String>> {
        if self.user_agents_path.exists() {
            let content = async_fs::read_to_string(&self.user_agents_path).await?;
            Ok(content.lines().map(|line| line.to_string()).collect())
        } else {
            // If file doesn't exist, return default user agent
            Ok(vec![
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36".to_string(),
            ])
        }
    }

    /// Get random user agent
    pub async fn get_random_user_agent(&self) -> AppResult<String> {
        let user_agents = self.read_user_agents().await?;
        if user_agents.is_empty() {
            return Ok("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36".to_string());
        }

        use rand::seq::SliceRandom;
        let mut rng = rand::thread_rng();
        Ok(user_agents
            .choose(&mut rng)
            .cloned()
            .unwrap_or_else(|| "Mozilla/5.0".to_string()))
    }
}

/// Global application configuration instance
pub static APP_CONFIG: Lazy<AppConfig> =
    Lazy::new(|| AppConfig::new().expect("Failed to initialize application configuration"));
