import React from 'react'

type LayoutProps = {
  children: React.ReactNode
}

/**
 * 主布局容器
 */
export function Layout({ children }: LayoutProps) {
  return <div className="app-container">{children}</div>
}
