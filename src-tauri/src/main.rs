#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};
use std::process::Command;
use std::fs;
use std::path::PathBuf;
use toml::Value as TomlValue;
use std::io::Write;

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

fn atomic_write(path: &std::path::Path, content: &str) -> Result<(), String> {
  let parent = path.parent().ok_or_else(|| "invalid path".to_string())?;
  fs::create_dir_all(parent).map_err(|e| format!("create dir {} failed: {}", parent.display(), e))?;
  let mut tmp = parent.to_path_buf();
  tmp.push(format!(".{}.tmp", uuid::Uuid::new_v4()));
  {
    let mut f = fs::File::create(&tmp).map_err(|e| format!("create temp file failed: {}", e))?;
    f.write_all(content.as_bytes()).map_err(|e| format!("write temp file failed: {}", e))?;
    f.sync_all().ok();
  }
  fs::rename(&tmp, path).map_err(|e| format!("rename temp file failed: {}", e))?;
  Ok(())
}

#[tauri::command]
fn switch_node(name: String) -> Result<(), String> {
  // read credentials
  let creds_path = codex_dir().join("codex-mate").join("credentials.json");
  let creds_str = fs::read_to_string(&creds_path).map_err(|e| format!("read {} failed: {}", creds_path.display(), e))?;
  let creds: serde_json::Value = serde_json::from_str(&creds_str).map_err(|e| format!("parse credentials failed: {}", e))?;
  let key = creds.get(&name).and_then(|v| v.get("OPENAI_API_KEY")).and_then(|v| v.as_str()).ok_or_else(|| format!("credential not found for provider '{}'", name))?;

  // write auth.json
  let auth_path = codex_dir().join("auth.json");
  let auth_content = serde_json::json!({ "OPENAI_API_KEY": key });
  atomic_write(&auth_path, &serde_json::to_string_pretty(&auth_content).unwrap())?;

  // update config.toml model_provider
  let cfg_path = codex_dir().join("config.toml");
  let cfg_str = fs::read_to_string(&cfg_path).map_err(|e| format!("read {} failed: {}", cfg_path.display(), e))?;
  let mut v: TomlValue = toml::from_str(&cfg_str).map_err(|e| format!("parse toml failed: {}", e))?;
  if let Some(tbl) = v.as_table_mut() {
    tbl.insert("model_provider".into(), TomlValue::String(name));
  }
  let out = toml::to_string_pretty(&v).map_err(|e| e.to_string())?;
  atomic_write(&cfg_path, &out)?;

  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_codex_version, get_full_config, get_credentials, list_nodes, switch_node])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
