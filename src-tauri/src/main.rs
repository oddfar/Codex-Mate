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

/// 获取 Codex 配置目录路径 (~/.codex)
fn codex_dir() -> PathBuf {
  let path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("~")).join(".codex");
  eprintln!("[DEBUG] codex_dir() = {}", path.display());
  path
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
  eprintln!("[DEBUG] get_credentials: path = {}", path.display());
  if !path.exists() {
    eprintln!("[DEBUG] get_credentials: file not found, returning empty object");
    return Ok(serde_json::json!({}));
  }
  match fs::read_to_string(&path) {
    Ok(content) => {
      let trimmed = content.trim();
      if trimmed.is_empty() {
        // 文件存在但为空：返回 {}，避免前端功能受阻
        eprintln!("[WARN] get_credentials: file exists but is empty, returning empty object");
        return Ok(serde_json::json!({}));
      }
      match serde_json::from_str::<serde_json::Value>(trimmed) {
        Ok(v) => {
          eprintln!("[DEBUG] get_credentials: parsed successfully");
          Ok(v)
        }
        Err(e) => {
          // 解析失败也容错返回 {}，并打印警告日志，防止列表页崩溃
          eprintln!("[WARN] get_credentials: parse failed ({}), returning empty object", e);
          Ok(serde_json::json!({}))
        }
      }
    }
    Err(e) => {
      eprintln!(
        "[WARN] get_credentials: read {} failed: {}. Returning empty object",
        path.display(),
        e
      );
      Ok(serde_json::json!({}))
    }
  }
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

/// Tauri 命令: 列出所有节点及其状态
/// 返回: 当前激活的节点和所有节点列表
#[tauri::command]
fn list_nodes() -> Result<NodeList, String> {
  eprintln!("[DEBUG] list_nodes called");
  
  // 1. 读取配置文件
  let cfg = get_full_config()?;
  
  // 2. 读取凭据文件
  let creds = get_credentials()?;

  // 3. 获取当前激活的节点
  let current_provider = cfg.get("model_provider").and_then(|v| v.as_str()).map(|s| s.to_string());
  eprintln!("[DEBUG] list_nodes: current_provider = {:?}", current_provider);

  // 4. 遍历所有配置的节点
  let mut providers: Vec<ProviderInfo> = vec![];
  if let Some(mps) = cfg.get("model_providers").and_then(|v| v.as_object()) {
    eprintln!("[DEBUG] list_nodes: found {} model_providers", mps.len());
    for (name, item) in mps.iter() {
      let base_url = item.get("base_url").and_then(|v| v.as_str()).map(|s| s.to_string());
      let wire_api = item.get("wire_api").and_then(|v| v.as_str()).map(|s| s.to_string());
      let requires_openai_auth = item.get("requires_openai_auth").and_then(|v| v.as_bool());
      
      // 检查该节点是否有凭据
      let has_credential = creds.get(name).and_then(|v| v.get("OPENAI_API_KEY")).and_then(|v| v.as_str()).map(|s| !s.is_empty()).unwrap_or(false);
      eprintln!("[DEBUG] list_nodes: provider '{}' has_credential = {}", name, has_credential);
      
      providers.push(ProviderInfo { name: name.clone(), base_url, wire_api, requires_openai_auth, has_credential });
    }
  }

  eprintln!("[DEBUG] list_nodes: returning {} providers", providers.len());
  Ok(NodeList { current_provider, providers })
}

/// 原子写入文件
/// 使用临时文件先写入，再重命名，确保数据不会因为写入中断而损坏
fn atomic_write(path: &std::path::Path, content: &str) -> Result<(), String> {
  eprintln!("[DEBUG] atomic_write: target path = {}", path.display());
  
  // 1. 获取父目录并创建
  let parent = path.parent().ok_or_else(|| "invalid path".to_string())?;
  eprintln!("[DEBUG] atomic_write: parent dir = {}", parent.display());
  
  fs::create_dir_all(parent).map_err(|e| format!("create dir {} failed: {}", parent.display(), e))?;
  eprintln!("[DEBUG] atomic_write: parent dir created/verified");
  
  // 2. 创建临时文件
  let mut tmp = parent.to_path_buf();
  tmp.push(format!(".{}.tmp", uuid::Uuid::new_v4()));
  eprintln!("[DEBUG] atomic_write: temp file = {}", tmp.display());
  
  {
    let mut f = fs::File::create(&tmp).map_err(|e| format!("create temp file failed: {}", e))?;
    eprintln!("[DEBUG] atomic_write: temp file created, writing {} bytes", content.len());
    
    f.write_all(content.as_bytes()).map_err(|e| format!("write temp file failed: {}", e))?;
    f.sync_all().ok();
    eprintln!("[DEBUG] atomic_write: content written and synced");
  }
  
  // 3. 重命名临时文件为目标文件（失败则尝试降级写入）
  match fs::rename(&tmp, path) {
    Ok(_) => {
      eprintln!("[DEBUG] atomic_write: file renamed to target path successfully");
    }
    Err(e) => {
      eprintln!("[WARN] atomic_write: rename failed ({}), trying fallback write", e);
      // fallback: 读取临时文件内容，直接写入目标文件
      let data = fs::read(&tmp).map_err(|e| format!("fallback read temp failed: {}", e))?;
      let mut f2 = fs::File::create(path).map_err(|e| format!("fallback create target failed: {}", e))?;
      f2.write_all(&data).map_err(|e| format!("fallback write target failed: {}", e))?;
      f2.sync_all().ok();
      // 删除临时文件
      let _ = fs::remove_file(&tmp);
      eprintln!("[DEBUG] atomic_write: fallback write completed ({} bytes)", data.len());
    }
  }

  // 4. 目录级别 fsync，确保重命名对文件系统可见（macOS/Unix 推荐）
  if let Some(parent_dir) = path.parent() {
    if let Ok(dir_file) = fs::File::open(parent_dir) {
      let _ = dir_file.sync_all();
      eprintln!("[DEBUG] atomic_write: parent directory fsync completed");
    } else {
      eprintln!("[WARN] atomic_write: failed to open parent directory for fsync");
    }
  }
  
  Ok(())
}

#[tauri::command]
fn switch_node(name: String) -> Result<(), String> {
  eprintln!("[DEBUG] switch_node called: name = '{}'", name);
  // 读取凭据（容错：空文件/损坏文件均返回空 Map）
  let creds_map = read_credentials_value()?;
  let key = creds_map
    .get(&name)
    .and_then(|v| v.get("OPENAI_API_KEY"))
    .and_then(|v| v.as_str())
    .ok_or_else(|| format!("credential not found for provider '{}'", name))?;
  eprintln!("[DEBUG] switch_node: credential found, key_length = {}", key.len());

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

/// 读取凭据文件，返回凭据的 Map 结构
/// 文件路径: ~/.codex/codex-mate/credentials.json
fn read_credentials_value() -> Result<serde_json::Map<String, serde_json::Value>, String> {
  let path = codex_dir().join("codex-mate").join("credentials.json");
  eprintln!("[DEBUG] read_credentials_value: path = {}", path.display());
  
  if !path.exists() {
    eprintln!("[DEBUG] read_credentials_value: file does not exist, returning empty map");
    return Ok(serde_json::Map::new());
  }

  let content = fs::read_to_string(&path).map_err(|e| format!("read {} failed: {}", path.display(), e))?;
  eprintln!("[DEBUG] read_credentials_value: file content length = {}", content.len());

  let trimmed = content.trim();
  if trimmed.is_empty() {
    // 文件为空时，容错返回空 Map，避免后续更新失败
    eprintln!("[WARN] read_credentials_value: file is empty, returning empty map");
    return Ok(serde_json::Map::new());
  }

  match serde_json::from_str::<serde_json::Value>(trimmed) {
    Ok(v) => {
      let result = v.as_object().cloned().unwrap_or_default();
      eprintln!("[DEBUG] read_credentials_value: parsed map has {} entries", result.len());
      Ok(result)
    }
    Err(e) => {
      // 当文件损坏/格式不正确时，打印警告并返回空 Map，让调用方可以继续写入修复
      eprintln!("[WARN] read_credentials_value: parse failed ({}), returning empty map", e);
      Ok(serde_json::Map::new())
    }
  }
}

/// 写入凭据文件，使用原子写入保证数据安全
/// 文件路径: ~/.codex/codex-mate/credentials.json
fn write_credentials_value(map: &serde_json::Map<String, serde_json::Value>) -> Result<(), String> {
  let path = codex_dir().join("codex-mate").join("credentials.json");
  eprintln!("[DEBUG] write_credentials_value: path = {}", path.display());
  eprintln!("[DEBUG] write_credentials_value: writing {} entries", map.len());
  
  let s = serde_json::to_string_pretty(&serde_json::Value::Object(map.clone())).map_err(|e| e.to_string())?;
  eprintln!("[DEBUG] write_credentials_value: json content = {}", s);
  
  let byte_len = s.as_bytes().len();
  atomic_write(&path, &s)?;
  eprintln!("[DEBUG] write_credentials_value: file written successfully ({} bytes)", byte_len);
  
  Ok(())
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
    let trimmed_key = key.trim().to_string();
    if !trimmed_key.is_empty() {
      eprintln!("[DEBUG] upsert_node: writing credential for provider '{}', key_length = {}", name, trimmed_key.len());
      let mut map = read_credentials_value()?;
      map.insert(name.clone(), serde_json::json!({"OPENAI_API_KEY": trimmed_key}));
      write_credentials_value(&map)?;
      // 回读校验
      let verify = read_credentials_value()?;
      let ok = verify.get(&name).and_then(|v| v.get("OPENAI_API_KEY")).and_then(|v| v.as_str()).is_some();
      eprintln!("[DEBUG] upsert_node: credential persisted = {}", ok);
    } else {
      eprintln!("[WARN] upsert_node: provided credential is empty, skipping write");
    }
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

/// Tauri 命令: 更新指定节点的凭据
/// 参数:
///   - name: 节点名称 (例如: "packycode", "openai-chat-completions")
///   - openai_api_key: OpenAI API 密钥
#[tauri::command]
fn update_node_credential(name: String, openai_api_key: String) -> Result<(), String> {
  let trimmed_name = name.trim().to_string();
  let trimmed_key = openai_api_key.trim().to_string();
  eprintln!(
    "[DEBUG] update_node_credential called: name='{}'(len {}), key_length = {}",
    trimmed_name,
    trimmed_name.len(),
    trimmed_key.len()
  );

  if trimmed_name.is_empty() {
    return Err("provider name is empty".into());
  }
  if trimmed_key.is_empty() {
    return Err("credential is empty".into());
  }

  // 1. 读取现有凭据
  let mut map = read_credentials_value()?;
  eprintln!("[DEBUG] update_node_credential: loaded {} existing credentials", map.len());

  // 2. 插入或更新指定节点的凭据
  map.insert(trimmed_name.clone(), serde_json::json!({"OPENAI_API_KEY": trimmed_key}));
  eprintln!("[DEBUG] update_node_credential: after insert, map has {} entries", map.len());

  // 3. 写入文件
  write_credentials_value(&map)?;
  eprintln!("[DEBUG] update_node_credential: write_credentials_value finished");

  // 4. 回读校验，确保落盘成功
  let verify = read_credentials_value()?;
  let ok = verify
    .get(&trimmed_name)
    .and_then(|v| v.get("OPENAI_API_KEY"))
    .and_then(|v| v.as_str())
    .is_some();
  eprintln!("[DEBUG] update_node_credential: verify persisted = {}", ok);
  if !ok {
    eprintln!("[WARN] update_node_credential: credential not found after write");
  }

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
      debug_credentials_info,
      list_mcp_servers,
      upsert_mcp_server,
      delete_mcp_server,
      read_config_raw,
      write_config_raw,
      list_projects,
      upsert_project,
      delete_project,
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
  if let Some(mcp) = cfg.get("mcp_servers").and_then(|v| v.as_table()) {
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

#[derive(Serialize, Deserialize)]
struct ProjectEntry { path: String, trust_level: String }

#[tauri::command]
fn list_projects() -> Result<Vec<ProjectEntry>, String> {
  let cfg = read_config_value()?;
  let mut res = vec![];
  if let Some(projects) = cfg.get("projects").and_then(|v| v.as_table()) {
    for (path, item) in projects.iter() {
      let trust = item.get("trust_level").and_then(|v| v.as_str()).unwrap_or("").to_string();
      res.push(ProjectEntry { path: path.clone(), trust_level: trust });
    }
  }
  Ok(res)
}

#[tauri::command]
fn upsert_project(path: String, trust_level: String) -> Result<(), String> {
  let mut cfg = read_config_value()?;
  let tbl = cfg.as_table_mut().ok_or_else(|| "invalid config root".to_string())?;
  if !tbl.contains_key("projects") {
    tbl.insert("projects".into(), TomlValue::Table(toml::map::Map::new()));
  }
  let projects = tbl.get_mut("projects").and_then(|v| v.as_table_mut()).ok_or_else(|| "invalid projects".to_string())?;
  let mut entry = toml::map::Map::new();
  entry.insert("trust_level".into(), TomlValue::String(trust_level));
  projects.insert(path, TomlValue::Table(entry));
  write_config_value(&cfg)
}

#[tauri::command]
fn delete_project(path: String) -> Result<(), String> {
  let mut cfg = read_config_value()?;
  if let Some(projects) = cfg.as_table_mut().and_then(|t| t.get_mut("projects")).and_then(|v| v.as_table_mut()) {
    projects.remove(&path);
  }
  write_config_value(&cfg)
}

/// 调试命令：返回 credentials.json 的路径、是否存在、长度、以及文件内容（用于排查写入问题）
#[tauri::command]
fn debug_credentials_info() -> Result<serde_json::Value, String> {
  let path = codex_dir().join("codex-mate").join("credentials.json");
  let path_str = path.to_string_lossy().to_string();
  let exists = path.exists();
  if !exists {
    eprintln!("[DEBUG] debug_credentials_info: file not exists: {}", path_str);
    return Ok(serde_json::json!({
      "path": path_str,
      "exists": false
    }));
  }
  match fs::read_to_string(&path) {
    Ok(content) => {
      let len = content.len();
      let trimmed_empty = content.trim().is_empty();
      eprintln!("[DEBUG] debug_credentials_info: exists={}, len={}, trimmed_empty={}", exists, len, trimmed_empty);
      Ok(serde_json::json!({
        "path": path_str,
        "exists": true,
        "len": len,
        "trimmed_empty": trimmed_empty,
        "content": content
      }))
    }
    Err(e) => {
      eprintln!("[WARN] debug_credentials_info: read failed: {}", e);
      Ok(serde_json::json!({
        "path": path_str,
        "exists": true,
        "read_error": e.to_string()
      }))
    }
  }
}
