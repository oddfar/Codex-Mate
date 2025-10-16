# Codex Mate - 快速入门指南

## 🎯 项目重构成果

本次重构完成了以下目标：

### ✅ 1. 美化布局页面
- **左侧菜单栏**：显示所有功能模块（配置文件、MCP管理、节点管理、项目信任、设置）
- **右侧内容区**：展示当前选中菜单对应的内容
- **现代化设计**：统一的配色方案、圆角、阴影、过渡动画
- **响应式布局**：自适应不同屏幕尺寸

### ✅ 2. 优化代码质量

#### 低耦合
- 页面组件与通用组件分离
- 业务逻辑与 UI 组件解耦
- 配置独立管理（menuConfig.tsx）
- 类型定义集中（types.ts）

#### 高内聚
- 相关功能集中在同一模块
- 每个组件职责单一明确
- 工具函数按功能分组

#### 可扩展性
- 添加新页面只需两步：
  1. 创建页面组件
  2. 添加菜单配置
- 通用组件可复用
- Hooks 可组合使用

#### 可读性
- 清晰的目录结构
- 完整的 TypeScript 类型
- 语义化的命名
- 适当的注释

#### 代码规范
- 统一的代码风格
- 一致的错误处理
- 标准化的状态管理
- 组件拆分合理

## 🚀 开发指南

### 运行项目

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 启动 Tauri 应用
pnpm tauri dev

# 构建应用
pnpm tauri build
```

### 添加新功能页面

**步骤 1**：创建页面组件
```typescript
// src/ui/pages/NewFeature.tsx
import React, { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAsyncAction } from '../../hooks'
import { Loading, ErrorMessage, Message } from '../components/Common'

export function NewFeature() {
  const { loading, error, success, execute, clearMessages } = useAsyncAction()

  const handleAction = async () => {
    await execute(async () => {
      await invoke('your_command')
    }, '操作成功')
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">新功能</h3>
        </div>

        {loading && <Loading />}
        {error && <ErrorMessage error={error} />}
        {success && <Message type="success" onClose={clearMessages}>{success}</Message>}

        {/* 你的内容 */}
        <button onClick={handleAction} className="btn btn-primary">
          执行操作
        </button>
      </div>
    </div>
  )
}
```

**步骤 2**：注册到菜单
```typescript
// src/config/menuConfig.tsx
import { NewFeature } from '../ui/pages/NewFeature'

export const menuConfig: MenuItem[] = [
  // ...现有菜单
  {
    id: 'new-feature',
    label: '新功能',
    component: NewFeature,
  },
]
```

完成！新页面会自动出现在左侧菜单中。

### 使用自定义 Hooks

#### useAsyncAction - 处理异步操作

```typescript
const { loading, error, success, execute, clearMessages } = useAsyncAction()

// 执行异步操作
const handleSave = async () => {
  await execute(async () => {
    // 你的异步逻辑
    await invoke('save_data', { data })
  }, '保存成功') // 可选的成功消息
}

// 在 JSX 中使用
{loading && <Loading />}
{error && <ErrorMessage error={error} />}
{success && <Message type="success">{success}</Message>}
```

#### useFormState - 管理表单状态

```typescript
const [form, updateField, updateForm, resetForm] = useFormState({
  name: '',
  email: '',
  age: 0,
})

// 更新单个字段
<input 
  value={form.name} 
  onChange={(e) => updateField('name', e.target.value)} 
/>

// 更新整个表单
updateForm({ name: 'John', email: 'john@example.com', age: 30 })

// 重置表单
resetForm()
```

### 使用工具函数

```typescript
import { validateRequired, parseCommaSeparated, arrayToCommaSeparated } from '../utils'

// 验证必填字段
const error = validateRequired(form, ['name', 'email'])
if (error) {
  alert(error)
  return
}

// 解析逗号分隔的字符串
const args = parseCommaSeparated('arg1, arg2, arg3')
// ['arg1', 'arg2', 'arg3']

// 转换数组为逗号分隔的字符串
const str = arrayToCommaSeparated(['arg1', 'arg2', 'arg3'])
// 'arg1, arg2, arg3'
```

### 自定义样式

修改 `src/styles.css` 中的 CSS 变量：

```css
:root {
  /* 修改主题色 */
  --primary-color: #0066cc;
  --primary-hover: #0052a3;
  
  /* 修改间距 */
  --spacing-md: 16px;
  
  /* 修改边框圆角 */
  --border-radius: 6px;
}
```

或者为特定组件添加自定义样式：

```typescript
<div className="card" style={{ backgroundColor: '#f0f0f0' }}>
  {/* 内容 */}
</div>
```

## 📚 常用组件

### Card 卡片

```typescript
<div className="card">
  <div className="card-header">
    <h3 className="card-title">标题</h3>
    <button className="btn btn-primary">操作</button>
  </div>
  <div>卡片内容</div>
</div>
```

### 按钮样式

```typescript
<button className="btn btn-primary">主要按钮</button>
<button className="btn btn-secondary">次要按钮</button>
<button className="btn btn-success">成功按钮</button>
<button className="btn btn-danger">危险按钮</button>
<button className="btn btn-outline">边框按钮</button>
<button className="btn btn-sm">小按钮</button>
```

### 表单输入

```typescript
<div className="form-group">
  <label className="form-label">标签</label>
  <input type="text" placeholder="请输入..." />
</div>

<div className="input-group">
  <input type="text" placeholder="输入1" />
  <input type="text" placeholder="输入2" />
  <button className="btn btn-primary">提交</button>
</div>
```

### 消息提示

```typescript
<Message type="success">操作成功！</Message>
<Message type="error">操作失败！</Message>
<Message type="info">提示信息</Message>
<Message type="warning">警告信息</Message>
```

### 表格

```typescript
<div className="table-container">
  <table>
    <thead>
      <tr>
        <th>列1</th>
        <th>列2</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>数据1</td>
        <td>数据2</td>
        <td>
          <button className="btn btn-sm btn-outline">编辑</button>
          <button className="btn btn-sm btn-danger">删除</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

## 🎨 设计规范

### 颜色使用

- **Primary（主色）**: 主要操作按钮、激活状态
- **Secondary（次要）**: 辅助操作、取消按钮
- **Success（成功）**: 成功消息、确认操作
- **Danger（危险）**: 删除操作、错误消息
- **Warning（警告）**: 警告提示
- **Info（信息）**: 一般信息提示

### 间距规范

- **xs (4px)**: 极小间距
- **sm (8px)**: 小间距
- **md (16px)**: 标准间距
- **lg (24px)**: 大间距
- **xl (32px)**: 超大间距

### 组件规范

- 卡片内边距：24px
- 按钮内边距：8px 16px
- 输入框内边距：8px 16px
- 表格单元格内边距：16px

## 🔍 调试技巧

### 查看状态

使用 React DevTools：
```bash
# 安装 React DevTools 浏览器扩展
# 在浏览器中打开开发者工具，选择 React 标签
```

### 查看 Tauri 日志

```bash
# 开发模式下会在终端显示 Rust 日志
pnpm tauri dev

# 查看浏览器控制台的前端日志
```

### 常见问题

**问题 1**: 页面不显示
- 检查 menuConfig 是否正确配置
- 检查组件是否正确导出

**问题 2**: Tauri 命令调用失败
- 检查命令名称是否正确
- 检查参数是否匹配 Rust 函数签名

**问题 3**: 样式不生效
- 确保 main.tsx 中导入了 styles.css
- 检查 CSS 类名是否正确

## 📖 更多文档

- [REFACTOR.md](./REFACTOR.md) - 详细的重构说明
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 项目架构可视化

## 🎉 开始开发吧！

现在你已经了解了项目的基本结构和使用方法，可以开始开发新功能了！

如有疑问，请参考现有页面组件的实现方式。
