import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { NodeList, Provider } from '../../types'
import { useAsyncAction, useFormState } from '../../hooks'
import { validateRequired } from '../../utils'
import { Loading, ErrorMessage, Message } from '../components/Common'

/**
 * 节点管理页面
 */
export function Nodes() {
  const [data, setData] = useState<NodeList | null>(null)
  const { loading, error, success, execute, clearMessages } = useAsyncAction()
  const [form, updateField, updateForm, resetForm] = useFormState({
    name: '',
    base_url: '',
    requires_openai_auth: false,
    key: '',
  })

  const loadNodes = async () => {
    await execute(async () => {
      const result = await invoke<NodeList>('list_nodes')
      setData(result)
    })
  }

  useEffect(() => {
    loadNodes()
  }, [])

  const handleSaveNode = async () => {
    const validationError = validateRequired(form, ['name', 'base_url'])
    if (validationError) {
      return execute(async () => {
        throw new Error(validationError)
      })
    }

    await execute(async () => {
      const providerFields = {
        name: form.name,
        base_url: form.base_url,
        wire_api: 'responses',
        requires_openai_auth: form.requires_openai_auth,
      }
      const credential = form.key || undefined
      await invoke('upsert_node', {
        name: form.name,
        provider_fields: providerFields,
        credential,
      })
      resetForm()
      await loadNodes()
    }, '节点已保存')
  }

  const handleSwitchNode = async (name: string) => {
    await execute(async () => {
      await invoke('switch_node', { name })
      await loadNodes()
    }, `已切换到节点: ${name}`)
  }

  const handleDeleteNode = async (name: string, isActive: boolean) => {
    if (isActive && !confirm('当前为激活节点，确定仍要删除？')) {
      return
    }

    await execute(async () => {
      await invoke('delete_node', { name, force: isActive })
      await loadNodes()
    }, '节点已删除')
  }

  /**
   * 更新节点凭据
   * @param name 节点名称
   * @param key API 密钥
   */
  // 返回 true 表示更新成功，false 表示失败（用于行内编辑器是否关闭）
  const handleUpdateCredential = async (name: string, key: string): Promise<boolean> => {
    const trimmed = key.trim()
    console.log('[DEBUG] handleUpdateCredential called:', { name, keyLength: trimmed.length })
    if (!trimmed) {
      // 前端兜底校验，避免传空串到后端
      alert('请输入有效的凭据')
      return false
    }
    try {
      console.log('[DEBUG] Invoking update_node_credential...')
  await invoke('update_node_credential', { name, openai_api_key: trimmed })
      console.log('[DEBUG] Credential updated, reloading nodes...')
      await loadNodes()
      try {
        const creds = await invoke<Record<string, any>>('get_credentials')
      } catch (e) {
        console.warn('[WARN] get_credentials invoke failed:', e)
      }
      console.log('[DEBUG] Nodes reloaded successfully')
      return true
    } catch (e: any) {
      console.error('[ERROR] update_node_credential invoke failed:', e)
      // 将后端错误抛给用户，便于迅速定位
      alert(`保存凭据失败: ${String(e)}`)
      return false
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">添加节点</h3>
        </div>

        {loading && <Loading />}
        {error && <ErrorMessage error={error} />}
        {success && <Message type="success" onClose={clearMessages}>{success}</Message>}

        {data && (
          <div style={{ marginBottom: 16 }}>
            <Message type="info">
              当前激活节点: <strong>{data.current_provider || '未设置'}</strong>
            </Message>
          </div>
        )}

        <div className="form-group">
          <div className="input-group">
            <input
              type="text"
              placeholder="节点名称"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value.trim())}
            />
            <input
              type="text"
              placeholder="Base URL"
              value={form.base_url}
              onChange={(e) => updateField('base_url', e.target.value)}
              style={{ minWidth: 280 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={form.requires_openai_auth}
                onChange={(e) => updateField('requires_openai_auth', e.target.checked)}
              />
              需要 OpenAI 认证
            </label>
            <input
              type="password"
              placeholder="OPENAI_API_KEY（可选）"
              value={form.key}
              onChange={(e) => updateField('key', e.target.value)}
              style={{ minWidth: 240 }}
            />
            <button onClick={handleSaveNode} disabled={loading} className="btn btn-primary">
              保存节点
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">节点列表</h3>
            <button onClick={loadNodes} disabled={loading} className="btn btn-outline">
              刷新
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>Base URL</th>
                  <th>Wire API</th>
                  <th>需要认证</th>
                  <th>有凭据</th>
                  <th style={{ width: 280 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.providers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      暂无节点
                    </td>
                  </tr>
                ) : (
                  data.providers.map((provider) => (
                    <NodeRow
                      key={provider.name}
                      provider={provider}
                      isActive={provider.name === data.current_provider}
                      onSwitch={handleSwitchNode}
                      onDelete={handleDeleteNode}
                      onUpdateCredential={handleUpdateCredential}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

type NodeRowProps = {
  provider: Provider
  isActive: boolean
  onSwitch: (name: string) => void
  onDelete: (name: string, isActive: boolean) => void
  onUpdateCredential: (name: string, key: string) => Promise<boolean>
}

function NodeRow({ provider, isActive, onSwitch, onDelete, onUpdateCredential }: NodeRowProps) {
  const [showKeyEditor, setShowKeyEditor] = useState(false)
  const [keyValue, setKeyValue] = useState('')

  /**
   * 保存凭据
   * 1. 验证输入不为空
   * 2. 调用父组件的 onUpdateCredential 函数
   * 3. 保存成功后清空输入并关闭编辑器
   */
  const handleSaveKey = async () => {
    const trimmedKey = keyValue.trim()
    console.log('[DEBUG] NodeRow.handleSaveKey:', { provider: provider.name, keyLength: trimmedKey.length })
    
    if (!trimmedKey) {
      console.warn('[DEBUG] Empty key, aborting')
      alert('请输入凭据')
      return
    }
    
    console.log('[DEBUG] Calling onUpdateCredential...')
    const ok = await onUpdateCredential(provider.name, trimmedKey)
    console.log('[DEBUG] onUpdateCredential completed, result =', ok)
    if (ok) {
      setKeyValue('')
      setShowKeyEditor(false)
    } else {
      // 失败时保留输入，避免用户二次输入；并弹出提示
      alert('保存凭据失败，请查看页面顶部错误信息或后端日志')
      try {
        const info = await invoke('debug_credentials_info')
        console.log('[DEBUG] debug_credentials_info:', info)
      } catch (e) {
        console.warn('[WARN] debug_credentials_info invoke failed:', e)
      }
    }
  }

  return (
    <tr style={{ fontWeight: isActive ? 600 : 400 }}>
      <td>
        {provider.name}
        {isActive && <span className="badge badge-success" style={{ marginLeft: 8 }}>活跃</span>}
      </td>
      <td>{provider.base_url || '-'}</td>
      <td>{provider.wire_api || '-'}</td>
      <td>{provider.requires_openai_auth ? '是' : '否'}</td>
      <td>{provider.has_credential ? '✓' : '✗'}</td>
      <td>
        {!showKeyEditor ? (
          <div className="btn-group">
            <button
              onClick={() => onSwitch(provider.name)}
              disabled={isActive}
              className="btn btn-sm btn-primary"
            >
              切换
            </button>
            <button
              onClick={() => setShowKeyEditor(true)}
              className="btn btn-sm btn-outline"
            >
              {provider.has_credential ? '更新凭据' : '设置凭据'}
            </button>
            <button
              onClick={() => onDelete(provider.name, isActive)}
              className="btn btn-sm btn-danger"
            >
              删除
            </button>
          </div>
        ) : (
          <div className="input-group">
            <input
              type="password"
              placeholder="OPENAI_API_KEY"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              style={{ minWidth: 180 }}
            />
            <button onClick={handleSaveKey} className="btn btn-sm btn-success">
              保存
            </button>
            <button
              onClick={() => {
                setShowKeyEditor(false)
                setKeyValue('')
              }}
              className="btn btn-sm btn-outline"
            >
              取消
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
