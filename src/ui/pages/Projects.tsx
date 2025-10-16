import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { Project } from '../../types'
import { useAsyncAction, useFormState } from '../../hooks'
import { validateRequired } from '../../utils'
import { Loading, ErrorMessage, Message } from '../components/Common'

/**
 * 项目信任管理页面
 */
export function Projects() {
  const [list, setList] = useState<Project[]>([])
  const { loading, error, success, execute, clearMessages } = useAsyncAction()
  const [form, updateField, updateForm, resetForm] = useFormState({
    path: '',
    trust_level: 'trusted',
  })

  const loadProjects = async () => {
    await execute(async () => {
      const data = await invoke<Project[]>('list_projects')
      setList(data)
    })
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleSave = async () => {
    const validationError = validateRequired(form, ['path'])
    if (validationError) {
      return execute(async () => {
        throw new Error(validationError)
      })
    }

    await execute(async () => {
      await invoke('upsert_project', {
        path: form.path,
        trust_level: form.trust_level,
      })
      resetForm()
      await loadProjects()
    }, '项目已保存')
  }

  const handleDelete = async (path: string) => {
    if (!confirm(`确定要删除项目 "${path}" 吗？`)) return

    await execute(async () => {
      await invoke('delete_project', { path })
      await loadProjects()
    }, '项目已删除')
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">添加项目</h3>
        </div>

        {loading && <Loading />}
        {error && <ErrorMessage error={error} />}
        {success && <Message type="success" onClose={clearMessages}>{success}</Message>}

        <div className="form-group">
          <div className="input-group">
            <input
              type="text"
              placeholder="项目绝对路径"
              value={form.path}
              onChange={(e) => updateField('path', e.target.value)}
              style={{ minWidth: 400 }}
            />
            <select
              value={form.trust_level}
              onChange={(e) => updateField('trust_level', e.target.value)}
            >
              <option value="trusted">trusted（信任）</option>
              <option value="untrusted">untrusted（不信任）</option>
            </select>
            <button onClick={handleSave} disabled={loading} className="btn btn-primary">
              保存
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">项目列表</h3>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>路径</th>
                <th style={{ width: 150 }}>信任级别</th>
                <th style={{ width: 200 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    暂无项目
                  </td>
                </tr>
              ) : (
                list.map((project) => (
                  <ProjectRow
                    key={project.path}
                    project={project}
                    onSaved={loadProjects}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

type ProjectRowProps = {
  project: Project
  onSaved: () => void
  onDelete: (path: string) => void
}

function ProjectRow({ project, onSaved, onDelete }: ProjectRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [trustLevel, setTrustLevel] = useState(project.trust_level)

  const handleSave = async () => {
    await invoke('upsert_project', {
      path: project.path,
      trust_level: trustLevel,
    })
    setIsEditing(false)
    onSaved()
  }

  if (isEditing) {
    return (
      <tr>
        <td>{project.path}</td>
        <td>
          <select value={trustLevel} onChange={(e) => setTrustLevel(e.target.value)}>
            <option value="trusted">trusted</option>
            <option value="untrusted">untrusted</option>
          </select>
        </td>
        <td>
          <div className="btn-group">
            <button onClick={handleSave} className="btn btn-sm btn-success">
              保存
            </button>
            <button onClick={() => setIsEditing(false)} className="btn btn-sm btn-outline">
              取消
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{project.path}</td>
      <td>
        <span className={`badge ${project.trust_level === 'trusted' ? 'badge-success' : 'badge-danger'}`}>
          {project.trust_level}
        </span>
      </td>
      <td>
        <div className="btn-group">
          <button onClick={() => setIsEditing(true)} className="btn btn-sm btn-outline">
            编辑
          </button>
          <button onClick={() => onDelete(project.path)} className="btn btn-sm btn-danger">
            删除
          </button>
        </div>
      </td>
    </tr>
  )
}
