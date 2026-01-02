#!/bin/bash
# Verify all files are present for LibreChat VS Code Extension

echo "Verifying LibreChat Meta Agent VS Code Extension Files..."
echo ""

ERRORS=0

check_file() {
    if [ -f "$1" ]; then
        echo "✓ $1"
    else
        echo "✗ MISSING: $1"
        ERRORS=$((ERRORS + 1))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "✓ $1/"
    else
        echo "✗ MISSING: $1/"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "=== Core Files ==="
check_file "package.json"
check_file "tsconfig.json"
check_file "webpack.config.js"
check_file ".eslintrc.json"
check_file "README.md"
check_file "LICENSE"
echo ""

echo "=== Source Code ==="
check_file "src/extension.ts"
check_file "src/api/client.ts"
check_file "src/chat/ChatViewProvider.ts"
echo ""

echo "=== Commands ==="
check_file "src/commands/explain.ts"
check_file "src/commands/refactor.ts"
check_file "src/commands/tests.ts"
check_file "src/commands/fix.ts"
check_file "src/commands/comments.ts"
check_file "src/commands/generate.ts"
check_file "src/commands/review.ts"
echo ""

echo "=== Providers ==="
check_file "src/providers/CodeActionProvider.ts"
check_file "src/providers/CompletionProvider.ts"
check_file "src/providers/HoverProvider.ts"
check_file "src/providers/DiagnosticsProvider.ts"
echo ""

echo "=== UI ==="
check_file "src/webview/chat.html"
check_file "media/icon.svg"
echo ""

echo "=== Configuration ==="
check_file ".vscode/launch.json"
check_file ".vscode/tasks.json"
check_file ".vscode/settings.json"
check_file ".vscode/extensions.json"
echo ""

echo "=== Documentation ==="
check_file "DEVELOPMENT.md"
check_file "QUICKSTART.md"
check_file "CHANGELOG.md"
check_file "BUILD_AND_INSTALL.sh"
echo ""

echo "=== Results ==="
if [ $ERRORS -eq 0 ]; then
    echo "✅ All files present! Extension is ready to build."
    echo ""
    echo "Next step: Run ./BUILD_AND_INSTALL.sh"
else
    echo "❌ $ERRORS file(s) missing. Please check the installation."
    exit 1
fi
