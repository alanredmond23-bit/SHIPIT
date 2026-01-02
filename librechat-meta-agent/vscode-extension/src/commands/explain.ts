import * as vscode from 'vscode';
import { ApiClient } from '../api/client';
import { ChatViewProvider } from '../chat/ChatViewProvider';

export async function explainCode(apiClient: ApiClient, chatViewProvider: ChatViewProvider) {
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
        vscode.window.showErrorMessage('No code to explain');
        return;
    }

    // Show chat view
    chatViewProvider.show();

    // Show progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'LibreChat: Explaining code...',
            cancellable: false
        },
        async () => {
            try {
                const response = await apiClient.explain({
                    code,
                    language: editor.document.languageId,
                    filePath: editor.document.fileName
                });

                // Send response to chat view
                await chatViewProvider.sendMessage(
                    `Explain this ${editor.document.languageId} code:\n\n\`\`\`${editor.document.languageId}\n${code}\n\`\`\``,
                    { prefilledResponse: response }
                );
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to explain code: ${error.message}`);
            }
        }
    );
}
