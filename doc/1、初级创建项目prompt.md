Codex Mate 最终需求说明（对齐版）

技术栈
- Rust、Tauri v2（桌面容器）
- React（前端）
- pnpm（包管理）
- Git（版本控制）

相关文档
- Codex 配置文档：https://developers.openai.com/codex/local-config#cli
- Codex MCP 配置文档：https://developers.openai.com/codex/mcp

配置文件路径
- 配置文件：`~/.codex/config.toml`
- 授权文件：`~/.codex/auth.json`
- 多节点凭据：`~/.codex/codex-mate/credentials.json`（结构：`{"<provider>": { "OPENAI_API_KEY": "..." }}`）

术语与约定
- 节点（Node）：与 `model_provider` 一一对应（示例：`packycode`、`wave`）。
- 切换节点：将 `config.toml` 的 `model_provider` 改为所选节点名；同时覆盖写入 `auth.json.OPENAI_API_KEY`（即使该 provider 未声明 `requires_openai_auth`）。

功能范围
- 节点管理
  - 列表：展示所有已配置节点（来源：`[model_providers.*]` 与 `credentials.json`），标记当前生效节点（`config.toml.model_provider`）。
  - 切换：更新 `config.toml.model_provider`；覆盖写入 `auth.json.OPENAI_API_KEY` 为所选节点在 `credentials.json` 中的值。
  - 新增：在 UI 中创建新节点，要求：
    - 在 `config.toml` 新建 `[model_providers.<name>]`，其中：
      - `name` 必须与 `<name>` 一致（必填）
      - `base_url`（必填）
      - `wire_api` 默认 `"responses"`
      - 其余字段可选（如 `requires_openai_auth` 等）
    - 在 `credentials.json` 写入该节点的 `OPENAI_API_KEY`（可后续编辑）。
  - 编辑：可修改 `[model_providers.<name>]` 块内已存在字段，以及该节点的 `OPENAI_API_KEY`。
  - 删除：支持删除节点（删除其 `[model_providers.<name>]` 与凭据）。若为当前激活节点，需提示并允许（或阻止）删除，具体交互由 UI 处理。

- 多节点凭据存储
  - 统一保存在 `~/.codex/codex-mate/credentials.json`。
  - 切换节点时，将所选节点的 key 覆盖写入 `~/.codex/auth.json` 的 `OPENAI_API_KEY`。
  - 不提供“一键初始化”`auth.json`；若文件不存在，UI 显示缺失状态。执行切换时按需写入会创建该文件。

- MCP 管理
  - 列表：读取并展示 `config.toml` 中的 `[mcp_servers.*]`。
  - 新增：通过 UI 新增 `[mcp_servers.<name>]`，可填写 `command` 和 `args`；内置快捷项：`context7`（`command = "npx"`，`args = ["-y", "@upstash/context7-mcp"]`）。
  - 编辑/删除：直接修改或移除对应的 `[mcp_servers.<name>]` 块。
  - 仅通过直接修改 `config.toml` 实现；不调用 `codex mcp add ...` 命令。

- 全量配置编辑
  - 提供“简洁表单”覆盖常用项（节点、模型等）与 MCP。
  - 提供“高级编辑器”：支持对 `config.toml` 进行原始 TOML 编辑或可视化键值编辑，保存回写。
  - `config.toml` 的任意配置均可通过 UI 修改（不局限于节点/MCP）。

- 项目信任管理（`projects.*`）
  - 列表：展示已存在的项目路径与 `trust_level`。
  - 新增/编辑/删除：通过 UI 维护 `[projects."<绝对路径>"]` 下的 `trust_level` 字段。

- CLI 检测与引导
  - 启动/设置页检测 Codex CLI 是否可用（例如执行 `codex --version`）。
  - 未安装时显示安装引导与官网文档链接，并提供“重新检测”按钮。

行为细则
- 节点名必须与 `model_provider` 值一致。
- 切换节点时，无论目标 provider 是否声明 `requires_openai_auth`，都覆盖写入 `auth.json.OPENAI_API_KEY`。
- 不在写入前做自动备份（不生成 `*.bak`）。

补充说明
- 示例 MCP（可在 UI 中一键添加）：

```
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
```

当前示例配置片段（来自 `~/.codex/config.toml`）表明存在以下根级字段，可在 UI 中编辑：
- `model_provider`
- `model`
- `model_reasoning_effort`
- `disable_response_storage`

使用 MCP：context7（作为内置快捷添加项）
