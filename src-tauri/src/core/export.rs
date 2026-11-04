use crate::core::error::AppError;
use crate::core::models::{ExportFormat, ExportOptions, SearchResult, SearchResultStatus};
use std::fs;
use std::io::Write;
use std::path::Path;

/// Export results to file
pub fn export_results(options: ExportOptions) -> Result<String, AppError> {
    let dir = dirs::download_dir()
        .ok_or_else(|| AppError::ExportError("Unable to get downloads directory".to_string()))?;
    export_to(options, &dir)
}

fn filename_part(value: &str) -> String {
    let mut part = String::new();
    for c in value.chars() {
        let safe = if c.is_alphanumeric() || matches!(c, '@' | '.' | '-' | '_') {
            c
        } else {
            '_'
        };
        if part.len() + safe.len_utf8() > 96 {
            break;
        }
        part.push(safe);
    }
    part
}

fn export_to(options: ExportOptions, dir: &Path) -> Result<String, AppError> {
    // Only export found results
    let found_results: Vec<&SearchResult> = options
        .results
        .iter()
        .filter(|r| r.status == SearchResultStatus::Found)
        .collect();

    if found_results.is_empty() {
        return Err(AppError::ExportError("No results to export".to_string()));
    }

    // Generate filename
    let timestamp = options
        .timestamp
        .clone()
        .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string());

    let stem = format!(
        "name_seeker_{}_{}",
        filename_part(&options.username),
        filename_part(&timestamp)
    );
    let extension = match options.format {
        ExportFormat::Pdf => "pdf",
        ExportFormat::Csv => "csv",
        ExportFormat::Json => "json",
        ExportFormat::Txt => "txt",
    };
    let mut suffix = 0u64;
    loop {
        let filename = if suffix == 0 {
            format!("{stem}.{extension}")
        } else {
            format!("{stem}_{suffix}.{extension}")
        };
        let path = dir.join(filename);
        let file = match fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
        {
            Ok(file) => file,
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                suffix += 1;
                continue;
            }
            Err(e) => return Err(e.into()),
        };
        let result = match options.format {
            ExportFormat::Json => export_json(&found_results, file),
            ExportFormat::Csv => export_csv(&found_results, file),
            ExportFormat::Pdf => export_pdf(&found_results, &options.username, file),
            ExportFormat::Txt => export_txt(&found_results, file),
        };
        if let Err(error) = result {
            let _ = fs::remove_file(&path);
            return Err(error);
        }
        return Ok(path.to_string_lossy().into_owned());
    }
}

/// Export as TXT
fn export_txt(results: &[&SearchResult], mut file: fs::File) -> Result<(), AppError> {
    let txt_data = results
        .iter()
        .map(|r| format!("{}: {}", r.site, r.url.as_deref().unwrap_or("N/A")))
        .collect::<Vec<String>>()
        .join("\n");
    file.write_all(txt_data.as_bytes())
        .map_err(|e| AppError::ExportError(format!("Failed to write TXT file: {}", e)))?;
    Ok(())
}

/// Export as JSON
fn export_json(results: &[&SearchResult], mut file: fs::File) -> Result<(), AppError> {
    let json_data = serde_json::to_string_pretty(&results)
        .map_err(|e| AppError::ExportError(format!("JSON serialization failed: {}", e)))?;

    file.write_all(json_data.as_bytes())
        .map_err(|e| AppError::ExportError(format!("Failed to write JSON file: {}", e)))?;

    Ok(())
}

/// Export as CSV
fn export_csv(results: &[&SearchResult], file: fs::File) -> Result<(), AppError> {
    let mut writer = csv::Writer::from_writer(file);

    // Write header
    writer
        .write_record(&["Site", "URL", "Category"])
        .map_err(|e| AppError::ExportError(format!("Failed to write CSV header: {}", e)))?;

    // Write data
    for result in results {
        writer
            .write_record(&[
                &result.site,
                result.url.as_deref().unwrap_or("N/A"),
                result.category.as_deref().unwrap_or("Uncategorized"),
            ])
            .map_err(|e| AppError::ExportError(format!("Failed to write CSV data: {}", e)))?;
    }

    writer
        .flush()
        .map_err(|e| AppError::ExportError(format!("Failed to save CSV file: {}", e)))?;

    Ok(())
}

#[cfg(target_os = "macos")]
fn export_pdf(
    results: &[&SearchResult],
    username: &str,
    mut file: fs::File,
) -> Result<(), AppError> {
    use std::os::fd::AsRawFd;

    extern "C" {
        fn name_seeker_write_pdf(bytes: *const u8, len: usize, fd: i32) -> bool;
    }

    let report = serde_json::to_vec(&serde_json::json!({
        "username": username,
        "generated": chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        "results": results
    }))?;
    // The renderer borrows the byte slice and file descriptor for this call only.
    if !unsafe { name_seeker_write_pdf(report.as_ptr(), report.len(), file.as_raw_fd()) } {
        return Err(AppError::ExportError("Failed to render PDF".into()));
    }
    file.flush()?;
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn export_pdf(results: &[&SearchResult], username: &str, file: fs::File) -> Result<(), AppError> {
    use printpdf::*;
    use std::io::BufWriter;

    // Create PDF document
    let (doc, page1, layer1) = PdfDocument::new(
        format!("Search Results - {}", username),
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    // Track current page and layer
    let mut current_page = page1;
    let mut current_layer_idx = layer1;

    // Load fonts (using built-in fonts)
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::ExportError(format!("Failed to load font: {}", e)))?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::ExportError(format!("Failed to load bold font: {}", e)))?;

    // Set initial position
    let mut y_position = 280.0;
    let x_margin = 20.0;

    // Title
    let layer = doc.get_page(current_page).get_layer(current_layer_idx);
    layer.use_text(
        format!("Search Results for: {}", username),
        18.0,
        Mm(x_margin),
        Mm(y_position),
        &font_bold,
    );
    y_position -= 10.0;

    // Timestamp
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let layer = doc.get_page(current_page).get_layer(current_layer_idx);
    layer.use_text(
        format!("Generated: {}", timestamp),
        10.0,
        Mm(x_margin),
        Mm(y_position),
        &font,
    );
    y_position -= 10.0;

    // Statistics
    let layer = doc.get_page(current_page).get_layer(current_layer_idx);
    layer.use_text(
        format!("Total Results Found: {}", results.len()),
        12.0,
        Mm(x_margin),
        Mm(y_position),
        &font_bold,
    );
    y_position -= 15.0;

    // Results list
    for (index, result) in results.iter().enumerate() {
        // Check if new page is needed
        if y_position < 30.0 {
            let (page_idx, layer_idx) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
            current_page = page_idx;
            current_layer_idx = layer_idx;
            y_position = 280.0;
        }

        // Get current layer
        let layer = doc.get_page(current_page).get_layer(current_layer_idx);

        // Number and site name
        layer.use_text(
            format!("{}. {}", index + 1, result.site),
            11.0,
            Mm(x_margin),
            Mm(y_position),
            &font_bold,
        );
        y_position -= 5.0;

        // URL
        if let Some(url) = &result.url {
            let layer = doc.get_page(current_page).get_layer(current_layer_idx);
            layer.use_text(
                format!("   URL: {}", url),
                9.0,
                Mm(x_margin + 5.0),
                Mm(y_position),
                &font,
            );
            y_position -= 5.0;
        }

        // Category
        if let Some(category) = &result.category {
            let layer = doc.get_page(current_page).get_layer(current_layer_idx);
            layer.use_text(
                format!("   Category: {}", category),
                9.0,
                Mm(x_margin + 5.0),
                Mm(y_position),
                &font,
            );
            y_position -= 5.0;
        }

        y_position -= 3.0; // Spacing between results
    }

    // Save PDF
    let mut writer = BufWriter::new(file);

    doc.save(&mut writer)
        .map_err(|e| AppError::ExportError(format!("Failed to save PDF file: {}", e)))?;

    writer.flush()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn writes_all_formats_without_overwriting_or_leaving_the_directory() {
        let dir = std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());
        fs::create_dir(&dir).unwrap();
        for format in [
            ExportFormat::Pdf,
            ExportFormat::Json,
            ExportFormat::Csv,
            ExportFormat::Txt,
        ] {
            let options = ExportOptions {
                format,
                username: "../test@example.org".into(),
                timestamp: Some("same/time".into()),
                results: vec![SearchResult {
                    site: "Example".into(),
                    status: SearchResultStatus::Found,
                    url: Some("https://example.org".into()),
                    error: None,
                    category: None,
                    metadata: None,
                }],
            };
            let first = export_to(options.clone(), &dir).unwrap();
            let second = export_to(options, &dir).unwrap();
            assert_ne!(first, second);
            assert_eq!(Path::new(&first).parent(), Some(dir.as_path()));
            let data = fs::read(&first).unwrap();
            match Path::new(&first).extension().unwrap().to_str().unwrap() {
                "pdf" => assert!(data.starts_with(b"%PDF")),
                "json" => assert_eq!(
                    serde_json::from_slice::<serde_json::Value>(&data).unwrap()[0]["site"],
                    "Example"
                ),
                "csv" => assert_eq!(
                    &csv::Reader::from_reader(data.as_slice())
                        .records()
                        .next()
                        .unwrap()
                        .unwrap()[0],
                    "Example"
                ),
                "txt" => assert_eq!(data, b"Example: https://example.org"),
                _ => unreachable!(),
            }
        }
        fs::remove_dir_all(dir).unwrap();
    }
}
