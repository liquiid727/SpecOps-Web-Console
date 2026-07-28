use std::path::PathBuf;

use serde::Serialize;

/// A single entry returned by [`list_directory`].
#[derive(Serialize)]
pub struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
}

/// Read a UTF-8 text file from disk.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|error| format!("read_text_file failed: {error}"))
}

/// Write a UTF-8 text file to disk, creating parent directories as needed.
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("write_text_file (mkdir) failed: {error}"))?;
    }
    std::fs::write(&path, contents).map_err(|error| format!("write_text_file failed: {error}"))
}

/// List the immediate children of a directory.
#[tauri::command]
fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let mut entries = Vec::new();
    let read = std::fs::read_dir(&path)
        .map_err(|error| format!("list_directory failed: {error}"))?;
    for item in read.flatten() {
        let file_type = item.file_type().map_err(|error| error.to_string())?;
        entries.push(DirEntry {
            name: item.file_name().to_string_lossy().into_owned(),
            path: item.path().to_string_lossy().into_owned(),
            is_dir: file_type.is_dir(),
        });
    }
    entries.sort_by(|a, b| (b.is_dir, &a.name).cmp(&(a.is_dir, &b.name)));
    Ok(entries)
}

/// Report the desktop shell version so the frontend can confirm the native bridge.
#[tauri::command]
fn platform_info(app: tauri::AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

/// Application entrypoint shared by the desktop binary and future mobile targets.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            list_directory,
            platform_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running Product AI OS CLI GUI desktop shell");
}
