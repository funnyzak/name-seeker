use crate::core::error::{AppError, AppResult};
use crate::core::models::{
    MetadataItem, SearchConfig, SearchProgress, SearchResult, SearchResultStatus, SearchType,
    SearchUpdatePayload,
};
use crate::core::sites::SitesManager;
use crate::core::utils::{append_log_line, extract_html_data, extract_json_data, random_delay_ms};
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
    user_agents: Vec<String>,
}

impl SearchEngine {
    /// Create a new search engine instance
    pub fn new(config: SearchConfig) -> AppResult<Self> {
        let mut builder = Client::builder()
            .user_agent(&config.user_agent)
            .timeout(Duration::from_secs(config.timeout_seconds));

        if let Some(proxy_url) = &config.proxy {
            builder = builder.proxy(reqwest::Proxy::all(proxy_url)?);
        }

        let client = builder.build()?;

        Ok(Self {
            client,
            user_agents: config.user_agents.clone(),
            config,
        })
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
        // Remove site-specific characters before applying input operations.
        let query: String = self
            .config
            .query
            .chars()
            .filter(|character| {
                !site
                    .strip_bad_char
                    .as_deref()
                    .unwrap_or("")
                    .contains(*character)
            })
            .collect();
        let processed_query = self.process_input(&query, site.input_operation.as_deref())?;

        // Replace placeholders in URL
        let url = site.uri_check.replace("{account}", &processed_query);

        // Process POST data
        let post_data = site
            .post_body
            .as_ref()
            .or(site.data.as_ref())
            .map(|d| d.replace("{account}", &processed_query));

        let profile_url = site
            .uri_pretty
            .as_ref()
            .and_then(|template| {
                let candidate = template.replace("{account}", &processed_query);
                match url::Url::parse(&candidate) {
                    Ok(parsed)
                        if matches!(parsed.scheme(), "http" | "https") && parsed.has_host() =>
                    {
                        Some(candidate)
                    }
                    _ => {
                        log::warn!("Ignoring invalid profile URL for website {:?}", site.name);
                        None
                    }
                }
            })
            .unwrap_or_else(|| url.clone());

        let result = SearchResult {
            site: site.name.clone(),
            status: SearchResultStatus::Pending,
            url: Some(profile_url),
            error: None,
            category: Some(site.cat.clone()),
            metadata: None,
        };

        // Add random delay to avoid detection
        let delay_ms = random_delay_ms(100, 500);
        tokio::time::sleep(Duration::from_millis(delay_ms)).await;

        // Build HTTP request with retries and per-request User-Agent
        let mut last_error: Option<String> = None;

        for attempt in 1..=self.config.max_retries.max(1) {
            let user_agent = self.pick_user_agent();

            let mut request_builder =
                if site.post_body.is_some() || site.method.eq_ignore_ascii_case("POST") {
                    let mut builder = self.client.post(&url);
                    if let Some(data) = post_data.clone() {
                        builder = builder.body(data);
                    }
                    builder
                } else {
                    self.client.get(&url)
                };

            request_builder = request_builder.header("User-Agent", user_agent);

            if let Some(headers) = &site.headers {
                if let Some(headers_obj) = headers.as_object() {
                    for (key, value) in headers_obj {
                        if let Some(val_str) = value.as_str() {
                            request_builder = request_builder.header(key, val_str);
                        }
                    }
                }
            }

            let response_result = timeout(
                Duration::from_secs(self.config.timeout_seconds),
                request_builder.send(),
            )
            .await;

            match response_result {
                Ok(Ok(response)) => {
                    let status_code = response.status().as_u16();
                    let content_result = response.text().await;

                    let content = match content_result {
                        Ok(content) => content,
                        Err(e) => {
                            last_error = Some(format!("Failed to read response content: {}", e));
                            continue;
                        }
                    };

                    // Check if account exists
                    let (status, metadata) = self
                        .analyze_response(site, &content, status_code, metadata_config)
                        .await?;

                    return Ok(SearchResult {
                        status,
                        metadata: if metadata.is_empty() {
                            None
                        } else {
                            Some(metadata)
                        },
                        ..result
                    });
                }
                Ok(Err(e)) => {
                    let message = format!("HTTP request failed: {}", e);
                    last_error = Some(message.clone());

                    if attempt == self.config.max_retries {
                        append_log_line(
                            &crate::core::config::APP_CONFIG.log_path,
                            &format!("{} - request failed after retries: {}", site.name, message),
                        )
                        .await;
                        return Ok(SearchResult {
                            status: SearchResultStatus::Error,
                            error: Some(message),
                            ..result
                        });
                    }
                }
                Err(_) => {
                    let message = "Request timeout".to_string();
                    last_error = Some(message.clone());

                    if attempt == self.config.max_retries {
                        append_log_line(
                            &crate::core::config::APP_CONFIG.log_path,
                            &format!("{} - request timed out after retries", site.name),
                        )
                        .await;
                        return Ok(SearchResult {
                            status: SearchResultStatus::Error,
                            error: Some(message),
                            ..result
                        });
                    }
                }
            }

            let backoff_factor = 2u64.pow((attempt.saturating_sub(1)) as u32);
            let backoff = self
                .config
                .retry_backoff_ms
                .saturating_mul(backoff_factor);
            tokio::time::sleep(Duration::from_millis(backoff)).await;
        }

        Ok(SearchResult {
            status: SearchResultStatus::Error,
            error: last_error,
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

    fn pick_user_agent(&self) -> String {
        use rand::seq::SliceRandom;

        if let Some(ua) = self
            .user_agents
            .choose(&mut rand::thread_rng())
            .cloned()
        {
            ua
        } else {
            self.config.user_agent.clone()
        }
    }
}

impl Clone for SearchEngine {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            config: self.config.clone(),
            user_agents: self.user_agents.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    // Capture the actual HTTP bytes, including the body, without contacting a provider.
    async fn check_request(
        extra: Value,
        expected_method: &str,
        expected_body: &str,
    ) -> SearchResult {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = Vec::new();
            loop {
                let mut buffer = [0; 4096];
                let count = socket.read(&mut buffer).await.unwrap();
                assert!(count > 0, "request ended before body was received");
                request.extend_from_slice(&buffer[..count]);
                if let Some(end) = request.windows(4).position(|part| part == b"\r\n\r\n") {
                    let headers = String::from_utf8_lossy(&request[..end]).to_lowercase();
                    let length = headers
                        .lines()
                        .find_map(|line| {
                            line.strip_prefix("content-length:")
                                .map(|value| value.trim().parse::<usize>().unwrap())
                        })
                        .unwrap_or(0);
                    if request.len() >= end + 4 + length {
                        break;
                    }
                }
            }
            socket
                .write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Length: 6\r\nConnection: close\r\n\r\nexists",
                )
                .await
                .unwrap();
            String::from_utf8(request).unwrap()
        });
        let mut entry = serde_json::json!({
            "name": "Mock", "uri_check": format!("http://{address}/check/{{account}}"),
            "e_code": 200, "e_string": "exists", "m_code": 404,
            "m_string": "missing", "cat": "social"
        });
        entry
            .as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        let site = serde_json::from_value(entry).unwrap();
        let engine = SearchEngine::new(SearchConfig {
            query: "alice.test".into(),
            timeout_seconds: 3,
            max_retries: 1,
            ..SearchConfig::default()
        })
        .unwrap();
        let result = engine.check_site(&site, &Default::default()).await.unwrap();
        let request = timeout(Duration::from_secs(5), server)
            .await
            .unwrap()
            .unwrap();
        assert!(
            request.starts_with(&format!("{expected_method} /check/alicetest HTTP/1.1\r\n")),
            "{request}"
        );
        assert_eq!(request.split_once("\r\n\r\n").unwrap().1, expected_body);
        assert_eq!(result.status, SearchResultStatus::Found);
        if let Some(content_type) = extra["headers"]["Content-Type"].as_str() {
            assert!(request
                .to_lowercase()
                .contains(&format!("content-type: {}", content_type.to_lowercase())));
        }
        result
    }

    fn fields(extra: Value) -> Value {
        let mut fields = serde_json::json!({"strip_bad_char": ".", "uri_pretty": "https://example.com/{account}"});
        fields
            .as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        fields
    }

    #[tokio::test]
    async fn wmn_json_post() {
        let result = check_request(fields(serde_json::json!({"post_body": "{\"username\":\"{account}\"}", "headers": {"Content-Type": "application/json"}})), "POST", "{\"username\":\"alicetest\"}").await;
        assert_eq!(result.url.as_deref(), Some("https://example.com/alicetest"));
    }

    #[tokio::test]
    async fn wmn_form_post() {
        check_request(fields(serde_json::json!({"post_body": "username={account}", "headers": {"Content-Type": "application/x-www-form-urlencoded"}})), "POST", "username=alicetest").await;
    }

    #[tokio::test]
    async fn legacy_email_post() {
        check_request(fields(serde_json::json!({"method": "post", "data": "email={account}", "headers": {"Content-Type": "application/x-www-form-urlencoded"}})), "POST", "email=alicetest").await;
    }

    #[tokio::test]
    async fn default_get() {
        check_request(fields(serde_json::json!({})), "GET", "").await;
    }

    #[tokio::test]
    async fn post_body_takes_precedence() {
        check_request(
            fields(
                serde_json::json!({"method": "GET", "data": "ignored", "post_body": "{account}"}),
            ),
            "POST",
            "alicetest",
        )
        .await;
    }

    #[tokio::test]
    async fn empty_post_body_still_selects_post() {
        check_request(fields(serde_json::json!({"post_body": ""})), "POST", "").await;
    }

    #[tokio::test]
    async fn invalid_profile_urls_fall_back_to_check_url() {
        for profile in [
            "file:///Applications/Calculator.app",
            "custom://open",
            "javascript:alert(1)",
            "invalid",
            "",
        ] {
            let result = check_request(
                fields(serde_json::json!({"uri_pretty": profile})),
                "GET",
                "",
            )
            .await;
            let url = result.url.unwrap();
            assert!(url.starts_with("http://127.0.0.1:"), "{url}");
            assert!(url.ends_with("/check/alicetest"), "{url}");
        }
    }

    #[tokio::test]
    async fn absent_profile_url_falls_back_to_check_url() {
        let result = check_request(serde_json::json!({"strip_bad_char": "."}), "GET", "").await;
        assert!(result.url.unwrap().ends_with("/check/alicetest"));
    }
}
