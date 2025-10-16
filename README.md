# Name Seeker - Username Search Tool

A cross-platform desktop application for discovering public profiles based on usernames, supporting searches across hundreds of websites.

## 📖 Project Description

Name Seeker is a powerful username search tool inspired by OSINT tools like `blackbird`. It provides a user-friendly graphical interface for discovering public profiles based on usernames, designed for educational and ethical self-research purposes.

Built with the Tauri (Rust + React) framework, it delivers a fast, secure, and localized search experience.

## Development Guide

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust + Tauri 2.x
- **HTTP Client**: reqwest
- **Async Runtime**: tokio
- **Data Source**: WhatsMyName project

### Project Structure

```
src/                              # React frontend
├── components/                   # UI components
├── hooks/                        # React Hooks
├── services/                     # Service layer
├── types/                        # TypeScript type definitions
└── App.tsx                       # Main application component

src-tauri/src/                    # Rust backend
├── core/                         # Core business logic
│   ├── search.rs                 # Search engine
│   ├── sites.rs                  # Website data management
│   └── models.rs                 # Data models
└── lib.rs                        # Tauri command definitions
```

### Development Workflow

```bash
# Frontend development only
deno task dev

# Full application development (recommended)
deno task tauri dev

# Type checking
deno task type-check

# Build production version
deno task tauri build
```

## Privacy & Security

- **Local Processing**: All searches are performed locally, no data is sent to external servers
- **No Tracking**: No user data or analytics information is collected
- **Open Source Transparency**: Fully open source with auditable code

## Disclaimer

This tool is intended for educational and legitimate OSINT (Open Source Intelligence) research purposes only. Users should:

- Comply with local laws and regulations
- Respect others' privacy
- Use only for legal and ethical purposes
- Not use the tool for malicious purposes

The developers are not responsible for misuse or abuse of this tool.
