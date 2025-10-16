import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

export function ConfigEditor() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setMsg(null)
    setErr(null)
    try {
      const s = await invoke<string>('read_config_raw')
      setContent(s)
    } catch (e: any) { setErr(String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setLoading(true)
    setMsg(null)
    setErr(null)
    try {
      await invoke('write_config_raw', { content })
      setMsg('已保存')
    } catch (e: any) { setErr(String(e)) }
    finally { setLoading(false) }
  }

  return (
    <section>
      <h2>高级编辑器（config.toml）</h2>
      {loading && <p>处理中…</p>}
      {msg && <p style={{ color: 'green' }}>{msg}</p>}
      {err && <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{err}</pre>}
      <div>
        <textarea value={content} onChange={e => setContent(e.target.value)} style={{ width: '100%', height: 320, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={save} disabled={loading}>保存</button>
        <button onClick={load} disabled={loading} style={{ marginLeft: 8 }}>重新加载</button>
      </div>
    </section>
  )
}

