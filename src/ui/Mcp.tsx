import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

type McpServer = {
  name: string
  command?: string
  args?: string[]
}

export function Mcp() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [list, setList] = useState<McpServer[]>([])

  const [form, setForm] = useState({ name: '', command: '', args: '' })

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await invoke<McpServer[]>('list_mcp_servers')
      setList(res)
    } catch (e: any) {
      setErr(String(e))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name || !form.command) { setErr('name 与 command 必填'); return }
    setErr(null)
    try {
      const args = form.args.trim() ? form.args.split(',').map(s => s.trim()).filter(Boolean) : []
      await invoke('upsert_mcp_server', { name: form.name, command: form.command, args })
      setForm({ name: '', command: '', args: '' })
      await load()
    } catch (e: any) { setErr(String(e)) }
  }

  const del = async (name: string) => {
    setErr(null)
    try { await invoke('delete_mcp_server', { name }); await load() } catch (e: any) { setErr(String(e)) }
  }

  const quickAddContext7 = () => {
    setForm({ name: 'context7', command: 'npx', args: '-y,@upstash/context7-mcp' })
  }

  return (
    <section>
      <h2>MCP 管理</h2>
      {loading && <p>加载中…</p>}
      {err && <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{err}</pre>}
      <div style={{ marginBottom: 12 }}>
        <h3>新增/更新 MCP</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value.trim() })} />
          <input placeholder="command" value={form.command} onChange={e => setForm({ ...form, command: e.target.value })} />
          <input placeholder="args（逗号分隔）" value={form.args} onChange={e => setForm({ ...form, args: e.target.value })} style={{ minWidth: 320 }} />
          <button onClick={save}>保存</button>
          <button onClick={quickAddContext7}>快捷：context7</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>名称</th>
            <th>command</th>
            <th>args</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {list.map(item => (
            <Row key={item.name} item={item} onSaved={load} onDelete={del} />
          ))}
        </tbody>
      </table>
    </section>
  )
}

function Row({ item, onSaved, onDelete }: { item: McpServer, onSaved: () => void, onDelete: (name: string) => void }) {
  const [edit, setEdit] = useState(false)
  const [cmd, setCmd] = useState(item.command ?? '')
  const [args, setArgs] = useState((item.args ?? []).join(','))

  const save = async () => {
    const a = args.trim() ? args.split(',').map(s => s.trim()).filter(Boolean) : []
    await invoke('upsert_mcp_server', { name: item.name, command: cmd, args: a })
    setEdit(false)
    onSaved()
  }

  return (
    <tr>
      <td>{item.name}</td>
      <td>{edit ? <input value={cmd} onChange={e => setCmd(e.target.value)} /> : item.command}</td>
      <td>{edit ? <input value={args} onChange={e => setArgs(e.target.value)} /> : (item.args ?? []).join(', ')}</td>
      <td>
        {!edit ? <button onClick={() => setEdit(true)}>编辑</button> : <button onClick={save}>保存</button>}
        <button onClick={() => onDelete(item.name)} style={{ marginLeft: 8 }}>删除</button>
      </td>
    </tr>
  )
}

