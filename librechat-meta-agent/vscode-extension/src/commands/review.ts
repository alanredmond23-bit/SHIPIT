import * as vscode from 'vscode';
import { ApiClient } from '../api/client';
import { ChatViewProvider } from '../chat/ChatViewProvider';

export async function reviewCode(apiClient: ApiClient, chatViewProvider: ChatViewProvider) {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const selection = editor.selection;
    const code = selection.isEmpty
        ? editor.document.getText()
        : editor.document.getText(selection);

    if (!code.trim()) {
        vscode.window.showErrorMessage('No code to review');
        return;
    }

    // Ask for review focus areas (optional)
    const focusAreas = await vscode.window.showQuickPick(
        [
            'General review',
            'Security vulnerabilities',
            'Performance optimization',
            'Code quality & best practices',
            'Bug detection',
            'Architecture & design patterns'
        ],
        {
            placeHolder: 'What should the review focus on?',
            canPickMany: true
        }
    );

    // Show chat view
    chatViewProvider.show();

    // Show progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'LibreChat: Reviewing code...',
            cancellable: false
        },
        async () => {
            try {
                const response = await apiClient.review({
                    code,
                    language: editor.document.languageId,
                    filePath: editor.document.fileName,
                    context: { focusAreas }
                });

                // Send response to chat view
                let message = `Review this ${editor.document.languageId} code`;
                if (focusAreas && focusAreas.length > 0) {
                    message += ` focusing on: ${focusAreas.join(', ')}`;
                }
                message += `:\n\n\`\`\`${editor.document.languageId}\n${code}\n\`\`\``;

                await chatViewProvider.sendMessage(message, { prefilledResponse: response });

                // Create diagnostics for issues found
                const diagnostics: vscode.Diagnostic[] = [];

                // Parse response for code issues (this is a simple implementation)
                // In a real implementation, you'd want more sophisticated parsing
                const lines = response.content.split('\n');
                for (const line of lines) {
                    // Look for patterns like "Line 10: ..." or "Line 10-15: ..."
                    const match = line.match(/Line (\d+)(?:-(\d+))?:\s*(.+)/i);
                    if (match) {
                        const startLine = parseInt(match[1]) - 1;
                        const endLine = match[2] ? parseInt(match[2]) - 1 : startLine;
                        const message = match[3];

                        const diagnostic = new vscode.Diagnostic(
                            new vscode.Range(startLine, 0, endLine, 999),
                            message,
                            vscode.DiagnosticSeverity.Warning
                        );
                        diagnostic.source = 'LibreChat Review';
                        diagnostics.push(diagnostic);
                    }
                }

                // Apply diagnostics
                if (diagnostics.length > 0) {
                    const diagnosticCollection = vscode.languages.createDiagnosticCollection('librechat');
                    diagnosticCollection.set(editor.document.uri, diagnostics);
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to review code: ${error.message}`);
            }
        }
    );
}
