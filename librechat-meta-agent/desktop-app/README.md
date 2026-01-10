# Meta Agent Desktop

Native desktop application for the Meta Agent multi-LLM AI orchestration platform.

## Features

- Native macOS, Windows, and Linux support
- System tray integration
- Keyboard shortcuts for navigation
- Dark/light theme support
- Offline capability (when using local models)
- Native file dialogs with document type filtering
- Desktop notifications
- Auto-setup detection and guided installation

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- The UI dependencies installed (`npm install` in ui-extensions)

### Running in Development

1. Install dependencies in both directories:
   ```bash
   # Install UI dependencies
   cd ../ui-extensions && npm install

   # Install desktop dependencies
   cd ../desktop-app && npm install
   ```

2. Run in development mode (starts both Next.js dev server and Electron):
   ```bash
   npm run dev
   ```

Or run manually:
```bash
# Terminal 1: Start UI server
cd ../ui-extensions && npm run dev

# Terminal 2: Start Electron (after UI is running)
cd ../desktop-app && npm start
```

## Building for Production

### Generate Icons (First Time Only)

```bash
npm run generate-icons
```

This creates:
- `resources/icon.png` - 512x512 PNG for Linux
- `resources/icon.icns` - macOS icon bundle
- `resources/icon.ico` - Windows icon

### Build for macOS

```bash
npm run build:mac
```

Outputs:
- `dist/Meta Agent-1.0.0-mac-arm64.dmg` (Apple Silicon)
- `dist/Meta Agent-1.0.0-mac-x64.dmg` (Intel)
- `dist/Meta Agent-1.0.0-mac-arm64.zip`
- `dist/Meta Agent-1.0.0-mac-x64.zip`

### Build for Windows

```bash
npm run build:win
```

Outputs:
- `dist/Meta Agent Setup 1.0.0.exe` (NSIS installer)
- `dist/Meta Agent 1.0.0.exe` (Portable)

### Build for Linux

```bash
npm run build:linux
```

Outputs:
- `dist/Meta Agent-1.0.0.AppImage`
- `dist/meta-agent-desktop_1.0.0_amd64.deb`
- `dist/meta-agent-desktop-1.0.0.x86_64.rpm`

### Build All Platforms

```bash
npm run build
```

### Create Unpacked Build (for testing)

```bash
npm run pack
```

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
| Cmd/Ctrl + R | Reload |
| Cmd/Ctrl + Shift + R | Force Reload |

## Electron API

The app exposes an `electronAPI` object to the renderer process via the preload script:

### Window Controls
```javascript
window.electronAPI.minimize();
window.electronAPI.maximize();
window.electronAPI.close();
window.electronAPI.isMaximized(); // Returns Promise<boolean>
```

### File Dialogs
```javascript
// Open file dialog
const result = await window.electronAPI.showOpenDialog({
  title: 'Select Documents',
  filterType: 'documents', // 'documents' | 'images' | 'code' | 'all'
  multiSelections: true
});
// result: { canceled: boolean, files: Array<{path, name, size, extension}> }

// Save file dialog
const result = await window.electronAPI.showSaveDialog({
  title: 'Save As',
  defaultName: 'document.pdf',
  filterType: 'documents'
});
// result: { canceled: boolean, filePath: string | null }

// Directory picker
const result = await window.electronAPI.showDirectoryDialog({
  title: 'Select Folder'
});
// result: { canceled: boolean, path: string | null }

// Read file content
const file = await window.electronAPI.readFile('/path/to/file.txt');
// file: { name, path, size, content, encoding, mimeType } | { error: string }

// Write file content
await window.electronAPI.writeFile({
  filePath: '/path/to/file.txt',
  content: 'Hello World',
  encoding: 'utf8' // 'utf8' | 'base64'
});
```

### Settings
```javascript
await window.electronAPI.setSetting('theme', 'dark');
const theme = await window.electronAPI.getSetting('theme');
```

### Utilities
```javascript
// Get app info
const info = await window.electronAPI.getAppInfo();
// { name, version, platform, arch, electron, node, chrome }

// Open URL in default browser
await window.electronAPI.openExternal('https://example.com');

// Show file in Finder/Explorer
await window.electronAPI.showInFolder('/path/to/file.txt');

// Show notification
window.electronAPI.showNotification('Title', 'Body');

// Check platform
if (window.electronAPI.platform === 'darwin') {
  // macOS specific code
}
```

## Configuration

Settings are stored using electron-store at:
- macOS: `~/Library/Application Support/meta-agent-desktop/config.json`
- Windows: `%APPDATA%/meta-agent-desktop/config.json`
- Linux: `~/.config/meta-agent-desktop/config.json`

## Project Structure

```
desktop-app/
├── main.js              # Main Electron process
├── preload.js           # Context bridge for renderer
├── package.json         # Dependencies and build config
├── build/
│   └── entitlements.mac.plist  # macOS code signing entitlements
├── resources/
│   ├── icon.png         # Linux icon (512x512)
│   ├── icon.icns        # macOS icon bundle
│   ├── icon.ico         # Windows icon
│   ├── icon.svg         # Source SVG
│   └── dmg-background.png  # macOS DMG installer background
├── scripts/
│   ├── generate-icons.js      # Icon generation script
│   ├── generate-dmg-background.js  # DMG background generator
│   └── copy-renderer.js       # Copies Next.js build to renderer/
├── renderer/            # Built Next.js app (generated)
└── dist/                # Build output (generated)
```

## Troubleshooting

### "Setup Required" Dialog

If you see this dialog, the app detected missing dependencies:
1. Run `npm install` in both `ui-extensions/` and `desktop-app/`
2. Create a `.env` file in the project root (copy from `.env.example`)
3. Fill in your Supabase credentials in the `.env` file

### Build Fails

1. Clean previous builds: `npm run clean`
2. Regenerate icons: `npm run generate-icons`
3. Rebuild: `npm run build:mac` (or other platform)

### App Won't Start

1. Check if port 3000 is available (for dev mode)
2. Verify Node.js 18+ is installed
3. Try reinstalling dependencies: `rm -rf node_modules && npm install`
