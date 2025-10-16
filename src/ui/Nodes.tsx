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
  const [form, setForm] = useState({ name: '', base_url: '', requires_openai_auth: false, key: '' })

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

  const createOrUpdate = async () => {
    setErr(null)
    try {
      if (!form.name || !form.base_url) throw new Error('name 与 base_url 必填')
      const provider_fields = {
        name: form.name,
        base_url: form.base_url,
        wire_api: 'responses',
        requires_openai_auth: form.requires_openai_auth,
      }
      const credential = form.key ? form.key : undefined
      await invoke('upsert_node', { name: form.name, provider_fields: provider_fields, credential })
      setForm({ name: '', base_url: '', requires_openai_auth: false, key: '' })
      await load()
    } catch (e: any) {
      setErr(String(e))
    }
  }

  const remove = async (name: string, isActive: boolean) => {
    if (isActive) {
      const yes = confirm('当前为激活节点，确定仍要删除？')
      if (!yes) return
    }
    setErr(null)
    try {
      await invoke('delete_node', { name, force: isActive })
      await load()
    } catch (e: any) {
      setErr(String(e))
    }
  }

  const saveKey = async (name: string, key: string) => {
    setErr(null)
    try {
      await invoke('update_node_credential', { name, openai_api_key: key })
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
          <div style={{ marginBottom: 12, padding: 12, border: '1px solid #ddd' }}>
            <h3>新增/更新节点</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input placeholder="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value.trim() })} />
              <input placeholder="base_url" value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} style={{ minWidth: 320 }} />
              <label>
                <input type="checkbox" checked={form.requires_openai_auth} onChange={e => setForm({ ...form, requires_openai_auth: e.target.checked })} />
                需要OpenAI认证
              </label>
              <input placeholder="OPENAI_API_KEY（可选）" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} style={{ minWidth: 320 }} />
              <button onClick={createOrUpdate}>保存节点</button>
            </div>
          </div>
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
                    <button onClick={() => remove(p.name, p.name === data.current_provider)} style={{ marginLeft: 8 }}>删除</button>
                    <InlineKeyEditor name={p.name} has={p.has_credential} onSave={saveKey} />
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

function InlineKeyEditor({ name, has, onSave }: { name: string, has: boolean, onSave: (name: string, key: string) => void }) {
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState('')
  return (
    <span style={{ marginLeft: 8 }}>
      {!open ? (
        <button onClick={() => setOpen(true)}>{has ? '更新凭据' : '设置凭据'}</button>
      ) : (
        <span>
          <input placeholder="OPENAI_API_KEY" value={val} onChange={e => setVal(e.target.value)} style={{ minWidth: 260 }} />
          <button onClick={() => { onSave(name, val); setOpen(false); setVal('') }} style={{ marginLeft: 4 }}>保存</button>
          <button onClick={() => { setOpen(false); setVal('') }} style={{ marginLeft: 4 }}>取消</button>
        </span>
      )}
    </span>
  )
}
