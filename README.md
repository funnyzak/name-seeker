# Name Seeker - 用户名搜索工具

一个基于用户名发现公开资料的跨平台桌面应用程序，支持在数百个网站上搜索用户资料。

## 📖 项目说明

Name Seeker 是一款功能强大的用户名搜索工具，受到 OSINT 工具如 `blackbird` 的启发。它提供了一个用户友好的图形界面，用于基于用户名发现公开的个人资料，旨在用于教育和道德的自我研究目的。

使用 Tauri（Rust + React）框架构建，提供快速、安全、本地化的搜索体验。

## 开发指南

### 技术栈

- **前端**: React 19 + TypeScript + Vite
- **后端**: Rust + Tauri 2.x
- **HTTP 客户端**: reqwest
- **异步运行时**: tokio
- **数据源**: WhatsMyName 项目

### 项目结构

```
src/                              # React 前端
├── components/                   # UI 组件
├── hooks/                        # React Hooks
├── services/                     # 服务层
├── types/                        # TypeScript 类型定义
└── App.tsx                       # 主应用组件

src-tauri/src/                    # Rust 后端
├── core/                         # 核心业务逻辑
│   ├── search.rs                 # 搜索引擎
│   ├── sites.rs                  # 网站数据管理
│   └── models.rs                 # 数据模型
└── lib.rs                        # Tauri 命令定义
```

### 开发工作流

```bash
# 仅前端开发
deno task dev

# 完整应用开发（推荐）
deno task tauri dev

# 类型检查
deno task type-check

# 构建生产版本
deno task tauri build
```

## 隐私与安全

- **本地处理**: 所有搜索均在本地进行，不向外部服务器发送数据
- **无跟踪**: 不收集任何用户数据或分析信息
- **开源透明**: 完全开源，代码可审计

## 免责声明

本工具仅供教育和合法的 OSINT（开源情报）研究使用。用户应当：

- 遵守当地法律法规
- 尊重他人隐私
- 仅用于合法和道德的目的
- 不将工具用于恶意用途

开发者不对工具的滥用或误用承担责任。

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。