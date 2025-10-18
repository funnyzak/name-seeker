use crate::core::error::AppError;
use crate::core::models::{ExportFormat, ExportOptions, SearchResult, SearchResultStatus};
use std::fs;
use std::path::PathBuf;

/// Export results to file
pub fn export_results(options: ExportOptions) -> Result<String, AppError> {
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

    let filename = format!(
        "name_seeker_{}_{}.{}",
        options.username,
        timestamp,
        match options.format {
            ExportFormat::Pdf => "pdf",
            ExportFormat::Csv => "csv",
            ExportFormat::Json => "json",
            ExportFormat::Txt => "txt",
        }
    );

    // Get downloads directory
    let downloads_dir = dirs::download_dir()
        .ok_or_else(|| AppError::ExportError("Unable to get downloads directory".to_string()))?;

    let file_path = downloads_dir.join(filename);

    // Export based on format
    match options.format {
        ExportFormat::Json => export_json(&found_results, &file_path)?,
        ExportFormat::Csv => export_csv(&found_results, &file_path)?,
        ExportFormat::Pdf => export_pdf(&found_results, &options.username, &file_path)?,
        ExportFormat::Txt => export_txt(&found_results, &file_path)?,
    }

    Ok(file_path.to_string_lossy().to_string())
}

/// Export as TXT
fn export_txt(results: &[&SearchResult], file_path: &PathBuf) -> Result<(), AppError> {
    let txt_data = results
        .iter()
        .map(|r| format!("{}: {}", r.site, r.url.as_deref().unwrap_or("N/A")))
        .collect::<Vec<String>>()
        .join("\n");
    fs::write(file_path, txt_data)
        .map_err(|e| AppError::ExportError(format!("Failed to write TXT file: {}", e)))?;
    Ok(())
}

/// Export as JSON
fn export_json(results: &[&SearchResult], file_path: &PathBuf) -> Result<(), AppError> {
    let json_data = serde_json::to_string_pretty(&results)
        .map_err(|e| AppError::ExportError(format!("JSON serialization failed: {}", e)))?;

    fs::write(file_path, json_data)
        .map_err(|e| AppError::ExportError(format!("Failed to write JSON file: {}", e)))?;

    Ok(())
}

/// Export as CSV
fn export_csv(results: &[&SearchResult], file_path: &PathBuf) -> Result<(), AppError> {
    let mut writer = csv::Writer::from_path(file_path)
        .map_err(|e| AppError::ExportError(format!("Failed to create CSV file: {}", e)))?;

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

/// Export as PDF
fn export_pdf(
    results: &[&SearchResult],
    username: &str,
    file_path: &PathBuf,
) -> Result<(), AppError> {
    use printpdf::*;
    use std::fs::File;
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
    let file = File::create(file_path)
        .map_err(|e| AppError::ExportError(format!("Failed to create PDF file: {}", e)))?;
    let mut writer = BufWriter::new(file);

    doc.save(&mut writer)
        .map_err(|e| AppError::ExportError(format!("Failed to save PDF file: {}", e)))?;

    Ok(())
}
