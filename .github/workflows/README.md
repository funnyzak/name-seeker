# 🚀 GitHub Actions 工作流使用指南

本文档说明如何使用项目中的 GitHub Actions 工作流进行自动化构建和发布。

## 📋 目录

- [工作流概述](#工作流概述)
- [前置准备](#前置准备)
- [触发方式](#触发方式)
- [配置说明](#配置说明)
- [发布流程](#发布流程)
- [常见问题](#常见问题)

## 🎯 工作流概述

### release.yml - 发布工作流

自动化多平台构建、打包和发布流程，支持：

- ✅ **多平台构建**：Windows (x64)、macOS (Universal)、Linux (x64)
- ✅ **自动更新**：Tauri Updater 集成，生成更新清单
- ✅ **安全校验**：SHA-256 哈希值生成
- ✅ **GitHub Release**：自动创建并上传所有产物
- ✅ **通知系统**：Apprise 通知支持

## 🔧 前置准备

### 1. 配置 GitHub Secrets

在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中配置以下密钥：

#### 可选：代码签名（生产环境强烈推荐）

**Tauri 更新签名**（已配置则跳过）：
```bash
# 生成 Tauri 更新签名密钥对
npm run tauri signer generate

# 将私钥添加到 GitHub Secrets
TAURI_SIGNING_PRIVATE_KEY=<私钥内容>
TAURI_SIGNING_PRIVATE_KEY_PASSWORD=<密钥密码>

# 将公钥配置到 tauri.conf.json 的 plugins.updater.pubkey
```

**macOS 代码签名**（如需公证）：
- `APPLE_CERTIFICATE` - Base64 编码的 .p12 证书
- `APPLE_CERTIFICATE_PASSWORD` - 证书密码
- `APPLE_ID` - Apple ID
- `APPLE_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - 团队 ID

**Windows 代码签名**（如需签名）：
- `WINDOWS_CERTIFICATE` - Base64 编码的证书
- `WINDOWS_CERTIFICATE_PASSWORD` - 证书密码

### 2. 配置 GitHub Variables

在 `Settings → Secrets and variables → Actions → Variables` 中配置：

- `APPRISE_HTTP_URL` - Apprise HTTP 通知地址（可选）
  ```
  示例：https://apprise.example.com/notify
  ```

### 3. 验证版本一致性

确保以下文件中的版本号一致：
- `package.json` → `version`
- `src-tauri/tauri.conf.json` → `version`
- `src-tauri/Cargo.toml` → `version`

可以使用项目提供的脚本统一更新版本：
```bash
bash scripts/update-version.sh 1.0.0
```

### 4. 配置 Tauri Updater

在 `src-tauri/tauri.conf.json` 中确保已配置：

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/latest.json"
      ]
    }
  }
}
```

## 🎬 触发方式

### 方式 1：Git Tag 触发（推荐）

这是最常用的发布方式：

```bash
# 1. 确保所有改动已提交
git add .
git commit -m "chore: prepare release v1.0.0"

# 2. 创建并推送 tag
git tag v1.0.0
git push origin v1.0.0

# 3. 工作流将自动触发
```

**版本号规范**：
- 正式版：`v1.0.0`、`v2.3.4`
- 预发布版：`v1.0.0-beta.1`、`v2.0.0-alpha.3`、`v1.5.0-rc.1`

### 方式 2：手动触发

在 GitHub 网页端手动触发：

1. 进入 `Actions` 页面
2. 选择 `🚀 Release Build & Publish` 工作流
3. 点击 `Run workflow` 按钮
4. 填写参数：
   - **Version**：版本号（不含 v 前缀，如 `1.0.0`）
   - **Prerelease**：是否为预发布版本（默认 false）
5. 点击 `Run workflow` 执行

## 🔄 发布流程

### 完整流程图

```
1. 触发工作流 (Tag 推送或手动)
   ↓
2. 版本验证和提取
   ↓
3. 并行构建各平台
   ├─ Windows (x64)
   ├─ macOS (Universal Binary)
   └─ Linux (AppImage/deb/rpm)
   ↓
4. 生成 SHA-256 哈希校验文件
   ↓
5. 生成 Tauri 更新清单 (latest.json)
   ↓
6. 创建 GitHub Release
   ├─ 上传所有安装包
   ├─ 上传哈希校验文件
   ├─ 上传更新清单
   └─ 生成 Release Notes
   ↓
7. 发送 Apprise 通知（如已配置）
```

### 构建产物

每个平台会生成以下文件：

#### Windows
- `NameSeeker_X.X.X_windows_x64.msi` - 安装包
- `*.msi.zip` - 更新包
- `*.msi.zip.sig` - 更新签名

#### macOS
- `NameSeeker_X.X.X_macos_universal.dmg` - 安装包（Universal Binary）
- `*.app.tar.gz` - 更新包
- `*.app.tar.gz.sig` - 更新签名

#### Linux
- `NameSeeker_X.X.X_linux_x64.AppImage` - 便携版
- `NameSeeker_X.X.X_linux_amd64.deb` - Debian/Ubuntu 包
- `NameSeeker_X.X.X_linux_x86_64.rpm` - Fedora/RHEL 包
- `*.AppImage.tar.gz` - 更新包
- `*.AppImage.tar.gz.sig` - 更新签名

#### 其他文件
- `NameSeeker-X.X.X-sha256sum.txt` - SHA-256 哈希校验文件
- `latest.json` - Tauri 更新清单

### 时间估计

典型构建时间（包含缓存）：
- Windows: ~10-15 分钟
- macOS: ~15-20 分钟
- Linux: ~10-15 分钟
- 总计: ~20-30 分钟（并行构建）

## 📊 监控和调试

### 查看构建状态

1. **GitHub Actions 页面**
   - 访问仓库的 `Actions` 标签
   - 查看工作流运行历史和实时日志

2. **构建徽章**（可选）
   ```markdown
   ![Release](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/release.yml/badge.svg)
   ```

### 调试失败的构建

如果构建失败，请检查：

1. **版本号一致性**
   ```bash
   # 检查 package.json
   cat package.json | grep '"version"'
   
   # 检查 tauri.conf.json
   cat src-tauri/tauri.conf.json | grep '"version"'
   
   # 检查 Cargo.toml
   cat src-tauri/Cargo.toml | grep '^version'
   ```

2. **依赖安装**
   - 查看 job 日志中的 "Install dependencies" 步骤
   - 确认所有依赖成功安装

3. **编译错误**
   - 查看 "Build Tauri application" 步骤的详细日志
   - 在本地运行 `npm run tauri build` 重现问题

4. **Artifacts 下载**
   - 即使构建失败，artifacts 也会保留 90 天
   - 可以下载部分成功的构建产物进行分析

### 下载 Artifacts

即使 Release 创建失败，构建产物也会上传到 GitHub Artifacts：

1. 进入失败的工作流运行页面
2. 滚动到页面底部的 "Artifacts" 部分
3. 下载需要的构建产物

## 🔐 安全最佳实践

### 1. 使用签名密钥

**为什么需要签名？**
- 防止更新包被篡改
- 确保用户安装的是官方版本
- macOS 和 Windows 都要求签名才能通过安全检查

**如何配置签名？**

```bash
# 生成 Tauri 更新签名密钥
npm run tauri signer generate -- -w ~/.tauri/myapp.key

# 输出：
# Private: <私钥内容> (保存到 GitHub Secrets)
# Public: <公钥内容> (配置到 tauri.conf.json)

# 配置到 GitHub Secrets
# TAURI_SIGNING_PRIVATE_KEY=<私钥内容>
```

### 2. Secrets 管理

- ❌ **不要**在代码中硬编码密钥
- ✅ **必须**使用 GitHub Secrets 存储敏感信息
- ✅ **建议**定期轮换密钥
- ✅ **建议**限制 Secrets 访问权限

### 3. 权限控制

工作流使用最小权限原则：
```yaml
permissions:
  contents: write  # 仅 release job 需要
```

## 📢 Apprise 通知配置

### 什么是 Apprise？

Apprise 是一个统一的通知服务，支持 70+ 通知平台（Telegram、Discord、Slack、微信、钉钉等）。

### 配置步骤

1. **部署 Apprise API**
   ```bash
   # Docker 方式
   docker run -d -p 8000:8000 caronc/apprise:latest
   
   # 或使用现有的 Apprise 服务
   ```

2. **配置通知目标**
   ```bash
   # 示例：Telegram
   https://your-apprise-server.com/notify/telegram/<bot_token>/<chat_id>
   
   # 示例：Discord
   https://your-apprise-server.com/notify/discord/<webhook_id>/<webhook_token>
   ```

3. **添加到 GitHub Variables**
   ```
   名称：APPRISE_HTTP_URL
   值：https://your-apprise-server.com/notify/<your_config>
   ```

### 通知内容示例

```
🎉 NameSeeker 新版本发布

📦 版本信息
• 应用名称：NameSeeker
• 版本号：1.0.0
• 发布类型：正式版

💻 支持平台
• Windows x64
• macOS (Intel)
• macOS (Apple Silicon)
• Linux (AppImage/deb/rpm)

⏰ 发布时间
• 2024-01-01 12:00:00 CST

📎 相关链接
• 下载页面: https://github.com/...
• 构建日志: https://github.com/...
• 项目仓库: https://github.com/...
```

## ❓ 常见问题

### Q1: 为什么构建时间这么长？

**A:** 首次构建需要下载所有依赖（Rust、Node.js、系统库），后续构建会利用缓存，速度会显著提升。

### Q2: macOS Universal Binary 是什么？

**A:** 包含 Intel (x86_64) 和 Apple Silicon (ARM64) 两种架构的单一应用程序，用户只需下载一个文件即可在任何 Mac 上运行。

### Q3: 如何修改构建的目标平台？

**A:** 编辑 `.github/workflows/release.yml`：
- 修改 `targets` 参数
- 调整构建矩阵
- 更新产物收集逻辑

### Q4: 能否跳过某个平台的构建？

**A:** 可以，但需要修改工作流：
1. 注释掉对应的 build job
2. 更新 `needs` 依赖关系
3. 调整产物收集逻辑

### Q5: 如何测试工作流不实际发布？

**A:** 两种方式：
1. 创建带 `-test` 后缀的 tag（工作流会识别为测试）
2. 修改工作流设置 `draft: true`，创建草稿 Release

### Q6: 构建失败但不知道原因怎么办？

**A:** 
1. 查看详细的构建日志
2. 下载 artifacts 进行本地测试
3. 在本地运行相同的构建命令
4. 检查版本号是否一致
5. 查看 GitHub Actions 的系统日志

### Q7: 如何自定义 Release Notes？

**A:** 修改 `release.yml` 中的 `Generate release notes` 步骤，自定义 `release_notes.md` 的内容。

### Q8: 更新清单 (latest.json) 在哪里？

**A:** 
- 自动上传到 GitHub Release
- URL: `https://github.com/<user>/<repo>/releases/latest/download/latest.json`
- 应用启动时会自动检查此 URL

### Q9: 如何禁用自动更新功能？

**A:** 在 `src-tauri/tauri.conf.json` 中：
```json
{
  "bundle": {
    "createUpdaterArtifacts": false  // 改为 false
  }
}
```

### Q10: 能否同时发布到其他平台？

**A:** 可以，在 `release` job 后添加额外步骤：
- 上传到自建服务器
- 推送到包管理器（如 Homebrew、Chocolatey）
- 发布到应用商店

## 📚 相关资源

- [Tauri 官方文档](https://tauri.app/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Tauri Updater 指南](https://tauri.app/v1/guides/distribution/updater)
- [Apprise 文档](https://github.com/caronc/apprise)

## 📝 更新日志

### 2024-01-16
- ✅ 初始版本创建
- ✅ 支持 Windows/macOS/Linux 多平台构建
- ✅ 集成 Tauri Updater
- ✅ 添加 SHA-256 哈希校验
- ✅ 实现 Apprise 通知

---

**有问题？** [提交 Issue](https://github.com/funnyzak/name-seeker/issues) 或查看 [讨论区](https://github.com/funnyzak/name-seeker/discussions)

