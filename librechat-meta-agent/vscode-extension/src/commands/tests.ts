import * as vscode from 'vscode';
import { ApiClient } from '../api/client';
import { ChatViewProvider } from '../chat/ChatViewProvider';

export async function generateTests(apiClient: ApiClient, chatViewProvider: ChatViewProvider) {
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
        vscode.window.showErrorMessage('No code to generate tests for');
        return;
    }

    // Ask for test framework preference (optional)
    const framework = await vscode.window.showQuickPick(
        ['Auto-detect', 'Jest', 'Mocha', 'PyTest', 'JUnit', 'Other'],
        {
            placeHolder: 'Select test framework (optional)'
        }
    );

    // Show chat view
    chatViewProvider.show();

    // Show progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'LibreChat: Generating tests...',
            cancellable: false
        },
        async () => {
            try {
                const response = await apiClient.generateTests({
                    code,
                    language: editor.document.languageId,
                    filePath: editor.document.fileName,
                    context: { framework: framework === 'Auto-detect' ? undefined : framework }
                });

                // Send response to chat view
                let message = `Generate unit tests for this ${editor.document.languageId} code`;
                if (framework && framework !== 'Auto-detect') {
                    message += ` using ${framework}`;
                }
                message += `:\n\n\`\`\`${editor.document.languageId}\n${code}\n\`\`\``;

                await chatViewProvider.sendMessage(message, { prefilledResponse: response });

                // Offer to create test file
                const create = await vscode.window.showInformationMessage(
                    'Create test file?',
                    'Yes',
                    'No'
                );

                if (create === 'Yes') {
                    // Extract code from markdown
                    const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)\n```/);
                    if (codeMatch) {
                        const testCode = codeMatch[1];

                        // Generate test file name
                        const originalPath = editor.document.fileName;
                        const ext = originalPath.substring(originalPath.lastIndexOf('.'));
                        const basePath = originalPath.substring(0, originalPath.lastIndexOf('.'));
                        const testPath = `${basePath}.test${ext}`;

                        // Create new file
                        const uri = vscode.Uri.file(testPath);
                        const edit = new vscode.WorkspaceEdit();
                        edit.createFile(uri, { ignoreIfExists: true });
                        edit.insert(uri, new vscode.Position(0, 0), testCode);

                        await vscode.workspace.applyEdit(edit);
                        const doc = await vscode.workspace.openTextDocument(uri);
                        await vscode.window.showTextDocument(doc);

                        vscode.window.showInformationMessage('Test file created successfully!');
                    }
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to generate tests: ${error.message}`);
            }
        }
    );
}
