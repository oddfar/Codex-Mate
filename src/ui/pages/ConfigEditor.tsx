import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAsyncAction } from '../../hooks'
import { Loading, ErrorMessage, Message } from '../components/Common'

/**
 * 配置文件编辑器页面
 */
export function ConfigEditor() {
  const [content, setContent] = useState('')
  const { loading, error, success, execute, clearMessages } = useAsyncAction()

  const loadConfig = async () => {
    const result = await execute(
      async () => {
        const data = await invoke<string>('read_config_raw')
        setContent(data)
        return data
      },
      undefined // 不显示成功消息
    )
    return result
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const saveConfig = async () => {
    await execute(async () => {
      await invoke('write_config_raw', { content })
    }, '配置已保存')
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">编辑 config.toml</h3>
          <div className="btn-group">
            <button 
              onClick={saveConfig} 
              disabled={loading} 
              className="btn btn-primary"
            >
              保存
            </button>
            <button 
              onClick={loadConfig} 
              disabled={loading} 
              className="btn btn-outline"
            >
              重新加载
            </button>
          </div>
        </div>

        {loading && <Loading />}
        {error && <ErrorMessage error={error} onRetry={loadConfig} />}
        {success && <Message type="success" onClose={clearMessages}>{success}</Message>}

        <div className="form-group">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="code-editor"
            placeholder="配置文件内容..."
          />
        </div>
      </div>
    </div>
  )
}
