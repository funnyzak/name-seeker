use crate::core::error::{AppError, AppResult};
use crate::core::models::{
    MetadataItem, SearchConfig, SearchProgress, SearchResult, SearchResultStatus, SearchType,
    SearchUpdatePayload,
};
use crate::core::sites::SitesManager;
use crate::core::utils::{extract_html_data, extract_json_data, random_delay_ms};
use futures::future::join_all;
use reqwest::Client;
use serde_json::Value;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use tokio::time::timeout;

/// Search engine
pub struct SearchEngine {
    client: Client,
    config: SearchConfig,
}

impl SearchEngine {
    /// Create a new search engine instance
    pub fn new(config: SearchConfig) -> AppResult<Self> {
        let client = Client::builder()
            .user_agent(&config.user_agent)
            .timeout(Duration::from_secs(config.timeout_seconds))
            .build()?;

        Ok(Self { client, config })
    }

    /// Get the total number of websites to search
    pub async fn get_total_sites(&self, sites_manager: &SitesManager) -> AppResult<u32> {
        let sites = sites_manager
            .get_filtered_sites(
                &crate::core::config::APP_CONFIG,
                &self.config.search_type,
                self.config.exclude_nsfw,
                self.config.category_filter.as_deref(),
            )
            .await?;

        Ok(sites.len() as u32)
    }

    /// Execute search
    pub async fn search<F, P>(
        &self,
        sites_manager: &SitesManager,
        update_callback: F,
        progress_callback: P,
    ) -> AppResult<Vec<SearchResult>>
    where
        F: Fn(SearchUpdatePayload) + Send + Sync + 'static,
        P: Fn(crate::core::models::SearchProgressPayload) + Send + Sync + 'static,
    {
        let search_type_desc = match self.config.search_type {
            SearchType::Username => "username",
            SearchType::Email => "email",
        };
        log::info!("Starting search for {}: {}", search_type_desc, self.config.query);

        // Get website list
        let sites = sites_manager
            .get_filtered_sites(
                &crate::core::config::APP_CONFIG,
                &self.config.search_type,
                self.config.exclude_nsfw,
                self.config.category_filter.as_deref(),
            )
            .await?;

        log::info!("Preparing to check {} websites", sites.len());

        // Get metadata configuration
        let metadata_config = sites_manager
            .get_metadata_config(&crate::core::config::APP_CONFIG)
            .await?;

        let start_time = Instant::now();
        let progress = Arc::new(tokio::sync::Mutex::new(SearchProgress::new(
            sites.len() as u32
        )));
        let semaphore = Arc::new(Semaphore::new(self.config.max_concurrent_requests));
        let update_callback = Arc::new(update_callback);
        let progress_callback = Arc::new(progress_callback);

        // Create search tasks
        let tasks: Vec<_> = sites
            .into_iter()
            .map(|site| {
                let engine = self.clone();
                let semaphore = semaphore.clone();
                let progress = progress.clone();
                let update_callback = update_callback.clone();
                let progress_callback = progress_callback.clone();
                let metadata_config = metadata_config.clone();

                async move {
                    let _permit = semaphore.acquire().await?;
                    let result = engine.check_site(&site, &metadata_config).await?;

                    // Update progress
                    {
                        let mut p = progress.lock().await;
                        p.increment_checked();
                        match result.status {
                            SearchResultStatus::Found => p.increment_found(),
                            SearchResultStatus::Error => p.increment_error(),
                            _ => {}
                        }

                        // Send individual result update
                        let update_payload = SearchUpdatePayload {
                            site: result.site.clone(),
                            status: result.status.clone(),
                            url: result.url.clone(),
                            error: result.error.clone(),
                            category: result.category.clone(),
                            metadata: result.metadata.clone(),
                        };
                        update_callback(update_payload);

                        // Send overall progress update
                        let progress_payload = crate::core::models::SearchProgressPayload {
                            total_sites: p.total_sites,
                            checked_sites: p.checked_sites,
                            found_count: p.found_count,
                            error_count: p.error_count,
                            percentage: p.percentage(),
                            current_site: Some(result.site.clone()),
                        };
                        progress_callback(progress_payload);
                    }

                    Ok::<SearchResult, AppError>(result)
                }
            })
            .collect();

        // Wait for all tasks to complete
        let results = join_all(tasks).await;
        let mut search_results = Vec::new();

        for result in results {
            match result {
                Ok(search_result) => search_results.push(search_result),
                Err(e) => {
                    log::error!("Search task failed: {}", e);
                    // Continue processing other results
                }
            }
        }

        let duration = start_time.elapsed();
        log::info!(
            "Search completed in {}ms, found {} accounts",
            duration.as_millis(),
            search_results
                .iter()
                .filter(|r| r.status == SearchResultStatus::Found)
                .count()
        );

        Ok(search_results)
    }

    /// Check a single website
    async fn check_site(
        &self,
        site: &crate::core::models::Site,
        metadata_config: &std::collections::HashMap<String, Vec<Value>>,
    ) -> AppResult<SearchResult> {
        // Process input operations (such as email hashing)
        let processed_query =
            self.process_input(&self.config.query, site.input_operation.as_deref())?;

        // Replace placeholders in URL
        let url = site.uri_check.replace("{account}", &processed_query);

        // Process POST data
        let post_data = site
            .data
            .as_ref()
            .map(|d| d.replace("{account}", &processed_query));

        let result = SearchResult {
            site: site.name.clone(),
            status: SearchResultStatus::Pending,
            url: Some(url.clone()),
            error: None,
            category: Some(site.cat.clone()),
            metadata: None,
        };

        // Add random delay to avoid detection
        let delay_ms = random_delay_ms(100, 500);
        tokio::time::sleep(Duration::from_millis(delay_ms)).await;

        // Build HTTP request
        let mut request_builder = match site.method.to_uppercase().as_str() {
            "POST" => {
                let mut builder = self.client.post(&url);
                if let Some(data) = post_data {
                    builder = builder.body(data);
                }
                builder
            }
            _ => self.client.get(&url),
        };

        // Add custom request headers
        if let Some(headers) = &site.headers {
            if let Some(headers_obj) = headers.as_object() {
                for (key, value) in headers_obj {
                    if let Some(val_str) = value.as_str() {
                        request_builder = request_builder.header(key, val_str);
                    }
                }
            }
        }

        // Send HTTP request
        let response_result = timeout(
            Duration::from_secs(self.config.timeout_seconds),
            request_builder.send(),
        )
        .await;

        let response = match response_result {
            Ok(Ok(response)) => response,
            Ok(Err(e)) => {
                return Ok(SearchResult {
                    status: SearchResultStatus::Error,
                    error: Some(format!("HTTP request failed: {}", e)),
                    ..result
                });
            }
            Err(_) => {
                return Ok(SearchResult {
                    status: SearchResultStatus::Error,
                    error: Some("Request timeout".to_string()),
                    ..result
                });
            }
        };

        let status_code = response.status().as_u16();
        let content_result = response.text().await;

        let content = match content_result {
            Ok(content) => content,
            Err(e) => {
                return Ok(SearchResult {
                    status: SearchResultStatus::Error,
                    error: Some(format!("Failed to read response content: {}", e)),
                    ..result
                });
            }
        };

        // Check if account exists
        let (status, metadata) = self
            .analyze_response(site, &content, status_code, metadata_config)
            .await?;

        Ok(SearchResult {
            status,
            metadata: if metadata.is_empty() {
                None
            } else {
                Some(metadata)
            },
            ..result
        })
    }

    /// Analyze response content
    async fn analyze_response(
        &self,
        site: &crate::core::models::Site,
        content: &str,
        status_code: u16,
        metadata_config: &std::collections::HashMap<String, Vec<Value>>,
    ) -> AppResult<(SearchResultStatus, Vec<MetadataItem>)> {
        // Check if account exists
        let account_exists = (content.contains(&site.e_string) && status_code == site.e_code)
            && (!content.contains(&site.m_string) || status_code != site.m_code);

        if !account_exists {
            return Ok((SearchResultStatus::NotFound, Vec::new()));
        }

        // Account exists, try to extract metadata
        let mut metadata = Vec::new();

        if let Some(site_metadata) = metadata_config.get(&site.name) {
            for metadata_item in site_metadata {
                if let Ok(extracted) = self
                    .extract_metadata_item(site, metadata_item, content)
                    .await
                {
                    metadata.extend(extracted);
                }
            }
        }

        Ok((SearchResultStatus::Found, metadata))
    }

    /// Extract metadata item
    async fn extract_metadata_item(
        &self,
        _site: &crate::core::models::Site,
        metadata_config: &Value,
        content: &str,
    ) -> AppResult<Vec<MetadataItem>> {
        let mut results = Vec::new();

        // Get configuration
        let schema = metadata_config["schema"].as_str().unwrap_or("unknown");
        let data_type = metadata_config["type"].as_str().unwrap_or("string");
        let name = metadata_config["name"].as_str().unwrap_or("unknown");
        let path = &metadata_config["path"];

        match schema {
            "JSON" => {
                // Try to parse JSON response
                if let Ok(json_value) = serde_json::from_str::<Value>(content) {
                    if let Ok(path_array) = self.extract_path_array(path) {
                        if let Some(extracted_value) = extract_json_data(&path_array, &json_value)?
                        {
                            let metadata_item = MetadataItem {
                                name: name.to_string(),
                                value: extracted_value,
                                data_type: data_type.to_string(),
                            };
                            results.push(metadata_item);
                        }
                    }
                }
            }
            "HTML" => {
                // HTML parsing
                if let Some(path_str) = path.as_str() {
                    if let Some(extracted_value) = extract_html_data(path_str, content)? {
                        let metadata_item = MetadataItem {
                            name: name.to_string(),
                            value: Value::String(extracted_value),
                            data_type: data_type.to_string(),
                        };
                        results.push(metadata_item);
                    }
                }
            }
            _ => {
                log::warn!("Unsupported metadata schema: {}", schema);
            }
        }

        Ok(results)
    }

    /// Extract path array from configuration
    fn extract_path_array(&self, path: &Value) -> AppResult<Vec<String>> {
        match path {
            Value::Array(arr) => {
                let path_array: Result<Vec<String>, _> = arr
                    .iter()
                    .map(|v| {
                        v.as_str()
                            .ok_or_else(|| {
                                AppError::SearchError("Path elements must be strings".to_string())
                            })
                            .map(|s| s.to_string())
                    })
                    .collect();
                path_array
            }
            Value::String(s) => {
                // If it's a string, try to parse as path
                Ok(vec![s.to_string()])
            }
            _ => Err(AppError::SearchError("Invalid path format".to_string())),
        }
    }

    /// Process input operations (such as email hashing)
    fn process_input(&self, input: &str, operation: Option<&str>) -> AppResult<String> {
        match operation {
            Some("hash-sha256") => {
                use sha2::{Digest, Sha256};
                let mut hasher = Sha256::new();
                hasher.update(input.trim().to_lowercase().as_bytes());
                let result = hasher.finalize();
                Ok(format!("{:x}", result))
            }
            Some("hash-md5") => {
                use md5::{Digest, Md5};
                let mut hasher = Md5::new();
                hasher.update(input.trim().to_lowercase().as_bytes());
                let result = hasher.finalize();
                Ok(format!("{:x}", result))
            }
            Some("lowercase") => Ok(input.to_lowercase()),
            Some("uppercase") => Ok(input.to_uppercase()),
            Some(op) => {
                log::warn!("Unsupported input operation: {}", op);
                Ok(input.to_string())
            }
            None => Ok(input.to_string()),
        }
    }
}

impl Clone for SearchEngine {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            config: self.config.clone(),
        }
    }
}
