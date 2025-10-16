import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

type Project = { path: string, trust_level: string }

export function Projects() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [list, setList] = useState<Project[]>([])
  const [form, setForm] = useState<Project>({ path: '', trust_level: 'trusted' })

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await invoke<Project[]>('list_projects')
      setList(res)
    } catch (e: any) { setErr(String(e)) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.path) { setErr('path 必填'); return }
    setErr(null)
    try { await invoke('upsert_project', { path: form.path, trust_level: form.trust_level }); setForm({ path: '', trust_level: 'trusted' }); await load() } catch (e: any) { setErr(String(e)) }
  }
  const del = async (path: string) => {
    setErr(null)
    try { await invoke('delete_project', { path }); await load() } catch (e: any) { setErr(String(e)) }
  }

  return (
    <section>
      <h2>项目信任</h2>
      {loading && <p>加载中…</p>}
      {err && <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{err}</pre>}
      <div style={{ marginBottom: 12 }}>
        <h3>新增/更新</h3>
        <input placeholder="绝对路径" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} style={{ minWidth: 360 }} />
        <select value={form.trust_level} onChange={e => setForm({ ...form, trust_level: e.target.value })} style={{ marginLeft: 8 }}>
          <option value="trusted">trusted</option>
          <option value="untrusted">untrusted</option>
        </select>
        <button onClick={save} style={{ marginLeft: 8 }}>保存</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>路径</th>
            <th>trust_level</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {list.map(p => <ProjectRow key={p.path} p={p} onSaved={load} onDelete={del} />)}
        </tbody>
      </table>
    </section>
  )
}

function ProjectRow({ p, onSaved, onDelete }: { p: Project, onSaved: () => void, onDelete: (path: string) => void }) {
  const [edit, setEdit] = useState(false)
  const [trust, setTrust] = useState(p.trust_level)
  const save = async () => { await invoke('upsert_project', { path: p.path, trust_level: trust }); setEdit(false); onSaved() }
  return (
    <tr>
      <td>{p.path}</td>
      <td>
        {edit ? (
          <select value={trust} onChange={e => setTrust(e.target.value)}>
            <option value="trusted">trusted</option>
            <option value="untrusted">untrusted</option>
          </select>
        ) : p.trust_level}
      </td>
      <td>
        {!edit ? <button onClick={() => setEdit(true)}>编辑</button> : <button onClick={save}>保存</button>}
        <button onClick={() => onDelete(p.path)} style={{ marginLeft: 8 }}>删除</button>
      </td>
    </tr>
  )
}

