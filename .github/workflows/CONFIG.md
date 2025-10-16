# 🔐 工作流配置指南

本文档详细说明如何配置 GitHub Actions 工作流所需的密钥和环境变量。

## 📋 目录

- [必需配置](#必需配置)
- [可选配置](#可选配置)
- [配置步骤](#配置步骤)
- [验证配置](#验证配置)
- [故障排查](#故障排查)

## 🔑 必需配置

### 1. Tauri 更新签名

**为什么需要？**
- 确保更新包的完整性和安全性
- 防止更新包被篡改
- Tauri Updater 要求

#### 生成密钥对

```bash
# 安装 Tauri CLI（如果尚未安装）
npm install -g @tauri-apps/cli

# 生成密钥对
npm run tauri signer generate

# 或指定密钥文件路径
npm run tauri signer generate -- -w ~/.tauri/name-seeker.key
```

**输出示例：**
```
Private key: dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5...
Public key: dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDUE5MDdG...
```

#### 配置到 GitHub

1. **私钥 → GitHub Secrets**
   - 访问：`Settings → Secrets and variables → Actions → Secrets`
   - 点击 `New repository secret`
   - 名称：`TAURI_SIGNING_PRIVATE_KEY`
   - 值：私钥内容（完整复制）
   
2. **公钥 → tauri.conf.json**
   - 文件路径：`src-tauri/tauri.conf.json`
   - 配置位置：
     ```json
     {
       "plugins": {
         "updater": {
           "pubkey": "YOUR_PUBLIC_KEY_HERE",
           "endpoints": [
             "https://github.com/funnyzak/name-seeker/releases/latest/download/latest.json"
           ]
         }
       }
     }
     ```

#### 密码保护（可选）

如果生成密钥时设置了密码：

```bash
npm run tauri signer generate -- -w ~/.tauri/name-seeker.key -p
# 输入密码后生成
```

配置密码到 GitHub Secrets：
- 名称：`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- 值：您设置的密码

## 🎨 可选配置

### 2. macOS 代码签名（推荐用于正式发布）

**为什么需要？**
- 通过 macOS Gatekeeper 验证
- 用户安装时不会显示警告
- 应用可以公证（Notarization）

#### 准备证书

1. **获取开发者证书**
   - 访问 [Apple Developer](https://developer.apple.com/)
   - 注册 Apple Developer Program（$99/年）
   - 在 Xcode 或开发者网站创建证书
   - 导出为 `.p12` 格式

2. **转换为 Base64**
   ```bash
   # macOS/Linux
   base64 -i certificate.p12 -o certificate.base64
   
   # 或者使用 openssl
   openssl base64 -in certificate.p12 -out certificate.base64
   ```

3. **创建 App-specific Password**
   - 访问 [Apple ID 账户](https://appleid.apple.com/)
   - 登录后进入"安全"部分
   - 生成 App-specific password

4. **获取 Team ID**
   - 访问 [Apple Developer](https://developer.apple.com/account)
   - 在"Membership"页面查看 Team ID

#### 配置到 GitHub Secrets

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `APPLE_CERTIFICATE` | Base64 编码的证书内容 | .p12 证书 |
| `APPLE_CERTIFICATE_PASSWORD` | 证书密码 | 导出证书时设置的密码 |
| `APPLE_ID` | Apple ID 邮箱 | 例：developer@example.com |
| `APPLE_PASSWORD` | App-specific password | 专用密码，非 Apple ID 密码 |
| `APPLE_TEAM_ID` | 团队 ID | 10 位字符，如 ABCDE12345 |

#### 启用工作流中的签名

编辑 `.github/workflows/release.yml`，取消以下注释：

```yaml
- name: 🔨 Build Tauri application (Universal Binary)
  run: |
    npm run tauri build -- --target universal-apple-darwin
  env:
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

### 3. Windows 代码签名（推荐用于正式发布）

**为什么需要？**
- 通过 Windows SmartScreen 验证
- 减少用户安装时的安全警告
- 提升应用可信度

#### 准备证书

1. **获取代码签名证书**
   - 从证书颁发机构购买（如 DigiCert、Sectigo）
   - 导出为 `.pfx` 或 `.p12` 格式

2. **转换为 Base64**
   ```bash
   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | Out-File certificate.base64
   
   # Linux/macOS
   base64 -i certificate.pfx -o certificate.base64
   ```

#### 配置到 GitHub Secrets

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `WINDOWS_CERTIFICATE` | Base64 编码的证书内容 | .pfx 证书 |
| `WINDOWS_CERTIFICATE_PASSWORD` | 证书密码 | 证书密码 |

### 4. Apprise 通知（推荐）

**为什么需要？**
- 及时收到发布成功/失败通知
- 支持 70+ 通知平台
- 统一的通知接口

#### 部署 Apprise API

**选项 1：Docker 部署**
```bash
docker run -d \
  --name apprise-api \
  -p 8000:8000 \
  caronc/apprise:latest
```

**选项 2：使用现有服务**
- [Apprise API](https://github.com/caronc/apprise-api)
- 自建或使用第三方服务

#### 配置通知目标

Apprise 支持多种通知服务：

| 服务 | URL 格式 | 示例 |
|------|---------|------|
| Telegram | `tgram://bot_token/chat_id` | `tgram://123456:ABC-DEF/123456789` |
| Discord | `discord://webhook_id/webhook_token` | `discord://123/ABC...` |
| Slack | `slack://token_a/token_b/token_c` | `slack://T00/B00/XX...` |
| 企业微信 | `wxteams://corp_id/secret@app_id` | `wxteams://ww123/secret@1000002` |
| 钉钉 | `dingtalk://access_token/secret` | `dingtalk://abc123/sec456` |
| Email | `mailto://user:pass@domain` | `mailto://user:pass@smtp.gmail.com` |

更多服务请参考 [Apprise Wiki](https://github.com/caronc/apprise/wiki)

#### 配置到 GitHub Variables

1. 访问：`Settings → Secrets and variables → Actions → Variables`
2. 点击 `New repository variable`
3. 名称：`APPRISE_HTTP_URL`
4. 值：您的 Apprise 通知 URL
   ```
   示例：https://apprise.example.com/notify/tgram://123456:ABC-DEF/123456789
   ```

#### 测试通知

```bash
# 使用 curl 测试
curl -X POST "YOUR_APPRISE_URL" \
  -F "tag=test" \
  -F "title=测试通知" \
  -F "body=这是一条测试通知" \
  -F "format=text"
```

## 📝 配置步骤总结

### 快速配置清单

- [ ] **生成 Tauri 签名密钥对**
  ```bash
  npm run tauri signer generate
  ```

- [ ] **配置 GitHub Secrets（必需）**
  - [ ] `TAURI_SIGNING_PRIVATE_KEY` - Tauri 签名私钥

- [ ] **更新 tauri.conf.json**
  - [ ] 添加 Tauri 签名公钥到 `plugins.updater.pubkey`

- [ ] **配置 GitHub Secrets（可选）**
  - [ ] macOS 签名相关（5 个 secrets）
  - [ ] Windows 签名相关（2 个 secrets）

- [ ] **配置 GitHub Variables（可选）**
  - [ ] `APPRISE_HTTP_URL` - 通知 URL

- [ ] **验证配置**
  - [ ] 手动触发工作流测试
  - [ ] 检查构建日志

## ✅ 验证配置

### 1. 检查 Secrets 配置

```bash
# 无法直接查看 Secrets 内容（安全考虑）
# 但可以在工作流中验证是否配置
```

在工作流中添加验证步骤（临时）：

```yaml
- name: 🔍 Validate secrets
  run: |
    echo "检查必需的 Secrets..."
    if [ -z "${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}" ]; then
      echo "❌ TAURI_SIGNING_PRIVATE_KEY 未配置"
      exit 1
    fi
    echo "✅ 所有必需的 Secrets 已配置"
```

### 2. 测试构建流程

**选项 1：手动触发测试**
1. 访问 `Actions → 🚀 Release Build & Publish`
2. 点击 `Run workflow`
3. 输入测试版本号（如 `0.0.1-test`）
4. 观察构建过程

**选项 2：创建测试 tag**
```bash
git tag v0.0.1-test
git push origin v0.0.1-test
```

### 3. 验证更新功能

1. 构建成功后，检查 Release 中的 `latest.json`
2. 确认签名文件（`.sig`）已生成
3. 在应用中测试自动更新功能

## 🔧 故障排查

### 问题 1：更新签名验证失败

**错误信息：**
```
Error: Invalid signature
```

**可能原因：**
- 公钥和私钥不匹配
- 密钥格式错误
- 密钥配置位置错误

**解决方案：**
1. 重新生成密钥对
2. 确保完整复制密钥内容（包括开头和结尾）
3. 检查 `tauri.conf.json` 中的公钥配置
4. 验证 GitHub Secrets 中的私钥配置

### 问题 2：macOS 公证失败

**错误信息：**
```
Error: Notarization failed
```

**可能原因：**
- Apple ID 或密码错误
- Team ID 不正确
- 证书已过期
- 未加入 Apple Developer Program

**解决方案：**
1. 验证 Apple ID 和 App-specific password
2. 检查 Team ID（在开发者账户中确认）
3. 确认证书有效期
4. 确保已付费订阅 Apple Developer Program

### 问题 3：Windows 签名失败

**错误信息：**
```
Error: Signing failed
```

**可能原因：**
- 证书格式错误
- 证书密码错误
- 证书已过期

**解决方案：**
1. 重新导出证书为 `.pfx` 格式
2. 验证证书密码
3. 检查证书有效期
4. 确保 Base64 编码正确

### 问题 4：Apprise 通知未发送

**现象：**
发布成功但未收到通知

**可能原因：**
- URL 配置错误
- 通知服务不可访问
- 通知配置错误

**解决方案：**
1. 使用 curl 测试 Apprise URL
2. 检查通知服务配置（如 bot token、chat ID）
3. 查看工作流日志中的详细错误
4. 验证网络连接

### 问题 5：构建时提示 Secrets 未配置

**错误信息：**
```
Error: Required secret not found
```

**解决方案：**
1. 确认 Secret 名称拼写正确（区分大小写）
2. 检查 Secret 是否已保存
3. 确认在正确的仓库中配置
4. 检查工作流中的 Secret 引用语法

## 🔒 安全最佳实践

### ✅ 应该做的

- 使用 GitHub Secrets 存储所有敏感信息
- 定期轮换密钥（建议每年）
- 为不同环境使用不同的密钥
- 限制密钥访问权限
- 启用双因素认证
- 定期审查 Secrets 配置

### ❌ 不应该做的

- 在代码中硬编码密钥
- 将密钥提交到 Git 仓库
- 在日志中打印密钥内容
- 与他人分享密钥
- 在公开文档中展示真实密钥
- 使用弱密码保护证书

## 📚 相关资源

- [GitHub Actions Secrets 文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Tauri 签名文档](https://tauri.app/v1/guides/distribution/sign-macos)
- [Apprise 配置 Wiki](https://github.com/caronc/apprise/wiki)
- [Apple 公证文档](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Windows 代码签名指南](https://learn.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)

## 📞 获取帮助

配置过程中遇到问题？

- 查看 [工作流 README](./README.md)
- 查看 [发布指南](../.github/RELEASE_GUIDE.md)
- 提交 [Issue](https://github.com/funnyzak/name-seeker/issues)
- 加入 [讨论区](https://github.com/funnyzak/name-seeker/discussions)

---

**配置完成后，您就可以开始使用自动化发布流程了！** 🎉

