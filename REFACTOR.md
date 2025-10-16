# Codex Mate - 代码重构说明

## 🎉 重构完成

项目已成功重构，采用现代化的布局设计和清晰的代码架构。

## ✨ 主要改进

### 1. 美化布局
- **左右分栏设计**：左侧为侧边栏菜单，右侧为内容区域
- **响应式布局**：适配不同屏幕尺寸
- **现代化 UI**：使用 CSS 变量系统，统一的设计语言
- **优雅的交互**：hover 效果、过渡动画、激活状态高亮

### 2. 代码架构优化

#### 目录结构
```
src/
├── config/
│   └── menuConfig.tsx          # 菜单配置（集中管理）
├── hooks/
│   └── index.ts                # 自定义 Hooks（复用逻辑）
├── types.ts                     # TypeScript 类型定义
├── utils/
│   └── index.ts                # 工具函数
├── ui/
│   ├── components/             # 可复用组件
│   │   ├── Common.tsx          # 通用组件（Loading、Message、ErrorMessage）
│   │   ├── Layout.tsx          # 布局容器
│   │   ├── MainContent.tsx     # 主内容区
│   │   └── Sidebar.tsx         # 侧边栏
│   ├── pages/                  # 页面组件
│   │   ├── ConfigEditor.tsx    # 配置文件编辑
│   │   ├── Mcp.tsx             # MCP 管理
│   │   ├── Nodes.tsx           # 节点管理
│   │   ├── Projects.tsx        # 项目信任
│   │   └── Settings.tsx        # 设置
│   └── App.tsx                 # 主应用入口
├── main.tsx                    # React 入口
└── styles.css                  # 全局样式
```

#### 设计原则

**1. 关注点分离**
- UI 组件与业务逻辑分离
- 页面组件专注于页面级逻辑
- 通用组件可复用

**2. 低耦合高内聚**
- 每个模块职责单一
- 通过配置文件管理菜单
- 统一的错误处理和状态管理

**3. 可扩展性**
- 新增页面只需：
  1. 在 `pages/` 创建组件
  2. 在 `menuConfig.tsx` 添加配置
- 新增通用组件放入 `components/`
- 新增工具函数放入 `utils/`

**4. 可读性**
- 清晰的命名约定
- 完整的 TypeScript 类型定义
- 组件拆分合理，单一职责
- 注释说明关键逻辑

**5. 代码规范**
- 统一的代码风格
- 使用自定义 Hooks 封装复用逻辑
- 统一的错误处理模式
- 统一的状态管理方式

### 3. 自定义 Hooks

**`useAsyncAction`** - 异步操作管理
- 自动处理 loading、error、success 状态
- 统一的错误处理
- 支持成功消息提示

**`useFormState`** - 表单状态管理
- 简化表单字段更新
- 支持整体更新和重置

**`useLoadingState`** - 加载状态管理
- 统一管理加载、错误、成功状态
- 提供清除消息方法

### 4. 工具函数

- `debounce` - 防抖
- `throttle` - 节流
- `validateRequired` - 必填字段验证
- `parseCommaSeparated` - 解析逗号分隔字符串
- `arrayToCommaSeparated` - 数组转逗号分隔字符串
- `formatError` - 格式化错误消息
- `deepClone` - 深拷贝
- `delay` - 延迟执行

### 5. UI 组件库

**通用组件**：
- `Message` - 消息提示（success/error/info/warning）
- `Loading` - 加载状态
- `ErrorMessage` - 错误消息展示

**布局组件**：
- `Layout` - 主布局容器
- `Sidebar` - 侧边栏导航
- `MainContent` - 主内容区

### 6. CSS 设计系统

**CSS 变量系统**：
- 颜色系统（primary, secondary, success, danger, warning, info）
- 间距系统（xs, sm, md, lg, xl）
- 阴影系统（sm, md, lg）
- 边框系统

**组件样式**：
- 卡片（card）
- 按钮（btn, btn-primary, btn-secondary, btn-danger, btn-outline）
- 表单（input, textarea, select）
- 表格（table）
- 消息（message）
- 标签（badge）

## 📦 菜单配置

所有菜单项在 `src/config/menuConfig.tsx` 中集中管理：

```typescript
export const menuConfig: MenuItem[] = [
  { id: 'config', label: '配置文件', component: ConfigEditor },
  { id: 'mcp', label: 'MCP 管理', component: Mcp },
  { id: 'nodes', label: '节点管理', component: Nodes },
  { id: 'projects', label: '项目信任', component: Projects },
  { id: 'settings', label: '设置', component: Settings },
]
```

## 🚀 运行项目

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# Tauri 开发
pnpm tauri dev

# Tauri 构建
pnpm tauri build
```

## 📝 添加新页面

1. 在 `src/ui/pages/` 创建新组件：
```typescript
// NewPage.tsx
export function NewPage() {
  return <div>新页面内容</div>
}
```

2. 在 `src/config/menuConfig.tsx` 添加配置：
```typescript
import { NewPage } from '../ui/pages/NewPage'

export const menuConfig: MenuItem[] = [
  // ...其他菜单
  { id: 'new', label: '新页面', component: NewPage },
]
```

## 🎨 自定义样式

修改 `src/styles.css` 中的 CSS 变量：

```css
:root {
  --primary-color: #0066cc;  /* 主题色 */
  --spacing-md: 16px;         /* 间距 */
  /* ... 更多变量 */
}
```

## 📚 代码示例

### 使用 useAsyncAction Hook

```typescript
const { loading, error, success, execute, clearMessages } = useAsyncAction()

const handleSave = async () => {
  await execute(async () => {
    await invoke('save_data', { data })
  }, '保存成功')
}
```

### 使用 useFormState Hook

```typescript
const [form, updateField, updateForm, resetForm] = useFormState({
  name: '',
  email: '',
})

<input 
  value={form.name} 
  onChange={(e) => updateField('name', e.target.value)} 
/>
```

## 🎯 重构收益

- ✅ **可维护性提升**：清晰的目录结构，易于定位和修改
- ✅ **可扩展性提升**：新增功能只需添加页面和配置
- ✅ **可读性提升**：代码组织清晰，注释完善
- ✅ **用户体验提升**：现代化 UI，流畅的交互
- ✅ **开发效率提升**：复用组件和 Hooks，减少重复代码

## 🔧 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型系统
- **Tauri** - 桌面应用框架
- **Vite** - 构建工具
- **CSS Variables** - 样式系统

---

**重构完成时间**: 2025-10-16
**重构作者**: GitHub Copilot
