import React from 'react'

type MessageProps = {
  type: 'success' | 'error' | 'info' | 'warning'
  children: React.ReactNode
  onClose?: () => void
}

/**
 * 消息提示组件
 */
export function Message({ type, children, onClose }: MessageProps) {
  return (
    <div className={`message message-${type}`}>
      {children}
      {onClose && (
        <button onClick={onClose} className="btn btn-sm" style={{ marginLeft: 8 }}>
          关闭
        </button>
      )}
    </div>
  )
}

type LoadingProps = {
  text?: string
}

/**
 * 加载状态组件
 */
export function Loading({ text = '加载中...' }: LoadingProps) {
  return <div className="loading">{text}</div>
}

type ErrorMessageProps = {
  error: string
  onRetry?: () => void
}

/**
 * 错误消息组件
 */
export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="error-message">
      {error}
      {onRetry && (
        <div style={{ marginTop: 8 }}>
          <button onClick={onRetry} className="btn btn-sm btn-secondary">
            重试
          </button>
        </div>
      )}
    </div>
  )
}
