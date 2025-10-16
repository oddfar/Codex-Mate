import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { McpServer } from '../../types'
import { useAsyncAction, useFormState } from '../../hooks'
import { parseCommaSeparated, arrayToCommaSeparated, validateRequired } from '../../utils'
import { Loading, ErrorMessage, Message } from '../components/Common'

/**
 * MCP 服务器管理页面
 */
export function Mcp() {
  const [list, setList] = useState<McpServer[]>([])
  const { loading, error, success, execute, clearMessages } = useAsyncAction()
  const [form, updateField, updateForm, resetForm] = useFormState({
    name: '',
    command: '',
    args: '',
  })

  const loadServers = async () => {
    await execute(async () => {
      const data = await invoke<McpServer[]>('list_mcp_servers')
      setList(data)
    })
  }

  useEffect(() => {
    loadServers()
  }, [])

  const handleSave = async () => {
    const validationError = validateRequired(form, ['name', 'command'])
    if (validationError) {
      return execute(async () => {
        throw new Error(validationError)
      })
    }

    await execute(async () => {
      const args = form.args ? parseCommaSeparated(form.args) : []
      await invoke('upsert_mcp_server', {
        name: form.name,
        command: form.command,
        args,
      })
      resetForm()
      await loadServers()
    }, 'MCP 服务器已保存')
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要删除 MCP 服务器 "${name}" 吗？`)) return

    await execute(async () => {
      await invoke('delete_mcp_server', { name })
      await loadServers()
    }, 'MCP 服务器已删除')
  }

  const quickAddContext7 = () => {
    updateForm({
      name: 'context7',
      command: 'npx',
      args: '-y,@upstash/context7-mcp',
    })
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">添加 MCP 服务器</h3>
        </div>

        {loading && <Loading />}
        {error && <ErrorMessage error={error} />}
        {success && <Message type="success" onClose={clearMessages}>{success}</Message>}

        <div className="form-group">
          <div className="input-group">
            <input
              type="text"
              placeholder="服务器名称"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value.trim())}
            />
            <input
              type="text"
              placeholder="命令"
              value={form.command}
              onChange={(e) => updateField('command', e.target.value)}
            />
            <input
              type="text"
              placeholder="参数（逗号分隔）"
              value={form.args}
              onChange={(e) => updateField('args', e.target.value)}
              style={{ minWidth: 280 }}
            />
            <button onClick={handleSave} disabled={loading} className="btn btn-primary">
              保存
            </button>
            <button onClick={quickAddContext7} className="btn btn-secondary">
              快捷添加 Context7
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">MCP 服务器列表</h3>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>命令</th>
                <th>参数</th>
                <th style={{ width: 200 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    暂无 MCP 服务器
                  </td>
                </tr>
              ) : (
                list.map((item) => (
                  <McpServerRow
                    key={item.name}
                    item={item}
                    onSaved={loadServers}
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

type McpServerRowProps = {
  item: McpServer
  onSaved: () => void
  onDelete: (name: string) => void
}

function McpServerRow({ item, onSaved, onDelete }: McpServerRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [command, setCommand] = useState(item.command ?? '')
  const [args, setArgs] = useState(arrayToCommaSeparated(item.args ?? []))

  const handleSave = async () => {
    const argsArray = args ? parseCommaSeparated(args) : []
    await invoke('upsert_mcp_server', {
      name: item.name,
      command,
      args: argsArray,
    })
    setIsEditing(false)
    onSaved()
  }

  if (isEditing) {
    return (
      <tr>
        <td>{item.name}</td>
        <td>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
          />
        </td>
        <td>
          <input
            type="text"
            value={args}
            onChange={(e) => setArgs(e.target.value)}
          />
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
      <td>{item.name}</td>
      <td>{item.command}</td>
      <td>{arrayToCommaSeparated(item.args ?? [])}</td>
      <td>
        <div className="btn-group">
          <button onClick={() => setIsEditing(true)} className="btn btn-sm btn-outline">
            编辑
          </button>
          <button onClick={() => onDelete(item.name)} className="btn btn-sm btn-danger">
            删除
          </button>
        </div>
      </td>
    </tr>
  )
}
