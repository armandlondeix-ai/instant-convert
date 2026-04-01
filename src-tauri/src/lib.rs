mod compression;
mod conversion;
mod converters;
mod merge;
mod ocr;
mod reduction;
mod shared;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            compression::compress_files,
            merge::merge_pdfs,
            reduction::reduire_image,
            reduction::reduce_images,
            conversion::convert_format,
            conversion::get_available_output_formats,
            ocr::run_ocr
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
