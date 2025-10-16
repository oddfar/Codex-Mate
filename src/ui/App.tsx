import React, { useState } from 'react'
import { Layout } from './components/Layout'
import { Sidebar } from './components/Sidebar'
import { MainContent } from './components/MainContent'
import { menuConfig } from '../config/menuConfig'

export default function App() {
  const [activeMenu, setActiveMenu] = useState(menuConfig[0].id)

  // 获取当前激活的菜单项
  const currentMenuItem = menuConfig.find((item) => item.id === activeMenu) || menuConfig[0]
  const CurrentComponent = currentMenuItem.component

  return (
    <Layout>
      <Sidebar
        menuItems={menuConfig}
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
      />
      <MainContent title={currentMenuItem.label}>
        <CurrentComponent />
      </MainContent>
    </Layout>
  )
}
