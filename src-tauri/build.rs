fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        let source = "src/core/pdf_macos.m";
        println!("cargo:rerun-if-changed={source}");
        cc::Build::new()
            .file(source)
            .flag("-fobjc-arc")
            .compile("pdf_macos");
        for framework in ["AppKit", "CoreGraphics", "CoreText"] {
            println!("cargo:rustc-link-lib=framework={framework}");
        }
    }
    tauri_build::build();

    // 生成构建信息
    vergen::EmitBuilder::builder()
        .build_date()
        .emit()
        .expect("Unable to generate build info");
}
