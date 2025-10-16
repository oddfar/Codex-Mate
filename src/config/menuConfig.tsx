import type { MenuItem } from '../types'
import { ConfigEditor } from '../ui/pages/ConfigEditor'
import { Mcp } from '../ui/pages/Mcp'
import { Nodes } from '../ui/pages/Nodes'
import { Projects } from '../ui/pages/Projects'
import { Settings } from '../ui/pages/Settings'

/**
 * 菜单配置
 */
export const menuConfig: MenuItem[] = [
  {
    id: 'config',
    label: '配置文件',
    component: ConfigEditor,
  },
  {
    id: 'mcp',
    label: 'MCP 管理',
    component: Mcp,
  },
  {
    id: 'nodes',
    label: '节点管理',
    component: Nodes,
  },
  {
    id: 'projects',
    label: '项目信任',
    component: Projects,
  },
  {
    id: 'settings',
    label: '设置',
    component: Settings,
  },
]
