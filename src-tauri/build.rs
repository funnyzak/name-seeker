fn main() {
    tauri_build::build();

    // 生成构建信息
    vergen::EmitBuilder::builder()
        .build_date()
        .emit()
        .expect("Unable to generate build info");
}
