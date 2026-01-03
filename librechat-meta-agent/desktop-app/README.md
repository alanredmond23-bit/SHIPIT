# Meta Agent Desktop

Native desktop application for the Meta Agent multi-LLM AI orchestration platform.

## Features

- Native macOS, Windows, and Linux support
- System tray integration
- Keyboard shortcuts for navigation
- Dark/light theme support
- Offline capability (when using local models)
- Native file dialogs
- Desktop notifications

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- The UI server running on port 3000
- The API server running on port 3100

### Running in Development

1. Start the UI and API servers first:
   ```bash
   # Terminal 1: Start API server
   cd ../orchestrator && ./start-chat.sh

   # Terminal 2: Start UI server
   cd ../ui-extensions && npm run dev
   ```

2. Install dependencies and run Electron:
   ```bash
   cd desktop-app
   npm install
   npm start
   ```

Or use the combined dev command:
```bash
npm run dev
```

## Building

### macOS
```bash
npm run build:mac
```

### Windows
```bash
npm run build:win
```

### Linux
```bash
npm run build:linux
```

Build outputs will be in the `dist` folder.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + N | New Chat |
| Cmd/Ctrl + 1 | Navigate to Chat |
| Cmd/Ctrl + 2 | Navigate to Research |
| Cmd/Ctrl + 3 | Navigate to Thinking |
| Cmd/Ctrl + 4 | Navigate to Voice |
| Cmd/Ctrl + 5 | Navigate to Computer Use |
| Cmd/Ctrl + , | Open Settings |

## App Icons

Place app icons in the `resources` folder:
- `icon.icns` - macOS (1024x1024)
- `icon.ico` - Windows (256x256)
- `icon.png` - Linux (512x512)

## Configuration

Settings are stored using electron-store at:
- macOS: `~/Library/Application Support/meta-agent-desktop/config.json`
- Windows: `%APPDATA%/meta-agent-desktop/config.json`
- Linux: `~/.config/meta-agent-desktop/config.json`
