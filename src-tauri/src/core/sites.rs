use crate::core::error::{AppError, AppResult};
use crate::core::models::{Site, SiteMetadataConfig};
use reqwest::Client;
use serde_json;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tokio::fs as async_fs;
use tokio::sync::OnceCell;

/// Website data manager
pub struct SitesManager {
    client: Client,
    sites_data: OnceCell<Vec<Site>>,
    email_data: OnceCell<Vec<Site>>,
    metadata_config: OnceCell<HashMap<String, Vec<serde_json::Value>>>,
}

impl SitesManager {
    /// Create new site manager
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .user_agent("name-seeker/1.0")
                .build()
                .expect("Failed to create HTTP client"),
            sites_data: OnceCell::new(),
            email_data: OnceCell::new(),
            metadata_config: OnceCell::new(),
        }
    }

    /// Get username website data (downloads if necessary)
    pub async fn get_sites(
        &self,
        config: &crate::core::config::AppConfig,
    ) -> AppResult<&Vec<Site>> {
        if let Some(sites) = self.sites_data.get() {
            return Ok(sites);
        }

        // Download if local file doesn't exist or needs update
        self.ensure_sites_data_up_to_date(config).await?;

        // Load from local file
        let sites = self.load_sites_from_file(&config.sites_data_path).await?;
        self.sites_data
            .set(sites)
            .map_err(|_| AppError::SiteDataError("Failed to set sites data".to_string()))?;

        Ok(self.sites_data.get().unwrap())
    }

    /// Get email website data
    pub async fn get_email_sites(
        &self,
        config: &crate::core::config::AppConfig,
    ) -> AppResult<&Vec<Site>> {
        if let Some(sites) = self.email_data.get() {
            return Ok(sites);
        }

        // Load email data from local file (email data doesn't need online updates)
        let sites = self.load_sites_from_file(&config.email_data_path).await?;
        self.email_data
            .set(sites)
            .map_err(|_| AppError::SiteDataError("Failed to set email data".to_string()))?;

        Ok(self.email_data.get().unwrap())
    }

    /// Get metadata configuration
    pub async fn get_metadata_config(
        &self,
        config: &crate::core::config::AppConfig,
    ) -> AppResult<&HashMap<String, Vec<serde_json::Value>>> {
        if let Some(metadata) = self.metadata_config.get() {
            return Ok(metadata);
        }

        let metadata = self.load_metadata_from_file(&config.metadata_path).await?;
        self.metadata_config
            .set(metadata)
            .map_err(|_| AppError::SiteDataError("Failed to set metadata configuration".to_string()))?;

        Ok(self.metadata_config.get().unwrap())
    }

    /// Ensure website data is up to date
    async fn ensure_sites_data_up_to_date(
        &self,
        config: &crate::core::config::AppConfig,
    ) -> AppResult<()> {
        const WMN_DATA_URL: &str =
            "https://raw.githubusercontent.com/WebBreacher/WhatsMyName/main/wmn-data.json";

        if !config.sites_data_path.exists() {
            log::info!("Downloading website data file...");
            self.download_sites_data(WMN_DATA_URL, &config.sites_data_path)
                .await?;
            return Ok(());
        }

        // Check if remote data has updates
        match self.check_for_updates(WMN_DATA_URL).await {
            Ok(Some(_)) => {
                log::info!("Update detected, re-downloading website data...");
                self.download_sites_data(WMN_DATA_URL, &config.sites_data_path)
                    .await?;
            }
            Ok(None) => {
                log::info!("Website data is up to date");
            }
            Err(e) => {
                log::warn!("Failed to check for updates: {}, using local data", e);
            }
        }

        Ok(())
    }

    /// Download website data
    async fn download_sites_data(&self, url: &str, path: &Path) -> AppResult<()> {
        let response = self.client.get(url).send().await?;
        let content = response.text().await?;

        // Ensure directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        async_fs::write(path, content).await?;
        Ok(())
    }

    /// Check for updates
    async fn check_for_updates(&self, url: &str) -> AppResult<Option<String>> {
        let response = self.client.head(url).send().await?;
        let remote_etag = response
            .headers()
            .get("etag")
            .and_then(|value| value.to_str().ok())
            .map(|s| s.to_string());

        Ok(remote_etag)
    }

    /// Load website data from file
    async fn load_sites_from_file(&self, path: &Path) -> AppResult<Vec<Site>> {
        if !path.exists() {
            return Err(AppError::SiteDataError("Website data file does not exist".to_string()));
        }

        let content = async_fs::read_to_string(path).await?;
        let data: serde_json::Value = serde_json::from_str(&content)?;

        let sites = data["sites"]
            .as_array()
            .ok_or_else(|| AppError::SiteDataError("Invalid website data format".to_string()))?
            .iter()
            .filter_map(|site| serde_json::from_value(site.clone()).ok())
            .collect();

        Ok(sites)
    }

    /// Load metadata configuration from file
    async fn load_metadata_from_file(
        &self,
        path: &Path,
    ) -> AppResult<HashMap<String, Vec<serde_json::Value>>> {
        if !path.exists() {
            log::warn!("Metadata configuration file does not exist: {:?}", path);
            return Ok(HashMap::new());
        }

        let content = async_fs::read_to_string(path).await?;
        let data: SiteMetadataConfig = serde_json::from_str(&content)?;

        // Convert to HashMap<String, Vec<serde_json::Value>>
        let metadata = data
            .sites
            .into_iter()
            .map(|(key, value)| {
                let json_value: Vec<serde_json::Value> = value
                    .into_iter()
                    .filter_map(|item| serde_json::to_value(item).ok())
                    .collect();
                (key, json_value)
            })
            .collect();

        Ok(metadata)
    }

    /// Get filtered website list based on criteria
    pub async fn get_filtered_sites(
        &self,
        config: &crate::core::config::AppConfig,
        search_type: &crate::core::models::SearchType,
        exclude_nsfw: bool,
        category_filter: Option<&str>,
    ) -> AppResult<Vec<Site>> {
        // Select data source based on search type
        let sites = match search_type {
            crate::core::models::SearchType::Username => self.get_sites(config).await?,
            crate::core::models::SearchType::Email => self.get_email_sites(config).await?,
        };

        let mut filtered_sites = sites.clone();

        // Exclude NSFW websites
        if exclude_nsfw {
            filtered_sites.retain(|site| site.cat != "xx NSFW xx");
        }

        // Filter by category
        if let Some(category) = category_filter {
            filtered_sites.retain(|site| site.cat == category);
        }

        Ok(filtered_sites)
    }

    /// Get all available categories
    pub async fn get_categories(
        &self,
        config: &crate::core::config::AppConfig,
    ) -> AppResult<Vec<String>> {
        let sites = self.get_sites(config).await?;
        let mut categories: Vec<String> = sites
            .iter()
            .map(|site| site.cat.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        categories.sort();
        Ok(categories)
    }
}

/// Global site manager instance
pub static SITES_MANAGER: std::sync::LazyLock<SitesManager> =
    std::sync::LazyLock::new(|| SitesManager::new());
