#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};
use std::process::Command;
use std::fs;
use std::path::PathBuf;
use toml::Value as TomlValue;

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

fn codex_dir() -> PathBuf {
  dirs::home_dir().unwrap_or_else(|| PathBuf::from("~")).join(".codex")
}

#[derive(Serialize, Deserialize, Debug)]
struct Credentials(pub std::collections::BTreeMap<String, serde_json::Value>);

#[tauri::command]
fn get_full_config() -> Result<serde_json::Value, String> {
  let path = codex_dir().join("config.toml");
  let content = fs::read_to_string(&path).map_err(|e| format!("read {} failed: {}", path.display(), e))?;
  let v: TomlValue = toml::from_str(&content).map_err(|e| format!("parse toml failed: {}", e))?;
  serde_json::to_value(v).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_credentials() -> Result<serde_json::Value, String> {
  let path = codex_dir().join("codex-mate").join("credentials.json");
  if !path.exists() {
    return Ok(serde_json::json!({}));
  }
  let content = fs::read_to_string(&path).map_err(|e| format!("read {} failed: {}", path.display(), e))?;
  let v: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("parse json failed: {}", e))?;
  Ok(v)
}

#[derive(Serialize)]
struct ProviderInfo {
  name: String,
  base_url: Option<String>,
  wire_api: Option<String>,
  requires_openai_auth: Option<bool>,
  has_credential: bool,
}

#[derive(Serialize)]
struct NodeList {
  current_provider: Option<String>,
  providers: Vec<ProviderInfo>,
}

#[tauri::command]
fn list_nodes() -> Result<NodeList, String> {
  let cfg = get_full_config()?;
  let creds = get_credentials()?;

  let current_provider = cfg.get("model_provider").and_then(|v| v.as_str()).map(|s| s.to_string());

  let mut providers: Vec<ProviderInfo> = vec![];
  if let Some(mps) = cfg.get("model_providers").and_then(|v| v.as_object()) {
    for (name, item) in mps.iter() {
      let base_url = item.get("base_url").and_then(|v| v.as_str()).map(|s| s.to_string());
      let wire_api = item.get("wire_api").and_then(|v| v.as_str()).map(|s| s.to_string());
      let requires_openai_auth = item.get("requires_openai_auth").and_then(|v| v.as_bool());
      let has_credential = creds.get(name).and_then(|v| v.get("OPENAI_API_KEY")).and_then(|v| v.as_str()).map(|s| !s.is_empty()).unwrap_or(false);
      providers.push(ProviderInfo { name: name.clone(), base_url, wire_api, requires_openai_auth, has_credential });
    }
  }

  Ok(NodeList { current_provider, providers })
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_codex_version, get_full_config, get_credentials, list_nodes])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
