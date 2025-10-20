/**
 * 通用类型定义
 */

import type { ComponentType } from 'react'

// 菜单项类型
export type MenuItem = {
  id: string
  label: string
  component: ComponentType
}

// MCP Server 类型
export type McpServer = {
  name: string
  command?: string
  args?: string[]
}

// Node Provider 类型
export type Provider = {
  name: string
  base_url?: string
  wire_api?: string
  requires_openai_auth?: boolean
  has_credential: boolean
}

export type NodeList = {
  current_provider?: string
  providers: Provider[]
}

// Project 类型
export type Project = {
  path: string
  trust_level: string
}

// Codex Version 类型
export type CodexVersion = {
  installed: boolean
  version?: string | null
  error?: string | null
}

// 通用响应状态
export type LoadingState = {
  loading: boolean
  error: string | null
  success: string | null
}
