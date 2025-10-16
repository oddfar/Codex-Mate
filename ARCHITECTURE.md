# 项目结构可视化

## 📁 完整目录结构

```
Codex Mate/
│
├── src/
│   ├── main.tsx                      # React 应用入口
│   ├── styles.css                    # 全局样式文件
│   ├── types.ts                      # TypeScript 类型定义
│   │
│   ├── config/                       # 配置文件
│   │   └── menuConfig.tsx            # 菜单配置
│   │
│   ├── hooks/                        # 自定义 Hooks
│   │   └── index.ts                  # 统一导出所有 Hooks
│   │
│   ├── utils/                        # 工具函数
│   │   └── index.ts                  # 工具函数集合
│   │
│   └── ui/                           # UI 组件
│       ├── App.tsx                   # 主应用组件
│       │
│       ├── components/               # 可复用组件
│       │   ├── Common.tsx            # 通用组件（Message、Loading、ErrorMessage）
│       │   ├── Layout.tsx            # 布局容器
│       │   ├── MainContent.tsx       # 主内容区组件
│       │   └── Sidebar.tsx           # 侧边栏组件
│       │
│       └── pages/                    # 页面组件
│           ├── ConfigEditor.tsx      # 配置文件编辑页面
│           ├── Mcp.tsx               # MCP 服务器管理页面
│           ├── Nodes.tsx             # 节点管理页面
│           ├── Projects.tsx          # 项目信任管理页面
│           └── Settings.tsx          # 设置页面
│
├── src-tauri/                        # Tauri 后端
│   ├── src/
│   │   └── main.rs                   # Rust 主程序
│   ├── Cargo.toml                    # Rust 依赖配置
│   └── tauri.conf.json               # Tauri 配置
│
├── index.html                        # HTML 入口
├── package.json                      # npm 依赖配置
├── pnpm-lock.yaml                    # pnpm 锁文件
├── tsconfig.json                     # TypeScript 配置
├── vite.config.ts                    # Vite 配置
├── REFACTOR.md                       # 重构说明文档
└── README.md                         # 项目说明
```

## 🔄 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  - 状态管理：activeMenu                                       │
│  - 渲染：Layout + Sidebar + MainContent                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─────────────────┐
                  │                 │
         ┌────────▼────────┐  ┌────▼─────────────────┐
         │   Sidebar       │  │   MainContent        │
         │  - 菜单列表      │  │  - 当前页面标题      │
         │  - 激活状态      │  │  - 动态渲染页面组件  │
         │  - 点击切换      │  └──────────┬───────────┘
         └─────────────────┘             │
                                         │
                    ┌────────────────────┴─────────────────────┐
                    │                                           │
           ┌────────▼────────┐                        ┌────────▼────────┐
           │  Page Component │                        │  Page Component │
           │  - 业务逻辑      │                        │  - 业务逻辑      │
           │  - 状态管理      │                        │  - 状态管理      │
           │  - API 调用      │                        │  - API 调用      │
           └────────┬────────┘                        └────────┬────────┘
                    │                                          │
                    └──────────────────┬───────────────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │   Custom Hooks          │
                          │  - useAsyncAction       │
                          │  - useFormState         │
                          │  - useLoadingState      │
                          └────────────┬────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │   Tauri Invoke          │
                          │  - read_config_raw      │
                          │  - list_mcp_servers     │
                          │  - list_nodes           │
                          │  - ...                  │
                          └─────────────────────────┘
```

## 🎨 组件层次结构

```
App
└── Layout
    ├── Sidebar
    │   └── NavItem (多个)
    │       └── activeMenu 高亮显示
    │
    └── MainContent
        └── CurrentPageComponent
            ├── Card (多个)
            │   ├── CardHeader
            │   └── CardBody
            │       ├── Form
            │       │   ├── Input
            │       │   ├── Select
            │       │   └── Button
            │       │
            │       ├── Table
            │       │   ├── TableHeader
            │       │   └── TableRow (多个)
            │       │       └── Actions
            │       │
            │       └── Messages
            │           ├── Loading
            │           ├── ErrorMessage
            │           └── Message (success/error/info/warning)
            │
            └── Common Components
                ├── Loading
                ├── Message
                └── ErrorMessage
```

## 🔌 Hooks 依赖关系

```
useAsyncAction
├── useLoadingState
│   └── useState (loading, error, success)
└── execute 函数
    └── setLoadingState

useFormState
├── useState (form)
└── 返回
    ├── form (当前表单状态)
    ├── updateField (更新单个字段)
    ├── updateForm (更新整个表单)
    └── resetForm (重置表单)

useInvoke
├── useState (data, loading, error)
├── useCallback (fetch)
└── invoke (Tauri API)
```

## 🎯 页面组件功能映射

```
ConfigEditor (配置文件)
├── 功能：编辑 config.toml
├── API：read_config_raw, write_config_raw
└── 组件：Textarea + 保存/重载按钮

Mcp (MCP 管理)
├── 功能：管理 MCP 服务器
├── API：list_mcp_servers, upsert_mcp_server, delete_mcp_server
└── 组件：Form + Table + 行内编辑

Nodes (节点管理)
├── 功能：管理 AI 节点
├── API：list_nodes, upsert_node, switch_node, delete_node, update_node_credential
└── 组件：Form + Table + 凭据管理

Projects (项目信任)
├── 功能：管理项目信任级别
├── API：list_projects, upsert_project, delete_project
└── 组件：Form + Table + 行内编辑

Settings (设置)
├── 功能：检测 Codex CLI
├── API：get_codex_version
└── 组件：检测按钮 + 状态显示
```

## 🛠️ 工具函数用途

```
utils/index.ts
├── debounce          - 输入防抖
├── throttle          - 事件节流
├── validateRequired  - 表单验证
├── parseCommaSeparated - 解析参数
├── arrayToCommaSeparated - 格式化参数
├── formatError       - 错误格式化
├── deepClone         - 对象深拷贝
└── delay             - 延迟执行
```

## 🎨 样式系统架构

```
styles.css
├── CSS Variables (设计 tokens)
│   ├── 颜色系统
│   ├── 间距系统
│   ├── 阴影系统
│   └── 边框系统
│
├── 全局样式
│   ├── Reset
│   └── Body
│
├── 布局组件
│   ├── .app-container
│   ├── .sidebar
│   └── .main-content
│
├── UI 组件
│   ├── .card
│   ├── .btn (及其变体)
│   ├── .form-group
│   ├── .table
│   ├── .message
│   └── .badge
│
└── 工具类
    ├── .loading
    ├── .error-message
    └── 响应式样式
```

## 📊 状态管理流程

```
用户操作
  │
  ▼
触发 Handler
  │
  ▼
execute (useAsyncAction)
  │
  ├─► setLoadingState(true)
  │
  ├─► invoke (Tauri API)
  │     │
  │     ├─► 成功
  │     │     └─► setLoadingState(false, null, successMsg)
  │     │
  │     └─► 失败
  │           └─► setLoadingState(false, error, null)
  │
  └─► 更新 UI
        ├─► Loading 组件
        ├─► Message 组件
        └─► ErrorMessage 组件
```

---

这个可视化文档清晰地展示了项目的结构、数据流、组件层次和各个模块的职责关系。
