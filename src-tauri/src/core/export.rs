use crate::core::error::AppError;
use crate::core::models::{ExportFormat, ExportOptions, SearchResult, SearchResultStatus};
use std::fs;
use std::path::PathBuf;

/// 导出结果到文件
pub fn export_results(options: ExportOptions) -> Result<String, AppError> {
    // 只导出找到的结果
    let found_results: Vec<&SearchResult> = options
        .results
        .iter()
        .filter(|r| r.status == SearchResultStatus::Found)
        .collect();

    if found_results.is_empty() {
        return Err(AppError::ExportError("没有可导出的结果".to_string()));
    }

    // 生成文件名
    let timestamp = options
        .timestamp
        .clone()
        .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string());

    let filename = format!(
        "search_my_name_{}_{}.{}",
        options.username,
        timestamp,
        match options.format {
            ExportFormat::Pdf => "pdf",
            ExportFormat::Csv => "csv",
            ExportFormat::Json => "json",
            ExportFormat::Txt => "txt",
        }
    );

    // 获取下载目录
    let downloads_dir = dirs::download_dir()
        .ok_or_else(|| AppError::ExportError("无法获取下载目录".to_string()))?;

    let file_path = downloads_dir.join(filename);

    // 根据格式导出
    match options.format {
        ExportFormat::Json => export_json(&found_results, &file_path)?,
        ExportFormat::Csv => export_csv(&found_results, &file_path)?,
        ExportFormat::Pdf => export_pdf(&found_results, &options.username, &file_path)?,
        ExportFormat::Txt => export_txt(&found_results, &file_path)?,
    }

    Ok(file_path.to_string_lossy().to_string())
}

/// 导出为 TXT
fn export_txt(results: &[&SearchResult], file_path: &PathBuf) -> Result<(), AppError> {
    let txt_data = results
        .iter()
        .map(|r| format!("{}: {}", r.site, r.url.as_deref().unwrap_or("N/A")))
        .collect::<Vec<String>>()
        .join("\n");
    fs::write(file_path, txt_data)
        .map_err(|e| AppError::ExportError(format!("写入 TXT 文件失败: {}", e)))?;
    Ok(())
}

/// 导出为 JSON
fn export_json(results: &[&SearchResult], file_path: &PathBuf) -> Result<(), AppError> {
    let json_data = serde_json::to_string_pretty(&results)
        .map_err(|e| AppError::ExportError(format!("JSON 序列化失败: {}", e)))?;

    fs::write(file_path, json_data)
        .map_err(|e| AppError::ExportError(format!("写入 JSON 文件失败: {}", e)))?;

    Ok(())
}

/// 导出为 CSV
fn export_csv(results: &[&SearchResult], file_path: &PathBuf) -> Result<(), AppError> {
    let mut writer = csv::Writer::from_path(file_path)
        .map_err(|e| AppError::ExportError(format!("创建 CSV 文件失败: {}", e)))?;

    // 写入表头
    writer
        .write_record(&["Site", "URL", "Category"])
        .map_err(|e| AppError::ExportError(format!("写入 CSV 表头失败: {}", e)))?;

    // 写入数据
    for result in results {
        writer
            .write_record(&[
                &result.site,
                result.url.as_deref().unwrap_or("N/A"),
                result.category.as_deref().unwrap_or("Uncategorized"),
            ])
            .map_err(|e| AppError::ExportError(format!("写入 CSV 数据失败: {}", e)))?;
    }

    writer
        .flush()
        .map_err(|e| AppError::ExportError(format!("保存 CSV 文件失败: {}", e)))?;

    Ok(())
}

/// 导出为 PDF
fn export_pdf(
    results: &[&SearchResult],
    username: &str,
    file_path: &PathBuf,
) -> Result<(), AppError> {
    use printpdf::*;
    use std::fs::File;
    use std::io::BufWriter;

    // 创建 PDF 文档
    let (doc, page1, layer1) = PdfDocument::new(
        format!("Search Results - {}", username),
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    // 跟踪当前页面和层
    let mut current_page = page1;
    let mut current_layer_idx = layer1;

    // 加载字体（使用内置字体）
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::ExportError(format!("加载字体失败: {}", e)))?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::ExportError(format!("加载粗体字体失败: {}", e)))?;

    // 设置起始位置
    let mut y_position = 280.0;
    let x_margin = 20.0;

    // 标题
    let layer = doc.get_page(current_page).get_layer(current_layer_idx);
    layer.use_text(
        format!("Search Results for: {}", username),
        18.0,
        Mm(x_margin),
        Mm(y_position),
        &font_bold,
    );
    y_position -= 10.0;

    // 时间戳
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

    // 统计信息
    let layer = doc.get_page(current_page).get_layer(current_layer_idx);
    layer.use_text(
        format!("Total Results Found: {}", results.len()),
        12.0,
        Mm(x_margin),
        Mm(y_position),
        &font_bold,
    );
    y_position -= 15.0;

    // 结果列表
    for (index, result) in results.iter().enumerate() {
        // 检查是否需要新页面
        if y_position < 30.0 {
            let (page_idx, layer_idx) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
            current_page = page_idx;
            current_layer_idx = layer_idx;
            y_position = 280.0;
        }

        // 获取当前层
        let layer = doc.get_page(current_page).get_layer(current_layer_idx);

        // 序号和网站名
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

        // 分类
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

        y_position -= 3.0; // 结果之间的间距
    }

    // 保存 PDF
    let file = File::create(file_path)
        .map_err(|e| AppError::ExportError(format!("创建 PDF 文件失败: {}", e)))?;
    let mut writer = BufWriter::new(file);

    doc.save(&mut writer)
        .map_err(|e| AppError::ExportError(format!("保存 PDF 文件失败: {}", e)))?;

    Ok(())
}
