use crate::core::error::{AppError, AppResult};
use directories::ProjectDirs;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tokio::fs as async_fs;

/// 应用程序配置
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// 应用数据目录
    pub app_data_dir: PathBuf,
    /// 用户名网站数据文件路径
    pub sites_data_path: PathBuf,
    /// 邮箱网站数据文件路径
    pub email_data_path: PathBuf,
    /// 元数据配置文件路径
    pub metadata_path: PathBuf,
    /// 用户代理列表文件路径
    pub user_agents_path: PathBuf,
    /// 首次启动标记文件路径
    pub first_launch_flag_path: PathBuf,
    /// 日志文件路径
    pub log_path: PathBuf,
}

impl AppConfig {
    /// 创建应用配置
    pub fn new() -> AppResult<Self> {
        let proj_dirs = ProjectDirs::from("com", "NameSeeker", "NameSeeker")
            .ok_or_else(|| AppError::ConfigError("无法获取应用数据目录".to_string()))?;

        let data_dir = proj_dirs.data_dir().to_path_buf();

        // 确保数据目录存在
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

        // 确保必要的文件存在
        config.ensure_data_files_exist()?;

        Ok(config)
    }

    /// 确保数据文件存在
    fn ensure_data_files_exist(&self) -> AppResult<()> {
        // 复制内置的数据文件到用户数据目录（作为初始缓存）
        self.copy_bundled_data_files()?;

        // 创建用户代理文件（如果不存在）
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

    /// 复制内置数据文件到用户目录
    fn copy_bundled_data_files(&self) -> AppResult<()> {
        // 获取内置数据文件路径（相对于可执行文件）
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()));

        if let Some(exe_dir) = exe_dir {
            // 尝试多个可能的位置
            let possible_data_dirs = vec![
                exe_dir.join("data"),          // Release 模式
                exe_dir.join("../../../data"), // Debug 模式（target/debug）
                exe_dir.join("../../data"),    // 其他情况
            ];

            for bundled_data_dir in possible_data_dirs {
                if bundled_data_dir.exists() {
                    log::info!("找到内置数据目录: {:?}", bundled_data_dir);

                    // 复制邮箱数据文件
                    let bundled_email = bundled_data_dir.join("email-data.json");
                    if bundled_email.exists() && !self.email_data_path.exists() {
                        fs::copy(&bundled_email, &self.email_data_path)?;
                        log::info!("已复制邮箱数据文件");
                    }

                    // 复制元数据配置文件
                    let bundled_metadata = bundled_data_dir.join("wmn-metadata.json");
                    if bundled_metadata.exists() && !self.metadata_path.exists() {
                        fs::copy(&bundled_metadata, &self.metadata_path)?;
                        log::info!("已复制元数据配置文件");
                    }

                    // 复制用户代理文件
                    let bundled_useragents = bundled_data_dir.join("useragents.txt");
                    if bundled_useragents.exists() && !self.user_agents_path.exists() {
                        fs::copy(&bundled_useragents, &self.user_agents_path)?;
                        log::info!("已复制用户代理文件");
                    }

                    // 复制用户名数据文件
                    let bundled_wmn = bundled_data_dir.join("wmn-data.json");
                    if bundled_wmn.exists() && !self.sites_data_path.exists() {
                        fs::copy(&bundled_wmn, &self.sites_data_path)?;
                        log::info!("已复制用户名数据文件");
                    }

                    return Ok(());
                }
            }

            log::warn!("未找到内置数据目录，将使用在线下载");
        }

        Ok(())
    }

    /// 检查是否为首次启动
    pub fn is_first_launch(&self) -> bool {
        !self.first_launch_flag_path.exists()
    }

    /// 设置免责声明已接受
    pub fn set_disclaimer_accepted(&self) -> AppResult<()> {
        fs::write(&self.first_launch_flag_path, "accepted")?;
        Ok(())
    }

    /// 读取用户代理列表
    pub async fn read_user_agents(&self) -> AppResult<Vec<String>> {
        if self.user_agents_path.exists() {
            let content = async_fs::read_to_string(&self.user_agents_path).await?;
            Ok(content.lines().map(|line| line.to_string()).collect())
        } else {
            // 如果文件不存在，返回默认用户代理
            Ok(vec![
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36".to_string(),
            ])
        }
    }

    /// 获取随机用户代理
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

/// 全局应用配置实例
pub static APP_CONFIG: Lazy<AppConfig> =
    Lazy::new(|| AppConfig::new().expect("无法初始化应用配置"));
