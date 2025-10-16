import React, { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

type CodexVersion = {
  installed: boolean
  version?: string | null
  error?: string | null
}

export function Settings() {
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<CodexVersion | null>(null)

  const check = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invoke<CodexVersion>('get_codex_version')
      setState(res)
    } catch (e: any) {
      setState({ installed: false, version: null, error: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  return (
    <section>
      <h2>设置</h2>
      <div>
        <h3>Codex CLI 检测</h3>
        {loading && <p>检测中…</p>}
        {!loading && state && state.installed && (
          <p style={{ color: 'green' }}>已安装：{state.version}</p>
        )}
        {!loading && state && !state.installed && (
          <div>
            <p style={{ color: 'crimson' }}>未检测到 Codex CLI</p>
            {state.error && <pre style={{ whiteSpace: 'pre-wrap' }}>{state.error}</pre>}
            <p>
              请参考安装指南：
              <a href="https://developers.openai.com/codex/local-config#cli" target="_blank" rel="noreferrer">
                Codex CLI 文档
              </a>
            </p>
          </div>
        )}
        <button onClick={check} disabled={loading}>
          重新检测
        </button>
      </div>
    </section>
  )
}

