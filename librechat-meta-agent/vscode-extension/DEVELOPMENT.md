# Development Guide

This guide explains how to set up the development environment and work on the LibreChat Meta Agent VS Code extension.

## Prerequisites

- Node.js 18+ and npm
- VS Code 1.80.0 or higher
- TypeScript knowledge
- LibreChat orchestrator server running

## Setup

### 1. Install Dependencies

```bash
cd vscode-extension
npm install
```

### 2. Configure Development Server

Create a `.vscode/launch.json` file (if not exists):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

### 3. Build the Extension

```bash
# One-time build
npm run compile

# Watch mode (rebuilds on file changes)
npm run watch
```

## Development Workflow

### Running the Extension

1. Open this folder in VS Code
2. Press `F5` or click "Run > Start Debugging"
3. A new VS Code window opens with the extension loaded
4. Make changes to the code
5. Reload the extension window (`Ctrl+R` or `Cmd+R`) to see changes

### Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── api/
│   │   └── client.ts             # API client for orchestrator
│   ├── chat/
│   │   └── ChatViewProvider.ts   # Chat webview provider
│   ├── commands/                 # Command implementations
│   │   ├── explain.ts
│   │   ├── refactor.ts
│   │   ├── tests.ts
│   │   ├── fix.ts
│   │   ├── comments.ts
│   │   ├── generate.ts
│   │   └── review.ts
│   ├── providers/                # VS Code language providers
│   │   ├── CodeActionProvider.ts
│   │   ├── CompletionProvider.ts
│   │   ├── HoverProvider.ts
│   │   └── DiagnosticsProvider.ts
│   └── webview/
│       └── chat.html             # Chat UI
├── media/
│   └── icon.svg                  # Extension icon
├── out/                          # Compiled output (generated)
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript config
└── webpack.config.js             # Build config
```

## Making Changes

### Adding a New Command

1. **Register in `package.json`**:
```json
{
  "contributes": {
    "commands": [
      {
        "command": "librechat.myNewCommand",
        "title": "LibreChat: My New Command"
      }
    ]
  }
}
```

2. **Create command file** (`src/commands/mycommand.ts`):
```typescript
import * as vscode from 'vscode';
import { ApiClient } from '../api/client';
import { ChatViewProvider } from '../chat/ChatViewProvider';

export async function myNewCommand(
    apiClient: ApiClient,
    chatViewProvider: ChatViewProvider
) {
    // Implementation
}
```

3. **Register in `extension.ts`**:
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('librechat.myNewCommand', async () => {
        await myNewCommand(apiClient, chatViewProvider);
    })
);
```

### Adding a New API Endpoint

1. **Add to API client** (`src/api/client.ts`):
```typescript
async myNewEndpoint(request: MyRequest): Promise<MyResponse> {
    const response = await this.client.post(
        `${this.serverUrl}/api/ide/my-endpoint`,
        request
    );
    return response.data;
}
```

2. **Add backend endpoint** (`orchestrator/src/api/ide.ts`):
```typescript
router.post('/my-endpoint', async (req, res) => {
    // Implementation
});
```

### Modifying the Chat UI

Edit `src/webview/chat.html` - it contains HTML, CSS, and JavaScript in a single file. The webview communicates with the extension via `postMessage`.

**From webview to extension:**
```javascript
vscode.postMessage({
    type: 'myAction',
    data: 'myData'
});
```

**From extension to webview** (in ChatViewProvider.ts):
```typescript
this._view.webview.postMessage({
    type: 'myAction',
    data: 'myData'
});
```

## Testing

### Manual Testing

1. Run the extension in development mode (`F5`)
2. Test each command:
   - `Ctrl+Shift+L` - Open chat
   - Select code, right-click, test context menu items
   - Test each command from Command Palette
3. Verify API communication with the orchestrator
4. Check Output panel for errors (View → Output → LibreChat)

### Testing Checklist

- [ ] Chat interface opens and responds
- [ ] Code explanation works with selection
- [ ] Refactoring provides valid suggestions
- [ ] Test generation creates runnable tests
- [ ] Bug fixing suggests correct fixes
- [ ] Documentation generation follows language conventions
- [ ] Code generation produces valid code
- [ ] Code review identifies issues
- [ ] Extended thinking shows reasoning
- [ ] Deep research provides sources
- [ ] Auto-complete triggers correctly
- [ ] Hover shows helpful information
- [ ] Code actions appear in context
- [ ] Diagnostics update in real-time
- [ ] Settings update correctly
- [ ] Error handling works gracefully

## Building for Production

### Create VSIX Package

```bash
# Install vsce if not already installed
npm install -g @vscode/vsce

# Package the extension
npm run package

# Output: librechat-meta-agent-1.0.0.vsix
```

### Install VSIX Locally

```bash
code --install-extension librechat-meta-agent-1.0.0.vsix
```

### Publish to Marketplace

1. Create a publisher account at https://marketplace.visualstudio.com/
2. Get a Personal Access Token from Azure DevOps
3. Login:
```bash
vsce login <publisher-name>
```
4. Publish:
```bash
vsce publish
```

## Debugging

### Extension Host Debugging

- Set breakpoints in TypeScript files
- Press `F5` to start debugging
- Breakpoints will hit in the extension development host

### Webview Debugging

1. Open extension development host
2. Press `Ctrl+Shift+P`
3. Run "Developer: Open Webview Developer Tools"
4. Inspect the chat webview like a web page

### Common Issues

**Extension not loading:**
- Check `out/` directory exists and contains compiled JS
- Run `npm run compile`
- Check Output panel for errors

**Commands not appearing:**
- Verify `package.json` contributions
- Restart extension host window

**API errors:**
- Verify orchestrator is running
- Check `librechat.serverUrl` setting
- Inspect network requests in debug logs

**Webview not rendering:**
- Check browser console in webview dev tools
- Verify HTML syntax in `chat.html`
- Check CSP (Content Security Policy) settings

## Code Style

- Use TypeScript strict mode
- Follow VS Code API conventions
- Use async/await for asynchronous operations
- Handle errors gracefully
- Add JSDoc comments for public APIs
- Use descriptive variable names

## Performance Best Practices

- Debounce API calls (completions, hover)
- Cache results when appropriate
- Dispose resources properly
- Avoid blocking the UI thread
- Use webpack for optimized bundles

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## License

See LICENSE file in the root directory.
