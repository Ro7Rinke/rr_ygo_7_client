#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub mod cloudflare;

pub use cloudflare::{ensure_binary, start_tunnel, stop_tunnel, tunnel_status};

mod edopro;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            edopro::spawn_edopro_watcher(app.handle());
            Ok(())
        })
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            // cloudflare commands
            ensure_binary,
            start_tunnel,
            stop_tunnel,
            tunnel_status,
            // edopro commands
            edopro::edopro_is_running,
            edopro::edopro_start,
            edopro::edopro_stop_all,
            edopro::edopro_restart
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
