import React from 'react'
import type { MenuItem } from '../../types'

type SidebarProps = {
  menuItems: MenuItem[]
  activeMenu: string
  onMenuChange: (menuId: string) => void
}

/**
 * 侧边栏组件
 */
export function Sidebar({ menuItems, activeMenu, onMenuChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Codex Mate</h1>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
            onClick={() => onMenuChange(item.id)}
          >
            {item.label}
          </div>
        ))}
      </nav>
    </aside>
  )
}
