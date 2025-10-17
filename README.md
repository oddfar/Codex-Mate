# Codex Mate


## 发布打包（GitHub Releases）

本仓库已配置 GitHub Actions 实现跨平台打包并发布到 Releases：

- 触发方式：推送形如 `v*` 的标签（例如 `v0.0.1`）。
- 支持平台：
  - macOS: `aarch64-apple-darwin` (macos-14) 与 `x86_64-apple-darwin` (macos-13)
  - Linux: `x86_64-unknown-linux-gnu` (ubuntu-22.04)
  - Windows: `x86_64-pc-windows-msvc` (windows-latest)
- 工作流文件：`.github/workflows/release.yml`

快速开始：

1. 在仓库的 Actions 页面运行 “Tag and Bump Version” 工作流（`.github/workflows/tag-and-bump.yml`）。
   - 可手动填写版本号（例如 `v0.0.1`）；若留空将基于最新标签自动 +1 patch，若不存在则从 `v0.0.1` 开始。
2. 推送标签后会自动触发 “Release CI”，构建各平台安装包并上传到对应的 GitHub Release（草稿）。
3. 如需签名，请在仓库 Secrets 中配置：`TAURI_PRIVATE_KEY` 和 `TAURI_KEY_PASSWORD`。

注意：`tauri.conf.json`/`Cargo.toml`/`package.json` 中的 version 不会被自动写回（Release 以标签为准）。如需同步应用内版本，请手动更新。

<div align="center">

![Codex Mate Logo](https://via.placeholder.com/150)

**一个用于管理 Codex 配置、MCP 服务器、节点和项目的现代化桌面应用**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)

</div>

## 📖 简介

Codex Mate 是一个基于 Tauri 2.0 + React + TypeScript 构建的桌面应用，旨在简化 Codex CLI 的配置管理。它提供了直观的图形界面来管理：

- 📝 **配置文件编辑** - 可视化编辑 `config.toml` 文件
- 🔌 **MCP 服务器管理** - 管理 Model Context Protocol 服务器配置
- 🌐 **节点管理** - 管理 AI 节点和凭据
- 📂 **项目信任管理** - 控制项目的信任级别
- ⚙️ **系统设置** - 检测和管理 Codex CLI 安装

## ✨ 特性

- 🎨 **现代化 UI** - 美观的界面设计，流畅的交互体验
- 🚀 **高性能** - 基于 Tauri 构建，占用资源少，启动速度快
- 🔒 **安全可靠** - Rust 后端保证安全性和稳定性
- 📱 **响应式布局** - 适配不同屏幕尺寸
- 🛠️ **易于扩展** - 清晰的代码架构，易于添加新功能
- 🌍 **跨平台** - 支持 Windows、macOS 和 Linux

## 🖼️ 界面预览

<div align="center">

| 配置编辑器 | MCP 管理 |
|:---:|:---:|
| ![Config Editor](https://via.placeholder.com/400x300) | ![MCP Manager](https://via.placeholder.com/400x300) |

| 节点管理 | 项目管理 |
|:---:|:---:|
| ![Nodes Manager](https://via.placeholder.com/400x300) | ![Projects Manager](https://via.placeholder.com/400x300) |

</div>

## 🚀 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 18.0
- [pnpm](https://pnpm.io/) >= 8.0
- [Rust](https://www.rust-lang.org/) >= 1.70
- [Codex CLI](https://developers.openai.com/codex/local-config#cli)

### 安装

```bash
# 克隆仓库
git clone https://github.com/oddfar/Codex-Mate.git

# 进入项目目录
cd Codex-Mate

# 安装依赖
pnpm install
```

### 开发

```bash
# 启动开发服务器（仅前端）
pnpm dev

# 启动 Tauri 应用（前端 + 后端）
pnpm tauri dev
```

### 构建

```bash
# 构建应用
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录。

## 📁 项目结构

```
Codex Mate/
├── src/                          # 前端源码
│   ├── main.tsx                  # React 应用入口
│   ├── styles.css                # 全局样式
│   ├── types.ts                  # TypeScript 类型定义
│   ├── config/                   # 配置文件
│   │   └── menuConfig.tsx        # 菜单配置
│   ├── hooks/                    # 自定义 Hooks
│   │   └── index.ts              # Hooks 集合
│   ├── utils/                    # 工具函数
│   │   └── index.ts              # 工具函数集合
│   └── ui/                       # UI 组件
│       ├── App.tsx               # 主应用组件
│       ├── components/           # 可复用组件
│       │   ├── Common.tsx        # 通用组件
│       │   ├── Layout.tsx        # 布局组件
│       │   ├── MainContent.tsx   # 主内容区
│       │   └── Sidebar.tsx       # 侧边栏
│       └── pages/                # 页面组件
│           ├── ConfigEditor.tsx  # 配置编辑器
│           ├── Mcp.tsx           # MCP 管理
│           ├── Nodes.tsx         # 节点管理
│           ├── Projects.tsx      # 项目管理
│           └── Settings.tsx      # 设置
├── src-tauri/                    # Tauri 后端
│   ├── src/
│   │   └── main.rs               # Rust 主程序
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 配置
├── index.html                    # HTML 入口
├── package.json                  # npm 配置
├── tsconfig.json                 # TypeScript 配置
└── vite.config.ts                # Vite 配置
```

## 🛠️ 技术栈

### 前端

- **框架**: React 18.3
- **语言**: TypeScript 5.5
- **构建工具**: Vite 5.4
- **样式**: CSS3 + CSS Variables

### 后端

- **框架**: Tauri 2.0
- **语言**: Rust
- **API**: Tauri Commands

### 开发工具

- **包管理器**: pnpm
- **代码规范**: TypeScript ESLint
- **版本控制**: Git

## 📚 核心功能

### 1. 配置文件编辑

- 直接编辑 Codex 配置文件 `config.toml`
- 语法高亮和自动保存
- 一键重载配置

### 2. MCP 服务器管理

- 添加/编辑/删除 MCP 服务器
- 配置服务器命令和参数
- 管理环境变量

### 3. 节点管理

- 管理多个 AI 节点
- 切换当前激活节点
- 配置节点凭据（API Key）
- 支持各种 AI 提供商

### 4. 项目信任管理

- 管理项目信任级别
- 添加/编辑/删除项目配置
- 快速切换项目状态

### 5. 系统设置

- 检测 Codex CLI 安装状态
- 查看版本信息
- 快速访问安装文档

## 🔧 开发指南

### 添加新页面

1. 在 `src/ui/pages/` 创建页面组件：

```typescript
// src/ui/pages/NewFeature.tsx
import React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAsyncAction } from '../../hooks'

export function NewFeature() {
  const { loading, error, execute } = useAsyncAction()

  const handleAction = async () => {
    await execute(async () => {
      await invoke('your_command')
    }, '操作成功')
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">新功能</h3>
      </div>
      {/* 你的内容 */}
    </div>
  )
}
```

2. 在 `src/config/menuConfig.tsx` 注册菜单：

```typescript
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

### 自定义样式

修改 `src/styles.css` 中的 CSS 变量：

```css
:root {
  --primary-color: #0066cc;
  --spacing-md: 16px;
  --border-radius: 6px;
}
```

### Tauri 命令

在 `src-tauri/src/main.rs` 添加新命令：

```rust
#[tauri::command]
fn your_command(param: String) -> Result<String, String> {
    // 你的逻辑
    Ok("Success".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            your_command,
            // ...其他命令
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

更多开发指南请参考 [QUICKSTART.md](./QUICKSTART.md)。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 编写清晰的注释
- 保持代码简洁可读

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Tauri](https://tauri.app/) - 强大的跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Rust](https://www.rust-lang.org/) - 安全高效的系统编程语言

## 📮 联系方式

- 项目地址：[https://github.com/oddfar/Codex-Mate](https://github.com/oddfar/Codex-Mate)
- 问题反馈：[Issues](https://github.com/oddfar/Codex-Mate/issues)

## 🗺️ 路线图

- [ ] 支持多语言（国际化）
- [ ] 添加主题切换功能
- [ ] 集成终端功能
- [ ] 支持插件系统
- [ ] 云同步配置
- [ ] 自动更新功能

---

<div align="center">

**如果觉得这个项目有帮助，请给个 ⭐ Star 支持一下！**

Made with ❤️ by [oddfar](https://github.com/oddfar)

</div>
