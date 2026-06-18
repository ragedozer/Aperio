use std::fs;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn open_image(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_image(path: String, data: Vec<u8>, _format: String) -> Result<(), String> {
    fs::write(&path, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn show_open_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let result = app
        .dialog()
        .file()
        .add_filter("Images", &["jpg", "jpeg", "png", "webp", "tiff", "bmp"])
        .blocking_pick_file();

    Ok(result.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn show_save_dialog(
    app: AppHandle,
    default_name: String,
) -> Result<Option<String>, String> {
    let result = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("JPEG", &["jpg", "jpeg"])
        .add_filter("PNG", &["png"])
        .blocking_save_file();

    Ok(result.map(|p| p.to_string()))
}
