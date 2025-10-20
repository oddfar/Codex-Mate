export type Primitive = string | number | boolean | null;

export interface ProviderConfig {
  name: string;
  base_url: string;
  wire_api?: 'responses' | 'chat' | string;
  requires_openai_auth?: boolean;
  [key: string]: Primitive | Primitive[] | Record<string, any> | undefined;
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export type TrustLevel = 'low' | 'medium' | 'high' | string;

export interface ConfigToml {
  model_provider?: string;
  model?: string;
  model_reasoning_effort?: string;
  disable_response_storage?: boolean;
  model_providers?: Record<string, ProviderConfig>;
  mcp_servers?: Record<string, McpServerConfig>;
  projects?: Record<string, { trust_level?: TrustLevel } & Record<string, any>>;
  [key: string]: any;
}

export interface CredentialsFile {
  [provider: string]: {
    OPENAI_API_KEY?: string;
    [key: string]: string | undefined;
  };
}

export interface AuthFile {
  OPENAI_API_KEY?: string;
  [key: string]: string | undefined;
}

export interface NodeInfo {
  name: string;
  isActive: boolean;
  provider?: ProviderConfig;
  hasCredential: boolean;
}

export interface CliCheckResult {
  installed: boolean;
  version?: string;
  error?: string;
}
