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

fn read_config_value() -> Result<TomlValue, String> {
  let cfg_path = codex_dir().join("config.toml");
  let cfg_str = fs::read_to_string(&cfg_path).map_err(|e| format!("read {} failed: {}", cfg_path.display(), e))?;
  toml::from_str(&cfg_str).map_err(|e| format!("parse toml failed: {}", e))
}

fn write_config_value(v: &TomlValue) -> Result<(), String> {
  let cfg_path = codex_dir().join("config.toml");
  let out = toml::to_string_pretty(&v).map_err(|e| e.to_string())?;
  atomic_write(&cfg_path, &out)
}

fn read_credentials_value() -> Result<serde_json::Map<String, serde_json::Value>, String> {
  let path = codex_dir().join("codex-mate").join("credentials.json");
  if !path.exists() {
    return Ok(serde_json::Map::new());
  }
  let content = fs::read_to_string(&path).map_err(|e| format!("read {} failed: {}", path.display(), e))?;
  let v: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("parse json failed: {}", e))?;
  Ok(v.as_object().cloned().unwrap_or_default())
}

fn write_credentials_value(map: &serde_json::Map<String, serde_json::Value>) -> Result<(), String> {
  let path = codex_dir().join("codex-mate").join("credentials.json");
  let s = serde_json::to_string_pretty(&serde_json::Value::Object(map.clone())).map_err(|e| e.to_string())?;
  atomic_write(&path, &s)
}

#[tauri::command]
fn upsert_node(name: String, provider_fields: serde_json::Value, credential: Option<String>) -> Result<(), String> {
  let mut cfg = read_config_value()?;
  let tbl = cfg.as_table_mut().ok_or_else(|| "invalid config root".to_string())?;
  // ensure model_providers table exists
  if !tbl.contains_key("model_providers") {
    tbl.insert("model_providers".into(), TomlValue::Table(toml::map::Map::new()));
  }
  let mps = tbl.get_mut("model_providers").and_then(|v| v.as_table_mut()).ok_or_else(|| "invalid model_providers".to_string())?;

  let mut provider_tbl = if let Some(existing) = mps.get(&name).and_then(|v| v.as_table()) {
    existing.clone()
  } else {
    toml::map::Map::new()
  };

  // merge fields from provider_fields (JSON) into provider_tbl (TOML)
  fn json_to_toml(v: &serde_json::Value) -> TomlValue {
    match v {
      serde_json::Value::Null => TomlValue::String(String::new()),
      serde_json::Value::Bool(b) => TomlValue::Boolean(*b),
      serde_json::Value::Number(n) => {
        if let Some(i) = n.as_i64() { TomlValue::Integer(i) }
        else if let Some(f) = n.as_f64() { TomlValue::Float(f) }
        else { TomlValue::String(n.to_string()) }
      }
      serde_json::Value::String(s) => TomlValue::String(s.clone()),
      serde_json::Value::Array(arr) => TomlValue::Array(arr.iter().map(json_to_toml).collect()),
      serde_json::Value::Object(obj) => {
        let mut m = toml::map::Map::new();
        for (k, v) in obj.iter() { m.insert(k.clone(), json_to_toml(v)); }
        TomlValue::Table(m)
      }
    }
  }

  if let Some(obj) = provider_fields.as_object() {
    for (k, v) in obj {
      provider_tbl.insert(k.clone(), json_to_toml(v));
    }
  }

  // enforce required fields
  provider_tbl.insert("name".into(), TomlValue::String(name.clone()));
  if !provider_tbl.contains_key("wire_api") {
    provider_tbl.insert("wire_api".into(), TomlValue::String("responses".into()));
  }

  // ensure base_url exists when creating new
  if !mps.contains_key(&name) {
    if !provider_tbl.contains_key("base_url") {
      return Err("base_url is required for new provider".into());
    }
  }

  mps.insert(name.clone(), TomlValue::Table(provider_tbl));
  write_config_value(&cfg)?;

  if let Some(key) = credential {
    let mut map = read_credentials_value()?;
    map.insert(name.clone(), serde_json::json!({"OPENAI_API_KEY": key}));
    write_credentials_value(&map)?;
  }

  Ok(())
}

#[tauri::command]
fn delete_node(name: String, force: bool) -> Result<(), String> {
  let mut cfg = read_config_value()?;
  let current = cfg.get("model_provider").and_then(|v| v.as_str()).map(|s| s.to_string());
  if !force {
    if let Some(cur) = current {
      if cur == name { return Err("cannot delete active provider without force".into()); }
    }
  }

  let tbl = cfg.as_table_mut().ok_or_else(|| "invalid config root".to_string())?;
  if let Some(mps) = tbl.get_mut("model_providers").and_then(|v| v.as_table_mut()) {
    mps.remove(&name);
  }
  write_config_value(&cfg)?;

  let mut map = read_credentials_value()?;
  map.remove(&name);
  write_credentials_value(&map)?;
  Ok(())
}

#[tauri::command]
fn read_config_raw() -> Result<String, String> {
  let cfg_path = codex_dir().join("config.toml");
  fs::read_to_string(&cfg_path).map_err(|e| format!("read {} failed: {}", cfg_path.display(), e))
}

#[tauri::command]
fn write_config_raw(content: String) -> Result<(), String> {
  // validate TOML first
  let _: TomlValue = toml::from_str(&content).map_err(|e| format!("TOML parse error: {}", e))?;
  let cfg_path = codex_dir().join("config.toml");
  atomic_write(&cfg_path, &content)
}

#[tauri::command]
fn update_node_credential(name: String, openai_api_key: String) -> Result<(), String> {
  let mut map = read_credentials_value()?;
  map.insert(name.clone(), serde_json::json!({"OPENAI_API_KEY": openai_api_key}));
  write_credentials_value(&map)?;
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      get_codex_version,
      get_full_config,
      get_credentials,
      list_nodes,
      switch_node,
      upsert_node,
      delete_node,
      update_node_credential,
      list_mcp_servers,
      upsert_mcp_server,
      delete_mcp_server,
      read_config_raw,
      write_config_raw,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[derive(Serialize, Deserialize)]
struct McpServer {
  name: String,
  command: Option<String>,
  args: Option<Vec<String>>,
}

#[tauri::command]
fn list_mcp_servers() -> Result<Vec<McpServer>, String> {
  let cfg = read_config_value()?;
  let mut res = vec![];
  if let Some(mcp) = cfg.get("mcp_servers").and_then(|v| v.as_object()) {
    for (name, item) in mcp.iter() {
      let command = item.get("command").and_then(|v| v.as_str()).map(|s| s.to_string());
      let args = item.get("args").and_then(|v| v.as_array()).map(|arr| {
        arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
      });
      res.push(McpServer { name: name.clone(), command, args });
    }
  }
  Ok(res)
}

#[tauri::command]
fn upsert_mcp_server(name: String, command: String, args: Vec<String>) -> Result<(), String> {
  let mut cfg = read_config_value()?;
  let tbl = cfg.as_table_mut().ok_or_else(|| "invalid config root".to_string())?;
  if !tbl.contains_key("mcp_servers") {
    tbl.insert("mcp_servers".into(), TomlValue::Table(toml::map::Map::new()));
  }
  let mcp = tbl.get_mut("mcp_servers").and_then(|v| v.as_table_mut()).ok_or_else(|| "invalid mcp_servers".to_string())?;
  let mut entry = toml::map::Map::new();
  entry.insert("command".into(), TomlValue::String(command));
  let args_t = TomlValue::Array(args.into_iter().map(|s| TomlValue::String(s)).collect());
  entry.insert("args".into(), args_t);
  mcp.insert(name, TomlValue::Table(entry));
  write_config_value(&cfg)
}

#[tauri::command]
fn delete_mcp_server(name: String) -> Result<(), String> {
  let mut cfg = read_config_value()?;
  let tbl = cfg.as_table_mut().ok_or_else(|| "invalid config root".to_string())?;
  if let Some(mcp) = tbl.get_mut("mcp_servers").and_then(|v| v.as_table_mut()) {
    mcp.remove(&name);
  }
  write_config_value(&cfg)
}
