mod commands;

use commands::{open_image, save_image, show_open_dialog, show_save_dialog};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_image,
            save_image,
            show_open_dialog,
            show_save_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
