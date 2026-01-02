# VS Code Extension Integration Steps

This guide shows how to integrate the VS Code extension with your existing LibreChat Meta Agent orchestrator.

## Part 1: Backend Integration (Orchestrator)

### Step 1: Import IDE Router

Edit your main orchestrator server file (e.g., `orchestrator/src/index.ts` or `server.ts`):

```typescript
import express from 'express';
import ideRouter, { initializeIdeRouter } from './api/ide';
import { MetaOrchestrator } from './orchestrator/MetaOrchestrator';

const app = express();
const orchestrator = new MetaOrchestrator();

// ... existing middleware and routes ...

// Add IDE API routes
app.use('/api/ide', initializeIdeRouter(orchestrator));

// ... rest of server setup ...
```

### Step 2: Verify Orchestrator Methods

Ensure your `MetaOrchestrator` class has these methods:

```typescript
class MetaOrchestrator {
    // Regular chat
    async handleChat(
        message: string,
        conversationId?: string
    ): Promise<{
        content: string;
        conversationId?: string;
        thinking?: string;
        sources?: any[];
    }> {
        // Your implementation
    }

    // Extended thinking mode
    async handleExtendedThinking(
        message: string,
        conversationId?: string
    ): Promise<{
        content: string;
        conversationId?: string;
        thinking: string;
    }> {
        // Your implementation
    }

    // Deep research mode
    async handleDeepResearch(
        message: string,
        conversationId?: string
    ): Promise<{
        content: string;
        conversationId?: string;
        sources: any[];
    }> {
        // Your implementation
    }
}
```

### Step 3: Enable CORS (if needed)

If running extension and server on different ports:

```typescript
import cors from 'cors';

app.use(cors({
    origin: 'vscode-webview://*',
    credentials: true
}));
```

### Step 4: Test Backend

Start your orchestrator server:

```bash
cd orchestrator
npm run dev
```

Test the IDE endpoint:

```bash
curl -X POST http://localhost:3001/api/ide/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from IDE"}'
```

## Part 2: Extension Installation

### Step 1: Install Dependencies

```bash
cd vscode-extension
npm install
```

### Step 2: Build Extension

```bash
npm run compile
```

### Step 3: Package Extension

```bash
npm run package
```

This creates: `librechat-meta-agent-1.0.0.vsix`

### Step 4: Install in VS Code

**Option A: Command Line**
```bash
code --install-extension librechat-meta-agent-1.0.0.vsix
```

**Option B: VS Code UI**
1. Open VS Code
2. Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
3. Type: "Extensions: Install from VSIX"
4. Select the `.vsix` file
5. Reload VS Code when prompted

## Part 3: Configuration

### Step 1: Open Settings

1. Open VS Code
2. Press `Ctrl+,` (Mac: `Cmd+,`)
3. Search for "LibreChat"

### Step 2: Configure Server

Set these values:

- **LibreChat: Server URL**
  - Value: `http://localhost:3001`
  - (Change if your orchestrator runs on different port)

- **LibreChat: API Key** (optional)
  - Only if your server requires authentication
  - Leave empty for local development

- **LibreChat: Default Model**
  - Value: `claude-3-5-sonnet`
  - Or your preferred model

- **LibreChat: Auto Suggest**
  - Value: `true` (enable autocomplete)
  - Set to `false` if you find it intrusive

### Step 3: Verify Installation

1. Press `Ctrl+Shift+P`
2. Type "LibreChat"
3. You should see 10 commands:
   - LibreChat: Open Chat
   - LibreChat: Explain Selected Code
   - LibreChat: Refactor Selected Code
   - LibreChat: Generate Tests
   - LibreChat: Fix Bug
   - LibreChat: Add Comments
   - LibreChat: Generate Code from Description
   - LibreChat: Review Code
   - LibreChat: Extended Thinking
   - LibreChat: Deep Research

## Part 4: First Test

### Test 1: Open Chat

1. Press `Ctrl+Shift+L` (Mac: `Cmd+Shift+L`)
2. Chat panel opens in sidebar
3. Type: "Hello, are you working?"
4. Press Enter or click Send
5. You should get a response

### Test 2: Explain Code

1. Open a code file (any language)
2. Select a few lines of code
3. Right-click → "LibreChat: Explain Selected Code"
4. Explanation appears in chat panel

### Test 3: Generate Tests

1. Select a function in your code
2. Right-click → "LibreChat: Generate Tests"
3. Choose test framework (or Auto-detect)
4. Tests are generated and can be saved to file

## Part 5: Troubleshooting

### Extension Not Loading

**Symptoms:** Commands don't appear, icon missing

**Solution:**
```bash
# Check extension is installed
code --list-extensions | grep librechat

# Reinstall if needed
code --uninstall-extension librechat-meta-agent
code --install-extension librechat-meta-agent-1.0.0.vsix

# Reload VS Code
Ctrl+Shift+P → "Developer: Reload Window"
```

### Connection Errors

**Symptoms:** "Failed to connect" errors

**Solution:**
1. Check orchestrator is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. Verify URL in settings matches orchestrator port

3. Check for CORS errors in orchestrator logs

4. View extension logs:
   - View → Output
   - Select "LibreChat" from dropdown

### No Responses

**Symptoms:** Messages sent but no response

**Solution:**
1. Check orchestrator logs for errors
2. Verify `handleChat` method is implemented
3. Test API directly:
   ```bash
   curl -X POST http://localhost:3001/api/ide/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"test"}'
   ```
4. Check API key if required

### Autocomplete Not Working

**Symptoms:** No suggestions while typing

**Solution:**
1. Check setting: LibreChat: Auto Suggest = true
2. Trigger manually: `Ctrl+Space`
3. Only works in supported file types
4. Disable if causing performance issues

### Webview Not Rendering

**Symptoms:** Blank chat panel

**Solution:**
1. Check webview developer tools:
   - `Ctrl+Shift+P`
   - "Developer: Open Webview Developer Tools"
2. Look for JavaScript errors
3. Reinstall extension

## Part 6: Verify All Features

### Checklist

Run through each feature to ensure working:

- [ ] **Chat Panel**
  - Opens with `Ctrl+Shift+L`
  - Messages send and receive
  - Code blocks render correctly
  - Copy/insert buttons work

- [ ] **Explain Code**
  - Select code, right-click works
  - Explanation is relevant
  - Shows in chat panel

- [ ] **Refactor Code**
  - Suggestions are valid
  - Can apply changes
  - Preserves functionality

- [ ] **Generate Tests**
  - Tests are generated
  - Can save to file
  - Tests are runnable

- [ ] **Fix Bug**
  - Prompts for bug description
  - Provides valid fix
  - Can apply fix

- [ ] **Add Comments**
  - Generates proper doc comments
  - Follows language conventions
  - Can apply comments

- [ ] **Generate Code**
  - Creates code from description
  - Code is syntactically valid
  - Can insert at cursor

- [ ] **Review Code**
  - Identifies issues
  - Creates diagnostics
  - Provides actionable feedback

- [ ] **Extended Thinking**
  - Shows thinking process
  - Provides deeper analysis
  - Thinking is expandable

- [ ] **Deep Research**
  - Provides comprehensive info
  - Includes sources
  - Sources are clickable

- [ ] **Autocomplete**
  - Triggers while typing
  - Suggestions are relevant
  - Can accept suggestions

- [ ] **Hover Information**
  - Hover shows explanation
  - Information is helpful
  - Not too intrusive

- [ ] **Code Actions**
  - Lightbulb appears
  - Quick fixes available
  - Actions work correctly

- [ ] **Diagnostics**
  - Warnings appear
  - Issues are valid
  - Can click to see details

## Part 7: Production Deployment

### For Internal Use

1. **Build optimized extension:**
   ```bash
   npm run vscode:prepublish
   npm run package
   ```

2. **Distribute VSIX to team:**
   - Share `.vsix` file
   - Team installs with: `code --install-extension file.vsix`

3. **Document server URL:**
   - Provide production orchestrator URL
   - Share API keys if needed

### For Public Release

1. **Create publisher account:**
   - Visit: https://marketplace.visualstudio.com/
   - Create publisher profile

2. **Update package.json:**
   ```json
   {
     "publisher": "your-publisher-name",
     "repository": {
       "type": "git",
       "url": "https://github.com/your-org/your-repo"
     }
   }
   ```

3. **Publish to marketplace:**
   ```bash
   npm install -g @vscode/vsce
   vsce login your-publisher-name
   vsce publish
   ```

4. **Update regularly:**
   ```bash
   # Patch version
   vsce publish patch

   # Minor version
   vsce publish minor

   # Major version
   vsce publish major
   ```

## Part 8: Monitoring & Maintenance

### Logs

**Extension Logs:**
- View → Output → Select "LibreChat"
- Shows API calls, errors, debug info

**Server Logs:**
- Check orchestrator console output
- Log all IDE API requests
- Monitor error rates

### Analytics (Optional)

Track usage:
- Number of commands used
- Most popular features
- Error rates
- Response times

### Updates

When updating:

1. **Update version in package.json:**
   ```json
   "version": "1.0.1"
   ```

2. **Update CHANGELOG.md:**
   ```markdown
   ## [1.0.1] - 2024-01-15
   ### Fixed
   - Bug in autocomplete
   ```

3. **Rebuild and republish:**
   ```bash
   npm run package
   vsce publish
   ```

## Support Resources

- **Documentation:** `/vscode-extension/README.md`
- **Development Guide:** `/vscode-extension/DEVELOPMENT.md`
- **Quick Start:** `/vscode-extension/QUICKSTART.md`
- **Summary:** `/VS_CODE_INTEGRATION_SUMMARY.md`

## Next Steps

1. ✅ Complete backend integration
2. ✅ Install and configure extension
3. ✅ Test all features
4. ✅ Deploy to team or publish
5. 🎯 Gather feedback and iterate
6. 🚀 Enhance based on usage patterns

---

**Congratulations!** Your LibreChat Meta Agent is now integrated with VS Code!
