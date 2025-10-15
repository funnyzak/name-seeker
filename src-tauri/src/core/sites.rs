use crate::core::error::{AppError, AppResult};
use crate::core::models::{Site, SiteMetadataConfig};
use reqwest::Client;
use serde_json;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tokio::fs as async_fs;
use tokio::sync::OnceCell;

/// 网站数据管理器
pub struct SitesManager {
    client: Client,
    sites_data: OnceCell<Vec<Site>>,
    email_data: OnceCell<Vec<Site>>,
    metadata_config: OnceCell<HashMap<String, Vec<serde_json::Value>>>,
}

impl SitesManager {
    /// 创建新的网站管理器
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .user_agent("name-seeker/1.0")
                .build()
                .expect("无法创建HTTP客户端"),
            sites_data: OnceCell::new(),
            email_data: OnceCell::new(),
            metadata_config: OnceCell::new(),
        }
    }

    /// 获取用户名网站数据（如果需要会先下载）
    pub async fn get_sites(
        &self,
        config: &crate::core::config::AppConfig,
    ) -> AppResult<&Vec<Site>> {
        if let Some(sites) = self.sites_data.get() {
            return Ok(sites);
        }

        // 如果本地文件不存在或需要更新，先下载
        self.ensure_sites_data_up_to_date(config).await?;

        // 从本地文件加载
        let sites = self.load_sites_from_file(&config.sites_data_path).await?;
        self.sites_data
            .set(sites)
            .map_err(|_| AppError::SiteDataError("无法设置网站数据".to_string()))?;

        Ok(self.sites_data.get().unwrap())
    }

    /// 获取邮箱网站数据
    pub async fn get_email_sites(
        &self,
        config: &crate::core::config::AppConfig,
    ) -> AppResult<&Vec<Site>> {
        if let Some(sites) = self.email_data.get() {
            return Ok(sites);
        }

        // 从本地文件加载邮箱数据（邮箱数据不需要在线更新）
        let sites = self.load_sites_from_file(&config.email_data_path).await?;
        self.email_data
            .set(sites)
            .map_err(|_| AppError::SiteDataError("无法设置邮箱数据".to_string()))?;

        Ok(self.email_data.get().unwrap())
    }

    /// 获取元数据配置
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
            .map_err(|_| AppError::SiteDataError("无法设置元数据配置".to_string()))?;

        Ok(self.metadata_config.get().unwrap())
    }

    /// 确保网站数据是最新的
    async fn ensure_sites_data_up_to_date(
        &self,
        config: &crate::core::config::AppConfig,
    ) -> AppResult<()> {
        const WMN_DATA_URL: &str =
            "https://raw.githubusercontent.com/WebBreacher/WhatsMyName/main/wmn-data.json";

        if !config.sites_data_path.exists() {
            log::info!("下载网站数据文件...");
            self.download_sites_data(WMN_DATA_URL, &config.sites_data_path)
                .await?;
            return Ok(());
        }

        // 检查远程数据是否有更新
        match self.check_for_updates(WMN_DATA_URL).await {
            Ok(Some(_)) => {
                log::info!("检测到更新，重新下载网站数据...");
                self.download_sites_data(WMN_DATA_URL, &config.sites_data_path)
                    .await?;
            }
            Ok(None) => {
                log::info!("网站数据已是最新");
            }
            Err(e) => {
                log::warn!("检查更新失败: {}, 使用本地数据", e);
            }
        }

        Ok(())
    }

    /// 下载网站数据
    async fn download_sites_data(&self, url: &str, path: &Path) -> AppResult<()> {
        let response = self.client.get(url).send().await?;
        let content = response.text().await?;

        // 确保目录存在
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        async_fs::write(path, content).await?;
        Ok(())
    }

    /// 检查是否有更新
    async fn check_for_updates(&self, url: &str) -> AppResult<Option<String>> {
        let response = self.client.head(url).send().await?;
        let remote_etag = response
            .headers()
            .get("etag")
            .and_then(|value| value.to_str().ok())
            .map(|s| s.to_string());

        Ok(remote_etag)
    }

    /// 从文件加载网站数据
    async fn load_sites_from_file(&self, path: &Path) -> AppResult<Vec<Site>> {
        if !path.exists() {
            return Err(AppError::SiteDataError("网站数据文件不存在".to_string()));
        }

        let content = async_fs::read_to_string(path).await?;
        let data: serde_json::Value = serde_json::from_str(&content)?;

        let sites = data["sites"]
            .as_array()
            .ok_or_else(|| AppError::SiteDataError("无效的网站数据格式".to_string()))?
            .iter()
            .filter_map(|site| serde_json::from_value(site.clone()).ok())
            .collect();

        Ok(sites)
    }

    /// 从文件加载元数据配置
    async fn load_metadata_from_file(
        &self,
        path: &Path,
    ) -> AppResult<HashMap<String, Vec<serde_json::Value>>> {
        if !path.exists() {
            log::warn!("元数据配置文件不存在: {:?}", path);
            return Ok(HashMap::new());
        }

        let content = async_fs::read_to_string(path).await?;
        let data: SiteMetadataConfig = serde_json::from_str(&content)?;

        // 转换为HashMap<String, Vec<serde_json::Value>>
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

    /// 根据过滤条件获取网站列表
    pub async fn get_filtered_sites(
        &self,
        config: &crate::core::config::AppConfig,
        search_type: &crate::core::models::SearchType,
        exclude_nsfw: bool,
        category_filter: Option<&str>,
    ) -> AppResult<Vec<Site>> {
        // 根据搜索类型选择数据源
        let sites = match search_type {
            crate::core::models::SearchType::Username => self.get_sites(config).await?,
            crate::core::models::SearchType::Email => self.get_email_sites(config).await?,
        };

        let mut filtered_sites = sites.clone();

        // 排除NSFW网站
        if exclude_nsfw {
            filtered_sites.retain(|site| site.cat != "xx NSFW xx");
        }

        // 按类别过滤
        if let Some(category) = category_filter {
            filtered_sites.retain(|site| site.cat == category);
        }

        Ok(filtered_sites)
    }

    /// 获取所有可用的类别
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

/// 全局网站管理器实例
pub static SITES_MANAGER: std::sync::LazyLock<SitesManager> =
    std::sync::LazyLock::new(|| SitesManager::new());
