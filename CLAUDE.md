# CLAUDE.md - Development Guide for `name-seeker`

This file provides guidance for developing the `name-seeker` application.

## 🚀 Project Mission

`name-seeker` is a cross-platform desktop application for discovering public profiles across hundreds of websites based on a username. It is built using Tauri (Rust + React) and is inspired by the capabilities of OSINT tools like `blackbird`. The primary goal is to provide a user-friendly graphical interface for a powerful search function, intended for educational and ethical self-research purposes.

-----

## 🏗️ Architecture & Implementation

This project uses a **complete Rust implementation** with no Python sidecar. The core username searching logic is implemented directly in Rust for maximum performance, a smaller application bundle, and greater stability.

### Technology Stack

  * **Frontend**: React 19 with TypeScript, built with Vite
  * **Backend**: Rust with Tauri 2.x framework
  * **Core Crates**: `reqwest` for HTTP requests, `tokio` for async runtime, `serde` for JSON serialization
  * **Data Source**: WhatsMyName project (600+ websites)
  * **Communication**: Tauri's event system with real-time updates

### Project Structure

```
src/                              # React Frontend
├── components/                   # UI Components
│   ├── AboutModal.tsx           # About application modal
│   ├── DisclaimerModal.tsx      # First-launch disclaimer modal
│   ├── ExportButton.tsx         # Results export functionality
│   ├── ProgressIndicator.tsx    # Search progress indicator
│   ├── ResultItem.tsx           # Individual result display component
│   ├── ResultsDisplay.tsx       # Results display and filtering
│   ├── ResultsFilter.tsx        # Results filtering component
│   ├── SearchForm.tsx           # Search input form with history
│   ├── SearchHistory.tsx        # Search history dropdown
│   ├── Toast.tsx                # Individual toast notification
│   ├── ToastContainer.tsx       # Toast notification container
│   └── index.ts                 # Component exports
├── hooks/                       # React Hooks
│   ├── useDisclaimer.ts         # Disclaimer state management
│   ├── useKeyboardShortcuts.ts  # Keyboard shortcuts handling
│   ├── useSearch.ts             # Search state management
│   ├── useSearchHistory.ts      # Search history persistence
│   └── useToast.ts              # Toast notification system
├── services/                    # Service Layer
│   └── tauriApi.ts              # Tauri API wrapper with singleton pattern
├── types/                       # TypeScript Definitions
│   └── index.ts                 # Complete type declarations
├── App.css                      # Application styles
├── App.tsx                      # Main application component
├── main.tsx                     # React application entry point
└── vite-env.d.ts               # Vite environment types

src-tauri/src/                    # Rust Backend
├── core/                        # Core Business Logic
│   ├── config.rs                # Application configuration
│   ├── error.rs                 # Error handling
│   ├── models.rs                # Data models
│   ├── search.rs                # Search engine core
│   ├── sites.rs                 # Website data management
│   └── utils.rs                 # Utility functions
├── lib.rs                       # Tauri commands and setup
└── main.rs                      # Application entry point
```

-----

## ✅ Implemented Features

All MVP features have been successfully implemented and are fully operational:

1.  **✅ First-Launch Disclaimer**: Modal window with usage policy and disclaimer displayed on first run
2.  **✅ Username/Email Input**: Single input field with real-time validation for usernames and emails
3.  **✅ Asynchronous Search**: Background search process with non-blocking UI and progress indicators
4.  **✅ Real-Time Results**: Live result updates as websites are checked
5.  **✅ Categorized Display**: Results grouped into "Found," "Not Found," "Error," and "Pending" categories
6.  **✅ Clickable Links**: Direct profile links for found accounts with external browser opening

### Additional Implemented Features

- **Dual Search Types**: Support for both username and email searches with format validation
- **Search History**: Local storage-based search history with quick access (max 10 items)
- **Advanced Export**: Export results to PDF, CSV, JSON, TXT formats with clipboard copy option
- **Search Control**: Start/stop search functionality with proper cleanup
- **Progress Tracking**: Real-time progress with percentage, counts, and current site
- **Results Filtering**: Real-time filtering of results by site name, category, or URL
- **Collapsible Sections**: Collapsible result categories (Found, Not Found, Error, Pending)
- **Keyboard Shortcuts**: Quick shortcuts for focus (/), stop (Esc), help (Ctrl+H), etc.
- **Toast Notifications**: Non-intrusive success/error/info/warning notifications
- **Clear Results**: Clear search results with confirmation
- **Category Filtering**: Filter websites by category (social, tech, art, etc.)
- **NSFW Filtering**: Option to exclude adult websites from search
- **Configuration**: Adjustable concurrent requests and timeout settings
- **Error Handling**: Comprehensive error reporting and recovery
- **About Modal**: Application information and version details
- **Modern UI**: Glassmorphism design with animations and responsive layout
- **Accessibility**: Full ARIA support, keyboard navigation, semantic HTML
- **Loading States**: Loading spinner and empty state with feature highlights
- **External Links**: Automatic opening of found profile links in default browser

-----

## 🔌 Tauri API Implementation

The complete API between Rust and React has been implemented with the following commands and events:

### Implemented Tauri Commands

All commands are defined in `src-tauri/src/lib.rs:19-237`:

```rust
// Application lifecycle
#[tauri::command]
async fn is_first_launch() -> Result<bool, String>

#[tauri::command]
async fn set_disclaimer_accepted() -> Result<(), String>

// Search functionality
#[tauri::command]
async fn start_search(
    app: AppHandle,
    query: String,
    searchType: SearchType,
    max_concurrent_requests: Option<usize>,
    timeout_seconds: Option<u64>,
    exclude_nsfw: Option<bool>,
    category_filter: Option<String>,
    state: tauri::State<'_, AppState>
) -> Result<(), String>

#[tauri::command]
async fn stop_search(app: AppHandle, state: tauri::State<'_, AppState>) -> Result<bool, String>

// Export and utility functions
#[tauri::command]
async fn export_results_cmd(options: ExportOptions) -> Result<String, String>
#[tauri::command]
async fn copy_to_clipboard(text: String) -> Result<(), String>
#[tauri::command]
async fn open_directory(path: String) -> Result<(), String>
#[tauri::command]
async fn get_categories() -> Result<Vec<String>, String>
#[tauri::command]
async fn validate_username_format(username: String) -> Result<bool, String>
#[tauri::command]
async fn validate_email_format(email: String) -> Result<bool, String>
#[tauri::command]
async fn open_url(url: String) -> Result<(), String>
#[tauri::command]
async fn get_app_info() -> Result<serde_json::Value, String>
```

### Implemented Tauri Events

The frontend listens for these events defined in `src-tauri/src/core/models.rs:146-163`:

- **`search-update`**: Sent for each completed website check
  - **Payload**: `{ site: "GitHub", status: "Found", url: "https://github.com/username", error?: string }`
- **`search-progress`**: Real-time progress updates
  - **Payload**: `{ total_sites: 600, checked_sites: 45, found_count: 3, error_count: 1, percentage: 7.5, current_site: "Twitter" }`
- **`search-finished`**: Sent when all sites are checked
  - **Payload**: `{ total_sites: 600, found_count: 15, duration_ms: 45000 }`
- **`search-error`**: Emitted on search failures
- **`search-stopped`**: Emitted when user stops the search

-----

## 🔧 Core Implementation Details

### Search Engine Architecture

The search functionality is implemented in `src-tauri/src/core/search.rs` with these key components:

- **Concurrent Processing**: Uses `tokio::sync::Semaphore` to limit concurrent requests (default: 30)
- **HTTP Client**: `reqwest::Client` with cookie handling and redirect following
- **Result Processing**: HTTP status code and content pattern matching
- **Real-time Updates**: Event-driven progress reporting via Tauri's event system
- **Error Handling**: Comprehensive error types with graceful degradation

### Data Management

- **Website Data**: Automatically fetches from WhatsMyName project JSON (600+ sites)
- **Local Caching**: Sites data cached locally with automatic updates
- **Configuration**: Persistent app configuration with first-launch tracking
- **User Agents**: Rotates user agents to avoid detection

### Frontend State Management

The React frontend uses a comprehensive set of custom hooks for state management:

- **`useSearch.ts`**: Manages search state, results, progress, and event handling
- **`useSearchHistory.ts`**: Handles search history persistence in localStorage
- **`useToast.ts`**: Manages toast notifications with auto-dismiss functionality
- **`useDisclaimer.ts`**: Manages first-launch disclaimer state
- **`useKeyboardShortcuts.ts`**: Handles global keyboard shortcuts and hotkeys
- **Event Listeners**: Real-time updates from Rust backend via Tauri events
- **Type Safety**: Complete TypeScript definitions matching Rust models

### UI/UX Implementation

- **Modern Design**: Glassmorphism effects with `backdrop-filter`
- **Responsive Layout**: Fluid design with CSS Grid and Flexbox
- **Animations**: Smooth transitions and loading states
- **Accessibility**: Semantic HTML and keyboard navigation

-----

## 🛡️ Security & Privacy

### Data Privacy
- **Local Processing**: All searches occur locally; no data sent to external servers
- **No Tracking**: No analytics or user data collection
- **Open Source**: Full code transparency and auditability

### Security Measures
- **Input Validation**: Client and server-side input sanitization
- **Request Limiting**: Configurable concurrency controls
- **Timeout Protection**: Prevents hanging requests
- **User Agent Rotation**: Avoids anti-bot detection

-----

## 💻 Development Guide

### Prerequisites

```bash
# Install Rust and Cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (v18+)
# Download from https://nodejs.org/

# Install Tauri CLI
cargo install tauri-cli

# Install frontend dependencies
npm install
```

### Development Workflow

```bash
# Frontend-only development (Vite dev server on port 1420)
npm run dev

# Full application development (recommended)
npm run tauri dev

# Type checking
npm run type-check

# Build for production
npm run tauri build
```

### Project Structure Notes

- **Frontend**: Modern React 19 with hooks and functional components
- **Backend**: Async Rust with proper error handling and type safety
- **Styling**: CSS-in-JS patterns with CSS variables for theming
- **Build**: Vite for frontend, Cargo for Rust backend, Tauri for bundling

### Testing and Debugging

- **Console Logging**: Rust backend uses `log` crate with `env_logger`
- **Browser DevTools**: Available in development mode for frontend debugging
- **Tauri DevTools**: Built-in development tools for inspecting the app

### Performance Optimization

- **Concurrent Requests**: Configurable pool size for website checks
- **Memory Management**: Rust's ownership system prevents leaks
- **UI Responsiveness**: Async operations prevent UI freezing
- **Bundle Size**: Optimized production builds with tree shaking

-----

## 📚 Key Files and Components

### Core Backend Files
- `src-tauri/src/lib.rs` - Main Tauri commands and application setup
- `src-tauri/src/core/search.rs` - Search engine implementation
- `src-tauri/src/core/sites.rs` - Website data management
- `src-tauri/src/core/models.rs` - Data structures and type definitions

### Core Frontend Files
- `src/App.tsx` - Main application component with modal management and keyboard shortcuts
- `src/components/SearchForm.tsx` - Search input with type selection and history dropdown
- `src/components/ResultsDisplay.tsx` - Results rendering, filtering, and export controls
- `src/components/ExportButton.tsx` - Multi-format export with dropdown menu
- `src/components/DisclaimerModal.tsx` - First-launch legal disclaimer modal
- `src/components/ToastContainer.tsx` - Toast notification management
- `src/components/SearchHistory.tsx` - Search history dropdown with CRUD operations
- `src/hooks/useSearch.ts` - Comprehensive search state management and event handling
- `src/hooks/useSearchHistory.ts` - LocalStorage-based search history management
- `src/hooks/useToast.ts` - Toast notification system with auto-dismiss
- `src/services/tauriApi.ts` - Singleton-based Tauri API wrapper with error handling

### Configuration Files
- `src-tauri/tauri.conf.json` - Tauri application configuration
- `package.json` - Frontend dependencies and scripts
- `src-tauri/Cargo.toml` - Rust dependencies and metadata