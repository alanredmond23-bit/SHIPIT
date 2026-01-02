# Quick Start Guide

Get LibreChat Meta Agent running in VS Code in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ VS Code 1.80.0+ installed
- ✅ LibreChat orchestrator server running

## Step 1: Install Dependencies

```bash
cd vscode-extension
npm install
```

## Step 2: Build the Extension

```bash
npm run compile
```

## Step 3: Package the Extension

```bash
npm run package
```

This creates `librechat-meta-agent-1.0.0.vsix`

## Step 4: Install in VS Code

**Option A: Command Line**
```bash
code --install-extension librechat-meta-agent-1.0.0.vsix
```

**Option B: VS Code UI**
1. Open VS Code
2. Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
3. Type "Extensions: Install from VSIX"
4. Select the `.vsix` file

## Step 5: Configure

1. Open VS Code Settings (`Ctrl+,`)
2. Search for "LibreChat"
3. Set these values:
   - **Server URL**: `http://localhost:3001` (or your orchestrator URL)
   - **API Key**: (if your server requires authentication)
   - **Default Model**: `claude-3-5-sonnet` (or your preferred model)

## Step 6: Start Using!

### Open Chat Panel
Press `Ctrl+Shift+L` (Mac: `Cmd+Shift+L`)

### Try These Features

1. **Explain Code**
   - Select some code
   - Right-click → "LibreChat: Explain Selected Code"

2. **Generate Tests**
   - Select a function
   - Right-click → "LibreChat: Generate Tests"

3. **Refactor Code**
   - Select code
   - Right-click → "LibreChat: Refactor Selected Code"

4. **Ask Questions**
   - Open chat (`Ctrl+Shift+L`)
   - Ask anything: "How do I implement error handling in TypeScript?"

5. **Extended Thinking**
   - Press `Ctrl+Shift+P`
   - Run "LibreChat: Extended Thinking"
   - Ask a complex question

## Troubleshooting

### Extension Not Loading
```bash
# Reload VS Code window
Ctrl+Shift+P → "Developer: Reload Window"
```

### Can't Connect to Server
1. Check orchestrator is running: `curl http://localhost:3001/health`
2. Verify server URL in settings
3. Check Output panel: View → Output → Select "LibreChat"

### Commands Not Appearing
1. Restart VS Code
2. Check extension is enabled: Extensions panel → Search "LibreChat"
3. Reinstall extension if needed

### No AI Responses
1. Verify API key is correct (if required)
2. Check server logs for errors
3. Try a simple message first: "Hello"

## Development Mode (For Contributors)

Instead of packaging, run in development:

```bash
cd vscode-extension
npm install
npm run watch  # Starts in watch mode
```

Then in VS Code:
1. Open this folder
2. Press `F5`
3. A new window opens with extension loaded
4. Make changes, reload with `Ctrl+R`

## Next Steps

- 📖 Read [README.md](./README.md) for full features
- 👨‍💻 Read [DEVELOPMENT.md](./DEVELOPMENT.md) for development guide
- 🔧 Customize settings for your workflow
- 🎯 Try all 10 commands from the Command Palette

## Getting Help

- Check logs: View → Output → LibreChat
- Review documentation: [README.md](./README.md)
- Report issues: [GitHub Issues]

## Tips

1. **Keyboard Shortcuts**
   - `Ctrl+Shift+L`: Open chat
   - `Ctrl+Shift+E`: Explain code
   - `Ctrl+.`: Quick fixes (when available)

2. **Context Menu**
   - Right-click on selected code for quick actions

3. **Command Palette**
   - `Ctrl+Shift+P` → Type "LibreChat" to see all commands

4. **Chat Tips**
   - Ask specific questions with code snippets
   - Use extended thinking for complex problems
   - Request specific formats (JSON, markdown, etc.)

5. **Performance**
   - Disable auto-suggest if it feels slow
   - Use specific commands instead of chat for common tasks
   - Clear chat history occasionally

Enjoy coding with AI assistance! 🚀
