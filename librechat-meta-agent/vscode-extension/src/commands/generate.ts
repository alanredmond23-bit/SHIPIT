import * as vscode from 'vscode';
import { ApiClient } from '../api/client';
import { ChatViewProvider } from '../chat/ChatViewProvider';

export async function generateCode(apiClient: ApiClient, chatViewProvider: ChatViewProvider) {
    const editor = vscode.window.activeTextEditor;

    // Ask for code description
    const description = await vscode.window.showInputBox({
        prompt: 'Describe the code you want to generate',
        placeHolder: 'e.g., a function that sorts an array of objects by date',
        multiline: true
    });

    if (!description) {
        return;
    }

    // Determine language from active editor or ask
    let language = editor?.document.languageId;
    if (!language || language === 'plaintext') {
        language = await vscode.window.showQuickPick(
            ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'Other'],
            {
                placeHolder: 'Select programming language'
            }
        );

        if (!language) {
            return;
        }
    }

    // Show chat view
    chatViewProvider.show();

    // Show progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'LibreChat: Generating code...',
            cancellable: false
        },
        async () => {
            try {
                // Get workspace context
                const context: any = {};
                if (editor) {
                    context.currentFile = {
                        path: editor.document.fileName,
                        language: editor.document.languageId,
                        cursorPosition: {
                            line: editor.selection.active.line,
                            character: editor.selection.active.character
                        }
                    };

                    // Get surrounding context (previous and next 10 lines)
                    const cursorLine = editor.selection.active.line;
                    const startLine = Math.max(0, cursorLine - 10);
                    const endLine = Math.min(editor.document.lineCount - 1, cursorLine + 10);
                    const surroundingRange = new vscode.Range(
                        new vscode.Position(startLine, 0),
                        new vscode.Position(endLine, editor.document.lineAt(endLine).text.length)
                    );
                    context.surroundingCode = editor.document.getText(surroundingRange);
                }

                const response = await apiClient.generateCode({
                    description,
                    language,
                    context
                });

                // Send response to chat view
                const message = `Generate ${language} code: ${description}`;
                await chatViewProvider.sendMessage(message, { prefilledResponse: response });

                // Ask if user wants to insert code
                if (response.content.includes('```')) {
                    const insert = await vscode.window.showInformationMessage(
                        'Insert generated code?',
                        'Insert at cursor',
                        'Copy to clipboard',
                        'No'
                    );

                    // Extract code from markdown
                    const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)\n```/);
                    if (codeMatch) {
                        const generatedCode = codeMatch[1];

                        if (insert === 'Insert at cursor' && editor) {
                            const position = editor.selection.active;
                            await editor.edit(editBuilder => {
                                editBuilder.insert(position, generatedCode);
                            });
                            vscode.window.showInformationMessage('Code inserted successfully!');
                        } else if (insert === 'Copy to clipboard') {
                            await vscode.env.clipboard.writeText(generatedCode);
                            vscode.window.showInformationMessage('Code copied to clipboard!');
                        }
                    }
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to generate code: ${error.message}`);
            }
        }
    );
}
