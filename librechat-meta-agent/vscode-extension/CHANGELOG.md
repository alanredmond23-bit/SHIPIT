# Changelog

All notable changes to the LibreChat Meta Agent VS Code extension will be documented in this file.

## [1.0.0] - 2024-01-01

### Added
- Initial release of LibreChat Meta Agent VS Code extension
- Interactive chat panel with full context awareness
- Code explanation command
- Refactoring suggestions
- Unit test generation
- Bug fixing assistance
- Documentation generation (JSDoc/docstrings)
- Code generation from natural language descriptions
- Comprehensive code review with diagnostics
- Extended thinking mode for complex problems
- Deep research mode with source citations
- AI-powered code completions
- Hover provider for quick explanations
- Code action provider for quick fixes
- Real-time diagnostics for code quality
- Keyboard shortcuts (Ctrl+Shift+L for chat, Ctrl+Shift+E for explain)
- Context menu integration
- Configurable settings for server URL, API key, and model selection
- Support for multiple programming languages

### Features
- **Chat Interface**: Full-featured sidebar chat with markdown support
- **Context Awareness**: Automatically includes workspace, file, and selection context
- **Streaming Responses**: Real-time AI responses with thinking indicators
- **Code Actions**: Lightbulb quick fixes and refactoring suggestions
- **Smart Completions**: AI-powered autocomplete while typing
- **Inline Diagnostics**: Real-time code quality warnings and errors
- **Multi-Language Support**: Works with JavaScript, TypeScript, Python, Java, C++, Go, Rust, and more

### Technical
- Built with TypeScript
- Webpack bundling for optimized performance
- Axios for HTTP communication
- VS Code API 1.80.0+
- Debounced API calls for performance
- Caching for hover and completion providers
- Secure API key storage in VS Code settings
