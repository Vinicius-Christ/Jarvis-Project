#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Manager, GlobalShortcutManager, SystemTray, SystemTrayEvent, CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem};

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Sair");
    let toggle = CustomMenuItem::new("toggle".to_string(), "Ocultar/Mostrar Overlay");
    let tray_menu = SystemTrayMenu::new()
        .add_item(toggle)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "toggle" => {
                        let window = app.get_window("main").unwrap();
                        if window.is_visible().unwrap() {
                            window.hide().unwrap();
                        } else {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    _ => {}
                }
            }
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            _ => {}
        })
        .setup(|app| {
            let app_handle = app.handle();
            let mut shortcut_manager = app_handle.global_shortcut_manager();

            // Shortcut Spotlight Like
            let handle_clone = app_handle.clone();
            shortcut_manager.register("Ctrl+Space", move || {
                let window = handle_clone.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }).unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
