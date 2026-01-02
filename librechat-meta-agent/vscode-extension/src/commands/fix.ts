import * as vscode from 'vscode';
import { ApiClient } from '../api/client';
import { ChatViewProvider } from '../chat/ChatViewProvider';

export async function fixBug(apiClient: ApiClient, chatViewProvider: ChatViewProvider) {
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
        vscode.window.showErrorMessage('No code to fix');
        return;
    }

    // Ask for bug description
    const bugDescription = await vscode.window.showInputBox({
        prompt: 'Describe the bug or issue',
        placeHolder: 'e.g., function returns wrong value, null pointer exception'
    });

    if (!bugDescription) {
        return;
    }

    // Show chat view
    chatViewProvider.show();

    // Show progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'LibreChat: Fixing bug...',
            cancellable: false
        },
        async () => {
            try {
                const response = await apiClient.fixBug({
                    code,
                    language: editor.document.languageId,
                    filePath: editor.document.fileName,
                    bugDescription
                });

                // Send response to chat view
                const message = `Fix this bug in ${editor.document.languageId} code:\n\n**Issue:** ${bugDescription}\n\n\`\`\`${editor.document.languageId}\n${code}\n\`\`\``;

                await chatViewProvider.sendMessage(message, { prefilledResponse: response });

                // Ask if user wants to apply fix
                if (response.content.includes('```')) {
                    const apply = await vscode.window.showInformationMessage(
                        'Apply bug fix?',
                        'Yes',
                        'No'
                    );

                    if (apply === 'Yes') {
                        // Extract code from markdown
                        const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)\n```/);
                        if (codeMatch) {
                            const fixedCode = codeMatch[1];
                            await editor.edit(editBuilder => {
                                if (selection.isEmpty) {
                                    const fullRange = new vscode.Range(
                                        editor.document.positionAt(0),
                                        editor.document.positionAt(editor.document.getText().length)
                                    );
                                    editBuilder.replace(fullRange, fixedCode);
                                } else {
                                    editBuilder.replace(selection, fixedCode);
                                }
                            });
                            vscode.window.showInformationMessage('Bug fix applied successfully!');
                        }
                    }
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to fix bug: ${error.message}`);
            }
        }
    );
}
