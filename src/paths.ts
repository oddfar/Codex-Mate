import os from 'os';
import path from 'path';

export const CODEx_DIR = path.join(os.homedir(), '.codex');
export const CODEX_MATE_DIR = path.join(CODEx_DIR, 'codex-mate');
export const CONFIG_TOML_PATH = path.join(CODEx_DIR, 'config.toml');
export const AUTH_JSON_PATH = path.join(CODEx_DIR, 'auth.json');
export const CREDENTIALS_JSON_PATH = path.join(CODEX_MATE_DIR, 'credentials.json');

export function ensureDirsSync() {
  const fs = require('fs');
  if (!fs.existsSync(CODEx_DIR)) fs.mkdirSync(CODEx_DIR, { recursive: true });
  if (!fs.existsSync(CODEX_MATE_DIR)) fs.mkdirSync(CODEX_MATE_DIR, { recursive: true });
}
