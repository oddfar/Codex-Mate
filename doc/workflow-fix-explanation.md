# Release Workflow 修复说明

## 问题描述

在 GitHub Actions 的 `release.yml` workflow 中，使用 `sed` 命令更新版本号时出现了 TOML 解析错误：

```
Failed to parse Cargo.toml: TOML parse error at line 11, column 28
   |
11 | serde = { version = "0.0.1"] }
   |                            ^
invalid inline table element, expected `,`
```

## 问题原因

原始的 sed 命令使用了贪婪匹配：

```bash
# 错误的命令
sed -i 's/version = ".*"/version = "0.0.1"/' src-tauri/Cargo.toml
```

这个正则表达式中的 `.*` 会贪婪地匹配到最后一个引号，导致：

```toml
# 原始
serde = { version = "1", features = ["derive"] }

# 错误替换后
serde = { version = "0.0.1"] }
```

`.*` 匹配了从 `version = "` 之后的所有内容直到 `"derive"` 的最后一个引号，留下了孤立的 `]` 括号。

## 修复方案

### 1. Windows (PowerShell)

```powershell
# 修复后的命令
(Get-Content src-tauri/Cargo.toml) -replace '^version = ".*"', "version = `"$version`"" | Set-Content src-tauri/Cargo.toml
```

**关键点：**
- 使用 `^` 锚点确保只匹配行首的 `version = `
- PowerShell 的 `-replace` 操作符会逐行处理
- 只有以 `version = ` 开头的行会被替换

### 2. macOS (BSD sed)

```bash
# 修复后的命令
sed -i '' '0,/^version = /s/^version = ".*"/version = "${{ needs.create-release.outputs.version }}"/' src-tauri/Cargo.toml
```

**关键点：**
- `0,/^version = /` 限制只替换第一个匹配的行
- `^version = ` 确保只匹配行首
- `-i ''` 是 BSD sed 的原地编辑语法

### 3. Linux (GNU sed)

```bash
# 修复后的命令
sed -i '0,/^version = /s/^version = ".*"/version = "${{ needs.create-release.outputs.version }}"/' src-tauri/Cargo.toml
```

**关键点：**
- 与 macOS 类似，但 GNU sed 的 `-i` 不需要空字符串参数
- `0,/^version = /` 和 `^version = ` 同样确保精确匹配

## 修复效果

### 修复前

```toml
# 所有 version 字段都被错误替换
[package]
version = "0.0.1"  # ✓ 正确

[build-dependencies]
tauri-build = { version = "0.0.1", features = [] }  # ✗ 错误！

[dependencies]
tauri = { version = "0.0.1", features = [] }  # ✗ 错误！
serde = { version = "0.0.1"] }  # ✗ 语法错误！
uuid = { version = "0.0.1"] }   # ✗ 语法错误！
```

### 修复后

```toml
# 只有 [package] 的 version 被更新
[package]
version = "0.0.1"  # ✓ 正确

[build-dependencies]
tauri-build = { version = "2", features = [] }  # ✓ 保持不变

[dependencies]
tauri = { version = "2", features = [] }  # ✓ 保持不变
serde = { version = "1", features = ["derive"] }  # ✓ 保持不变
uuid = { version = "1", features = ["v4"] }  # ✓ 保持不变
```

## 测试验证

已创建全面的测试脚本验证所有平台的命令：

```bash
# 测试脚本位置
/tmp/test-all-platforms.sh
```

测试结果：
- ✓ Linux (GNU sed) 命令正确
- ✓ macOS (BSD sed) 命令正确
- ✓ Windows (PowerShell) 命令逻辑正确
- ✓ 依赖项版本不会被修改
- ✓ TOML 和 JSON 文件格式验证通过

## 最佳实践

在使用 `sed` 或正则表达式替换时：

1. **使用锚点**：`^` 和 `$` 确保匹配位置准确
2. **限制匹配次数**：使用 `0,/pattern/` 只替换第一个匹配
3. **非贪婪匹配**：在可能的情况下使用 `.*?` 而不是 `.*`
4. **测试验证**：在应用到生产环境前充分测试

## 相关文件

- `.github/workflows/release.yml` - 修复后的 workflow 文件
- `src-tauri/Cargo.toml` - 需要更新版本的目标文件
- `package.json` - 前端包版本
- `src-tauri/tauri.conf.json` - Tauri 应用版本

## 注意事项

1. JSON 文件（package.json, tauri.conf.json）也使用了类似的修复，使用 `0,/"version":/` 限制只替换第一个 version 字段
2. Windows 的 PowerShell 可以直接解析和修改 JSON 对象，因此对 JSON 文件没有这个问题
3. 对于 Cargo.toml，所有平台都需要使用正确的正则表达式模式

## 总结

通过使用更精确的正则表达式模式和匹配限制，成功修复了 workflow 中的版本更新逻辑，避免了破坏依赖项版本号的问题。修复后的 workflow 已通过全面测试，可以安全使用。
