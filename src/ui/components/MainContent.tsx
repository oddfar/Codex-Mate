import React from 'react'

type MainContentProps = {
  title: string
  children: React.ReactNode
}

/**
 * 主内容区域组件
 */
export function MainContent({ title, children }: MainContentProps) {
  return (
    <main className="main-content">
      <header className="content-header">
        <h2>{title}</h2>
      </header>
      <div className="content-body">{children}</div>
    </main>
  )
}
