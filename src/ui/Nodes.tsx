import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

type Provider = {
  name: string
  base_url?: string
  wire_api?: string
  requires_openai_auth?: boolean
  has_credential: boolean
}

type NodeList = {
  current_provider?: string
  providers: Provider[]
}

export function Nodes() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<NodeList | null>(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await invoke<NodeList>('list_nodes')
      setData(res)
    } catch (e: any) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const switchTo = async (name: string) => {
    setErr(null)
    try {
      await invoke('switch_node', { name })
      await load()
    } catch (e: any) {
      setErr(String(e))
    }
  }

  return (
    <section>
      <h2>节点</h2>
      {loading && <p>加载中…</p>}
      {err && <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{err}</pre>}
      {data && (
        <div>
          <p>当前节点：{data.current_provider ?? '未设置'}</p>
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>base_url</th>
                <th>wire_api</th>
                <th>需要OpenAI认证</th>
                <th>有凭据</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.providers.map(p => (
                <tr key={p.name} style={{ fontWeight: p.name === data.current_provider ? 600 : 400 }}>
                  <td>{p.name}</td>
                  <td>{p.base_url ?? ''}</td>
                  <td>{p.wire_api ?? ''}</td>
                  <td>{String(p.requires_openai_auth ?? false)}</td>
                  <td>{p.has_credential ? '✓' : '✗'}</td>
                  <td>
                    <button disabled={p.name === data.current_provider} onClick={() => switchTo(p.name)}>切换</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={load} disabled={loading}>刷新</button>
        </div>
      )}
    </section>
  )
}
