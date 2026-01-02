#!/bin/bash
# Build and Install LibreChat Meta Agent VS Code Extension

set -e

echo "========================================"
echo "LibreChat Meta Agent - VS Code Extension"
echo "Build and Install Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Failed to compile TypeScript"
    exit 1
fi

echo "✅ TypeScript compiled"
echo ""

# Package extension
echo "📦 Packaging extension..."
npm run package

if [ $? -ne 0 ]; then
    echo "❌ Failed to package extension"
    exit 1
fi

echo "✅ Extension packaged"
echo ""

# Find the VSIX file
VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -1)

if [ -z "$VSIX_FILE" ]; then
    echo "❌ Error: No .vsix file found"
    exit 1
fi

echo "📦 VSIX file created: $VSIX_FILE"
echo ""

# Install extension
echo "🚀 Installing extension in VS Code..."

if ! command -v code &> /dev/null; then
    echo "⚠️  Warning: 'code' command not found"
    echo "Please install the extension manually:"
    echo "  1. Open VS Code"
    echo "  2. Press Ctrl+Shift+P"
    echo "  3. Type 'Extensions: Install from VSIX'"
    echo "  4. Select: $VSIX_FILE"
    exit 0
fi

code --install-extension "$VSIX_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to install extension"
    echo "Please install manually using the .vsix file"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ SUCCESS!"
echo "========================================"
echo ""
echo "Extension installed successfully!"
echo ""
echo "Next Steps:"
echo "1. Restart VS Code (or reload window with Ctrl+Shift+P → 'Developer: Reload Window')"
echo "2. Configure settings:"
echo "   - Open Settings (Ctrl+,)"
echo "   - Search for 'LibreChat'"
echo "   - Set 'Server URL' to your orchestrator (default: http://localhost:3001)"
echo "   - Set 'API Key' if required"
echo ""
echo "3. Start using:"
echo "   - Press Ctrl+Shift+L to open chat"
echo "   - Select code and right-click for actions"
echo "   - Use Command Palette (Ctrl+Shift+P) for all commands"
echo ""
echo "For more help, see:"
echo "  - README.md (user guide)"
echo "  - QUICKSTART.md (quick start)"
echo "  - DEVELOPMENT.md (developer guide)"
echo ""
echo "Enjoy coding with AI assistance! 🚀"
echo ""
