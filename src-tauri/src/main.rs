#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
struct CodexVersion {
  installed: bool,
  version: Option<String>,
  error: Option<String>,
}

#[tauri::command]
fn get_codex_version() -> CodexVersion {
  match Command::new("codex").arg("--version").output() {
    Ok(out) => {
      if out.status.success() {
        let v = String::from_utf8_lossy(&out.stdout).trim().to_string();
        CodexVersion { installed: true, version: Some(v), error: None }
      } else {
        CodexVersion { installed: false, version: None, error: Some(String::from_utf8_lossy(&out.stderr).trim().to_string()) }
      }
    }
    Err(e) => CodexVersion { installed: false, version: None, error: Some(e.to_string()) },
  }
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_codex_version])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

