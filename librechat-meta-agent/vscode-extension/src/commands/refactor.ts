import * as vscode from 'vscode';
import { ApiClient } from '../api/client';
import { ChatViewProvider } from '../chat/ChatViewProvider';

export async function refactorCode(apiClient: ApiClient, chatViewProvider: ChatViewProvider) {
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
        vscode.window.showErrorMessage('No code to refactor');
        return;
    }

    // Ask for refactoring goal (optional)
    const goal = await vscode.window.showInputBox({
        prompt: 'What would you like to improve? (optional)',
        placeHolder: 'e.g., performance, readability, reduce complexity'
    });

    // Show chat view
    chatViewProvider.show();

    // Show progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'LibreChat: Refactoring code...',
            cancellable: false
        },
        async () => {
            try {
                const response = await apiClient.refactor({
                    code,
                    language: editor.document.languageId,
                    filePath: editor.document.fileName,
                    context: { goal }
                });

                // Send response to chat view with diff option
                let message = `Refactor this ${editor.document.languageId} code`;
                if (goal) {
                    message += ` to ${goal}`;
                }
                message += `:\n\n\`\`\`${editor.document.languageId}\n${code}\n\`\`\``;

                await chatViewProvider.sendMessage(message, { prefilledResponse: response });

                // Ask if user wants to apply changes
                if (response.content.includes('```')) {
                    const apply = await vscode.window.showInformationMessage(
                        'Apply refactoring?',
                        'Yes',
                        'No'
                    );

                    if (apply === 'Yes') {
                        // Extract code from markdown
                        const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)\n```/);
                        if (codeMatch) {
                            const refactoredCode = codeMatch[1];
                            await editor.edit(editBuilder => {
                                if (selection.isEmpty) {
                                    const fullRange = new vscode.Range(
                                        editor.document.positionAt(0),
                                        editor.document.positionAt(editor.document.getText().length)
                                    );
                                    editBuilder.replace(fullRange, refactoredCode);
                                } else {
                                    editBuilder.replace(selection, refactoredCode);
                                }
                            });
                            vscode.window.showInformationMessage('Code refactored successfully!');
                        }
                    }
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to refactor code: ${error.message}`);
            }
        }
    );
}
