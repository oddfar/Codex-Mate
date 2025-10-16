import React, { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { CodexVersion } from '../../types'
import { Loading, ErrorMessage, Message } from '../components/Common'

/**
 * 设置页面
 */
export function Settings() {
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<CodexVersion | null>(null)

  const checkCodexVersion = useCallback(async () => {
    setLoading(true)
    try {
      const result = await invoke<CodexVersion>('get_codex_version')
      setState(result)
    } catch (e: any) {
      setState({
        installed: false,
        version: null,
        error: String(e),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkCodexVersion()
  }, [checkCodexVersion])

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Codex CLI 检测</h3>
          <button
            onClick={checkCodexVersion}
            disabled={loading}
            className="btn btn-outline"
          >
            重新检测
          </button>
        </div>

        {loading && <Loading text="检测中..." />}

        {!loading && state && state.installed && (
          <Message type="success">
            <strong>✓ Codex CLI 已安装</strong>
            <br />
            版本: {state.version || '未知'}
          </Message>
        )}

        {!loading && state && !state.installed && (
          <div>
            <Message type="error">
              <strong>✗ 未检测到 Codex CLI</strong>
            </Message>
            
            {state.error && <ErrorMessage error={state.error} onRetry={checkCodexVersion} />}

            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>安装指南</h4>
              <p style={{ marginBottom: 8 }}>
                请访问以下链接查看 Codex CLI 安装文档：
              </p>
              <a
                href="https://developers.openai.com/codex/local-config#cli"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                查看 Codex CLI 文档
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">关于</h3>
        </div>
        <div>
          <p><strong>应用名称:</strong> Codex Mate</p>
          <p><strong>版本:</strong> 0.1.0</p>
          <p><strong>描述:</strong> 一个用于管理 Codex 配置、MCP 服务器、节点和项目的桌面应用。</p>
        </div>
      </div>
    </div>
  )
}
