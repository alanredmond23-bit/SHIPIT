# LibreChat Meta Agent - VS Code Extension

AI-powered coding assistant with extended thinking, deep research, and intelligent code analysis capabilities.

## Features

### Chat Interface
- **Interactive Chat Panel**: Full-featured chat interface in the VS Code sidebar
- **Context-Aware**: Automatically includes workspace and file context
- **Extended Thinking Mode**: Deep reasoning for complex problems
- **Deep Research Mode**: Comprehensive research with source citations

### Code Actions
- **Explain Code**: Get detailed explanations of selected code
- **Refactor Code**: AI-powered refactoring suggestions
- **Generate Tests**: Automatically create unit tests
- **Fix Bugs**: Intelligent bug detection and fixes
- **Add Documentation**: Generate JSDoc/docstring comments
- **Code Review**: Comprehensive code quality analysis

### Intelligent Providers
- **Auto-Complete**: AI-powered code completions
- **Hover Information**: Contextual explanations on hover
- **Quick Fixes**: Smart code action suggestions
- **Diagnostics**: Real-time code quality analysis

## Installation

### From VSIX (Local Install)
1. Download the `.vsix` file
2. In VS Code, open the Command Palette (`Ctrl+Shift+P`)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded `.vsix` file

### From Source
```bash
cd vscode-extension
npm install
npm run compile
npm run package
```

## Setup

1. **Configure Server URL**:
   - Open VS Code Settings (`Ctrl+,`)
   - Search for "LibreChat"
   - Set `librechat.serverUrl` to your orchestrator server URL (default: `http://localhost:3001`)

2. **Set API Key** (if required):
   - Set `librechat.apiKey` in settings

3. **Start Using**:
   - Press `Ctrl+Shift+L` to open the chat
   - Select code and right-click to access LibreChat actions

## Usage

### Keyboard Shortcuts
- `Ctrl+Shift+L` (Mac: `Cmd+Shift+L`) - Open chat panel
- `Ctrl+Shift+E` (Mac: `Cmd+Shift+E`) - Explain selected code

### Commands
All commands are available via the Command Palette (`Ctrl+Shift+P`):

- **LibreChat: Open Chat** - Open the chat panel
- **LibreChat: Explain Selected Code** - Explain the selected code
- **LibreChat: Refactor Selected Code** - Get refactoring suggestions
- **LibreChat: Generate Tests** - Create unit tests for selected code
- **LibreChat: Fix Bug** - Fix bugs in selected code
- **LibreChat: Add Comments** - Add documentation comments
- **LibreChat: Generate Code from Description** - Generate new code
- **LibreChat: Review Code** - Comprehensive code review
- **LibreChat: Extended Thinking** - Deep reasoning mode
- **LibreChat: Deep Research** - Research with citations

### Context Menu
Right-click on selected code to access:
- Explain with LibreChat
- Refactor with LibreChat
- Generate tests with LibreChat

### Code Actions
Click the lightbulb icon or press `Ctrl+.` when you see a suggestion to access quick fixes and refactoring options.

## Configuration

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `librechat.serverUrl` | LibreChat orchestrator server URL | `http://localhost:3001` |
| `librechat.apiKey` | API key for authentication | - |
| `librechat.defaultModel` | Default AI model to use | `claude-3-5-sonnet` |
| `librechat.autoSuggest` | Enable auto-suggestions while typing | `true` |

## Features in Detail

### Extended Thinking
For complex problems that require deep reasoning:
1. Run command: **LibreChat: Extended Thinking**
2. Enter your question
3. The AI will engage in extended reasoning before responding

### Deep Research
For comprehensive research on topics:
1. Run command: **LibreChat: Deep Research**
2. Enter your research query
3. Get detailed answers with source citations

### Code Generation
1. Run command: **LibreChat: Generate Code from Description**
2. Describe what you want to build
3. Choose to insert at cursor or copy to clipboard

### Auto-Complete
As you type, LibreChat will suggest completions:
- Trigger with `Ctrl+Space` or automatically after newline
- Select from intelligent suggestions based on context

### Code Review
1. Select code (or leave empty for full file review)
2. Run command: **LibreChat: Review Code**
3. Optionally choose focus areas (security, performance, etc.)
4. View inline diagnostics and detailed review in chat

## Requirements

- VS Code version 1.80.0 or higher
- LibreChat Meta Agent orchestrator running (see main README)
- Internet connection (for API calls)

## Troubleshooting

### Extension not connecting
- Check that the orchestrator server is running
- Verify the `librechat.serverUrl` setting is correct
- Check the Output panel (View → Output → LibreChat) for errors

### No AI suggestions appearing
- Ensure `librechat.autoSuggest` is enabled
- Check that your file type is supported
- Try triggering manually with `Ctrl+Space`

### API errors
- Verify your API key is set correctly (if required)
- Check server logs for errors
- Ensure you have network connectivity

## Development

### Building from Source
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Package extension
npm run package
```

### Running in Development
1. Open this folder in VS Code
2. Press `F5` to open a new VS Code window with the extension loaded
3. Make changes and reload the window (`Ctrl+R`) to test

## Privacy & Security

- All code analysis is performed by your self-hosted orchestrator
- No code is sent to third parties unless configured
- API keys are stored securely in VS Code settings
- Enable/disable features in settings as needed

## Support

For issues, questions, or contributions:
- GitHub Issues: [Link to repo]
- Documentation: [Link to docs]

## License

[Your License Here]

## Changelog

### 1.0.0
- Initial release
- Chat interface with context awareness
- Code explanation and refactoring
- Test generation
- Bug fixing
- Documentation generation
- Code review with diagnostics
- Extended thinking and research modes
- Auto-complete and hover providers
