#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Manager, GlobalShortcutManager};

fn main() {
    // Força o WebView2 a usar um diretório de dados dedicado e limpo,
    // evitando o erro 0x800700AA ("Recurso solicitado em uso")
    std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", "C:\\temp-jarvis-webview2");
    
    println!("[JARVIS] Iniciando aplicação Tauri...");
    println!("[JARVIS] WebView2 data folder: C:\\temp-jarvis-webview2");

    let result = tauri::Builder::default()
        .setup(|app| {
            println!("[JARVIS] Setup executado com sucesso!");
            let app_handle = app.handle();
            
            // Verifica se a janela principal existe
            match app.get_window("main") {
                Some(win) => {
                    println!("[JARVIS] Janela 'main' encontrada!");
                    // Garante que a janela está visível
                    win.show().unwrap_or_else(|e| eprintln!("[JARVIS] Erro ao mostrar janela: {}", e));
                    win.set_focus().unwrap_or_else(|e| eprintln!("[JARVIS] Erro ao focar janela: {}", e));
                    println!("[JARVIS] Janela mostrada e em foco!");
                },
                None => {
                    eprintln!("[JARVIS] ERRO: Janela 'main' não encontrada!");
                }
            }

            // Registra o atalho Ctrl+Space para mostrar/ocultar
            let mut shortcut_manager = app_handle.global_shortcut_manager();
            let handle_clone = app_handle.clone();
            shortcut_manager
                .register("Ctrl+Space", move || {
                    if let Some(window) = handle_clone.get_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            window.hide().unwrap_or_default();
                        } else {
                            window.show().unwrap_or_default();
                            window.set_focus().unwrap_or_default();
                        }
                    }
                })
                .unwrap_or_else(|e| eprintln!("[JARVIS] Erro ao registrar shortcut: {}", e));

            println!("[JARVIS] Atalho Ctrl+Space registrado.");
            Ok(())
        })
        .build(tauri::generate_context!());

    match result {
        Ok(app) => {
            println!("[JARVIS] App construído com sucesso, iniciando loop de eventos...");
            app.run(|_app_handle, event| {
                if let tauri::RunEvent::ExitRequested { api, .. } = event {
                    api.prevent_exit();
                }
            });
        }
        Err(e) => {
            eprintln!("[JARVIS] ERRO CRÍTICO ao construir app: {:?}", e);
            std::process::exit(1);
        }
    }
}
