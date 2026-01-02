import * as vscode from 'vscode';
import { ApiClient } from '../api/client';
import { ChatViewProvider } from '../chat/ChatViewProvider';

export async function addComments(apiClient: ApiClient, chatViewProvider: ChatViewProvider) {
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
        vscode.window.showErrorMessage('No code to document');
        return;
    }

    // Ask for documentation style preference
    const style = await vscode.window.showQuickPick(
        ['Auto-detect', 'JSDoc', 'Docstring', 'JavaDoc', 'XML Doc Comments', 'Inline Comments'],
        {
            placeHolder: 'Select documentation style (optional)'
        }
    );

    // Show chat view
    chatViewProvider.show();

    // Show progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'LibreChat: Adding documentation...',
            cancellable: false
        },
        async () => {
            try {
                const response = await apiClient.addComments({
                    code,
                    language: editor.document.languageId,
                    filePath: editor.document.fileName,
                    context: { style: style === 'Auto-detect' ? undefined : style }
                });

                // Send response to chat view
                let message = `Add documentation to this ${editor.document.languageId} code`;
                if (style && style !== 'Auto-detect') {
                    message += ` using ${style} style`;
                }
                message += `:\n\n\`\`\`${editor.document.languageId}\n${code}\n\`\`\``;

                await chatViewProvider.sendMessage(message, { prefilledResponse: response });

                // Ask if user wants to apply comments
                if (response.content.includes('```')) {
                    const apply = await vscode.window.showInformationMessage(
                        'Apply documentation?',
                        'Yes',
                        'No'
                    );

                    if (apply === 'Yes') {
                        // Extract code from markdown
                        const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)\n```/);
                        if (codeMatch) {
                            const documentedCode = codeMatch[1];
                            await editor.edit(editBuilder => {
                                if (selection.isEmpty) {
                                    const fullRange = new vscode.Range(
                                        editor.document.positionAt(0),
                                        editor.document.positionAt(editor.document.getText().length)
                                    );
                                    editBuilder.replace(fullRange, documentedCode);
                                } else {
                                    editBuilder.replace(selection, documentedCode);
                                }
                            });
                            vscode.window.showInformationMessage('Documentation added successfully!');
                        }
                    }
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to add documentation: ${error.message}`);
            }
        }
    );
}
