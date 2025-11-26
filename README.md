<div align="center">
  <img src="https://github.com/user-attachments/assets/2fe8a048-b8aa-400c-ab8e-a613c45742cc" alt="NameSeeker Logo" width="100"/>
</div>

<h1 align="center"> NameSeeker</h1>

<div align="center">

[![Stars](https://img.shields.io/github/stars/funnyzak/name-seeker?style=flat)](https://github.com/funnyzak/name-seeker)
[![Release](https://img.shields.io/github/v/release/funnyzak/name-seeker?style=flat&sort=semver)](https://github.com/funnyzak/name-seeker/releases)
[![Commit activity](https://img.shields.io/github/commit-activity/m/funnyzak/name-seeker?style=flat-square)](https://hub.docker.com/r/funnyzak/name-seeker/)
[![License](https://img.shields.io/github/license/funnyzak/name-seeker?style=flat)](https://mit-license.org/)

</div>

<div align="center">

中文 ｜ [English](README_EN.md)

</div>

NameSeeker 是一款强大的跨平台桌面应用，可以在数百个网站上搜索用户名和邮箱，帮助你快速发现你的数字足迹。基于 WhatsMyName 项目数据，支持导出搜索结果为 PDF、CSV、JSON 等格式。

## 主要功能

- **广泛搜索**：在600+个网站中搜索用户名和邮箱
- **实时进度**：实时显示搜索进度和结果
- **多种导出**：支持CSV、JSON、PDF、TXT等多种格式导出
- **智能筛选**：高级筛选和排序选项
- **搜索历史**：搜索历史记录，快速访问
- **隐私保护**：本地处理 - 不向外部服务器发送数据
- **多语言支持**：支持中文、英文语言
- **跨平台**：支持 Windows、macOS 和 Linux

## 快速开始

### 下载安装

从 [GitHub Releases](https://github.com/funnyzak/name-seeker/releases) 下载最新版本：

- **macOS**: 下载 `.dmg` 文件
- **Windows**: 下载 `.exe` 安装包
- **Linux**: 下载 `.AppImage` 或 `.deb` 文件

### 运行截图

<div align="center">
  <table>
    <tr>
          <td align="center">
        <img src="https://github.com/user-attachments/assets/5b4d2e9e-a821-4a2d-9426-d06ed02abc5b" alt="NameSeeker 搜索结果" width="400"/>
        <p><em>提交用户名搜索</em></p>
      </td>
      <td align="center">
        <img src="https://github.com/user-attachments/assets/032da5d6-9333-4e50-a4b7-8bfb519ad34e" alt="NameSeeker 主界面" width="400"/>
        <p><em>用户名搜索结果</em></p>
      </td>
    </tr>
  </table>
</div>

## 数据来源

本应用基于 [**WhatsMyName**](https://github.com/WebBreacher/WhatsMyName) 项目的数据源，该项目维护了 600+ 个网站的搜索规则。WhatsMyName 是一个开源项目，提供了执行用户名枚举所需的 JSON 文件，被众多 OSINT 工具和网站广泛使用。

## 特别感谢

感谢 [**Blackbird**](https://github.com/p1ngul1n0/blackbird) 项目的启发和参考。Blackbird 是一个强大的 OSINT 工具，支持在 600+ 个平台上搜索用户名和邮箱，并集成了免费的 AI 分析功能，能够生成用户行为和技术档案。

## 隐私与安全

- **本地处理**：所有搜索都在本地执行，不会向外部服务器上传数据
- **无跟踪**：不收集用户数据或分析信息
- **开源透明**：完全开源，代码可审计
- **网络代理**：如需通过代理请求，设置环境变量 `NAMESEEKER_PROXY=http://user:pass@host:port` 后启动应用。

## 免责声明

此工具仅用于教育和合法的 OSINT（开源情报）研究目的。用户在使用本工具时应当遵守当地法律法规，尊重他人隐私权，确保仅将其用于合法和道德的目的。严禁将此工具用于任何恶意活动，包括但不限于骚扰、跟踪或其他可能侵犯他人权益的行为。开发者不对此工具的误用或滥用负责。
