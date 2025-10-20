import fs from 'fs';
import { spawnSync } from 'child_process';
import {
  AUTH_JSON_PATH,
  CONFIG_TOML_PATH,
  CREDENTIALS_JSON_PATH,
  ensureDirsSync,
} from './paths';
import { readFileIfExists, atomicWriteFileSync, readJsonIfExists, writeJsonSync } from './fsUtil';
import { parseToml, stringifyToml } from './tomlUtil';
import {
  AuthFile,
  CliCheckResult,
  ConfigToml,
  CredentialsFile,
  McpServerConfig,
  NodeInfo,
  ProviderConfig,
  TrustLevel,
} from './types';

function readConfig(): ConfigToml {
  const raw = readFileIfExists(CONFIG_TOML_PATH);
  if (!raw) return {};
  try {
    return parseToml(raw);
  } catch (e) {
    return {};
  }
}

function writeConfig(cfg: ConfigToml) {
  ensureDirsSync();
  const toml = stringifyToml(cfg);
  atomicWriteFileSync(CONFIG_TOML_PATH, toml);
}

function readCredentials(): CredentialsFile {
  const j = readJsonIfExists<CredentialsFile>(CREDENTIALS_JSON_PATH);
  return j ?? {};
}

function writeCredentials(creds: CredentialsFile) {
  ensureDirsSync();
  writeJsonSync(CREDENTIALS_JSON_PATH, creds);
}

function readAuth(): AuthFile {
  const j = readJsonIfExists<AuthFile>(AUTH_JSON_PATH);
  return j ?? {};
}

function writeAuth(auth: AuthFile) {
  ensureDirsSync();
  writeJsonSync(AUTH_JSON_PATH, auth);
}

export function listNodes(): NodeInfo[] {
  const cfg = readConfig();
  const current = cfg.model_provider ?? '';
  const providers = cfg.model_providers ?? {};
  const creds = readCredentials();
  const names = new Set<string>([
    ...Object.keys(providers),
    ...Object.keys(creds),
  ]);
  return Array.from(names).sort().map(name => ({
    name,
    isActive: name === current,
    provider: providers[name],
    hasCredential: Boolean(creds[name]?.OPENAI_API_KEY),
  }));
}

export function switchNode(targetName: string): { changed: boolean; error?: string } {
  const cfg = readConfig();
  if (!cfg.model_providers || !cfg.model_providers[targetName]) {
    return { changed: false, error: `Provider not found: ${targetName}` };
  }
  cfg.model_provider = targetName;
  writeConfig(cfg);

  const creds = readCredentials();
  const key = creds[targetName]?.OPENAI_API_KEY ?? '';
  const auth = readAuth();
  auth.OPENAI_API_KEY = key;
  writeAuth(auth);
  return { changed: true };
}

export function addNode(params: {
  name: string;
  base_url: string;
  wire_api?: string;
  requires_openai_auth?: boolean;
  extra?: Record<string, any>;
  credentialKey?: string;
}): { ok: boolean; error?: string } {
  const { name, base_url, wire_api = 'responses', requires_openai_auth, extra, credentialKey } = params;
  if (!name || !base_url) return { ok: false, error: 'name and base_url are required' };
  const cfg = readConfig();
  cfg.model_providers = cfg.model_providers ?? {};
  if (cfg.model_providers[name]) return { ok: false, error: 'provider already exists' };
  const provider: ProviderConfig = { name, base_url, wire_api: wire_api as any };
  if (requires_openai_auth !== undefined) provider.requires_openai_auth = requires_openai_auth;
  if (extra) Object.assign(provider, extra);
  cfg.model_providers[name] = provider;
  writeConfig(cfg);

  if (credentialKey !== undefined) {
    const creds = readCredentials();
    creds[name] = { ...(creds[name] || {}), OPENAI_API_KEY: credentialKey };
    writeCredentials(creds);
  }
  return { ok: true };
}

export function editNode(name: string, updates: Partial<ProviderConfig> & { credentialKey?: string }): { ok: boolean; error?: string } {
  const cfg = readConfig();
  if (!cfg.model_providers || !cfg.model_providers[name]) return { ok: false, error: 'provider not found' };
  const provider = cfg.model_providers[name]!;
  const { credentialKey, ...rest } = updates as any;
  Object.assign(provider, rest);
  if (provider.name !== name) provider.name = name; // enforce invariant
  cfg.model_providers[name] = provider;
  writeConfig(cfg);

  if (credentialKey !== undefined) {
    const creds = readCredentials();
    creds[name] = { ...(creds[name] || {}), OPENAI_API_KEY: credentialKey };
    writeCredentials(creds);
  }
  return { ok: true };
}

export function deleteNode(name: string): { ok: boolean; wasActive: boolean } {
  const cfg = readConfig();
  const wasActive = cfg.model_provider === name;
  if (cfg.model_providers && cfg.model_providers[name]) {
    delete cfg.model_providers[name];
    writeConfig(cfg);
  }
  const creds = readCredentials();
  if (creds[name]) {
    delete creds[name];
    writeCredentials(creds);
  }
  return { ok: true, wasActive };
}

export function listMcpServers(): Record<string, McpServerConfig> {
  const cfg = readConfig();
  return cfg.mcp_servers ?? {};
}

export function addMcpServer(name: string, config: McpServerConfig): { ok: boolean; error?: string } {
  if (!name) return { ok: false, error: 'name is required' };
  const cfg = readConfig();
  cfg.mcp_servers = cfg.mcp_servers ?? {};
  if (cfg.mcp_servers[name]) return { ok: false, error: 'mcp server already exists' };
  cfg.mcp_servers[name] = config;
  writeConfig(cfg);
  return { ok: true };
}

export function editMcpServer(name: string, updates: Partial<McpServerConfig>): { ok: boolean; error?: string } {
  const cfg = readConfig();
  if (!cfg.mcp_servers || !cfg.mcp_servers[name]) return { ok: false, error: 'mcp server not found' };
  cfg.mcp_servers[name] = { ...cfg.mcp_servers[name]!, ...updates };
  writeConfig(cfg);
  return { ok: true };
}

export function deleteMcpServer(name: string): { ok: boolean; error?: string } {
  const cfg = readConfig();
  if (!cfg.mcp_servers || !cfg.mcp_servers[name]) return { ok: false, error: 'mcp server not found' };
  delete cfg.mcp_servers[name];
  writeConfig(cfg);
  return { ok: true };
}

export function getFullConfigRaw(): string {
  return readFileIfExists(CONFIG_TOML_PATH) ?? '';
}

export function setFullConfigRaw(raw: string): { ok: boolean; error?: string } {
  try {
    // validate parseable
    parseToml(raw);
  } catch (e: any) {
    return { ok: false, error: e?.message || 'invalid toml' };
  }
  atomicWriteFileSync(CONFIG_TOML_PATH, raw.endsWith('\n') ? raw : raw + '\n');
  return { ok: true };
}

export function listProjectTrust(): Record<string, { trust_level?: TrustLevel } & Record<string, any>> {
  const cfg = readConfig();
  return cfg.projects ?? {};
}

export function setProjectTrust(projectAbsPath: string, trustLevel: TrustLevel): { ok: boolean; error?: string } {
  if (!projectAbsPath.startsWith('/')) return { ok: false, error: 'projectAbsPath must be absolute' };
  const cfg = readConfig();
  cfg.projects = cfg.projects ?? {};
  cfg.projects[projectAbsPath] = { ...(cfg.projects[projectAbsPath] || {}), trust_level: trustLevel };
  writeConfig(cfg);
  return { ok: true };
}

export function deleteProject(projectAbsPath: string): { ok: boolean } {
  const cfg = readConfig();
  if (cfg.projects && cfg.projects[projectAbsPath]) {
    delete cfg.projects[projectAbsPath];
    writeConfig(cfg);
  }
  return { ok: true };
}

export function checkCli(): CliCheckResult {
  try {
    const out = spawnSync('codex', ['--version'], { encoding: 'utf8' });
    if (out.error) {
      return { installed: false, error: out.error.message };
    }
    if (out.status !== 0) {
      return { installed: false, error: out.stderr?.trim() || `exit ${out.status}` };
    }
    return { installed: true, version: (out.stdout || out.stderr).trim() };
  } catch (e: any) {
    return { installed: false, error: e?.message };
  }
}

export function quickAddContext7Mcp(): { ok: boolean; error?: string } {
  return addMcpServer('context7', { command: 'npx', args: ['-y', '@upstash/context7-mcp'] });
}
