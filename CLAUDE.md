# CLAUDE.md - Development Guide for `search-my-name`

This file provides guidance for developing the `search-my-name` application.

## 🚀 Project Mission

`search-my-name` is a cross-platform desktop application for discovering public profiles across hundreds of websites based on a username. It is built using Tauri (Rust + React) and is inspired by the capabilities of OSINT tools like `blackbird`. The primary goal is to provide a user-friendly graphical interface for a powerful search function, intended for educational and ethical self-research purposes.

-----

## 🏗️ Architecture & Core Decisions

This project uses a **Rust Rewrite** approach. We will **not** be using a Python sidecar. The core username searching logic will be implemented directly in Rust for maximum performance, a smaller application bundle, and greater stability.

  * **Frontend**: React 19 with TypeScript, built with Vite.
  * **Backend**: Rust with the Tauri framework. The core logic will be asynchronous to handle long-running network requests without freezing the UI.
  * **Key Rust Crates**: We will likely use `reqwest` for making HTTP requests, `tokio` for the async runtime, and `serde` for JSON serialization/deserialization.
  * **Communication**: The frontend will communicate with the backend via Tauri's event system and `invoke` calls. For the long-running search process, the backend will emit events to the frontend with real-time results.

### Key Structure

  * `src/`: Contains all React frontend code (components, hooks, API calls, UI).
  * `src-tauri/`: Contains all Rust backend code.
      * `src-tauri/src/main.rs`: Application entry point.
      * `src-tauri/src/lib.rs`: Main Tauri application setup, command handlers, and window management.
      * `src-tauri/src/core/`: **(New Directory)** This module will contain the core OSINT logic, such as the `search_runner.rs` file responsible for checking usernames against different sites.

-----

## 🎯 MVP Features & UI Flow

The Minimum Viable Product (MVP) will focus on the following features:

1.  **First-Launch Disclaimer**: On the very first run, the app will display a modal window with a usage policy and disclaimer. The user must accept it before they can use the app.
2.  **Username/Email Input**: A single, clear input field for the target username or email.
3.  **Asynchronous Search**: The search process runs in the background. The UI will show a "searching..." state and a progress indicator.
4.  **Real-Time Results**: Results will populate the UI as they are discovered.
5.  **Categorized Display**: Results will be grouped into "Found," "Not Found," and "Error" categories.
6.  **Clickable Links**: "Found" results will be direct links to the user's profile page.

-----

## 🔌 Tauri API (Backend \<-\> Frontend)

The following commands and events will define the API between Rust and React.

### Tauri Commands (Invoked from Frontend)

These will be defined in `src-tauri/src/lib.rs`.

```rust
// Checks if this is the first time the application is being run.
#[tauri::command]
fn is_first_launch() -> bool {
  // Logic to check for a flag file, e.g., in the app's data directory.
}

// Marks that the user has accepted the disclaimer.
#[tauri::command]
fn set_disclaimer_accepted() {
  // Logic to create the flag file.
}

// Starts the search process. This is a non-blocking command.
// It will trigger the backend to start emitting events with results.
#[tauri::command]
async fn start_search(app_handle: tauri::AppHandle, username: String) {
  // Spawns a new Tokio task to run the search logic from `core::search_runner`.
  // The task will use `app_handle.emit_all()` to send results.
}
```

### Tauri Events (Emitted from Backend)

The frontend will listen for these events to update the UI.

  * `search-update`: Sent every time a site check is completed.
      * **Payload**: `{ site: "GitHub", status: "Found", url: "https://github.com/username" }`
      * **Payload**: `{ site: "Twitter", status: "NotFound", url: null }`
  * `search-finished`: Sent once all sites have been checked.
      * **Payload**: `{ total_sites: 500, found_count: 15 }`

-----

## 💻 Development Commands

### Prerequisites

  * Node.js and npm (or pnpm/yarn)
  * Rust and Cargo
  * Tauri CLI (`cargo install tauri-cli`)

### Frontend Development

```bash
# Start development server (Vite on port 1420)
npm run dev
```

### Full App Development (Recommended)

This command runs both the frontend and backend with hot-reloading.

```bash
# Start Tauri in development mode
npm run tauri dev
```

### Building the Application

```bash
# Build the complete, distributable application
npm run tauri build
```