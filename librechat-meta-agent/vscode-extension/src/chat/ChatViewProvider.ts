import * as vscode from 'vscode';
import { ApiClient } from '../api/client';
import * as fs from 'fs';
import * as path from 'path';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'librechat.chatView';
    private _view?: vscode.WebviewView;
    private _conversationId?: string;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _apiClient: ApiClient
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this._handleSendMessage(data.message, data.options);
                    break;
                case 'insertCode':
                    await this._insertCode(data.code);
                    break;
                case 'applyDiff':
                    await this._applyDiff(data.original, data.modified);
                    break;
                case 'newConversation':
                    this._conversationId = undefined;
                    this._view?.webview.postMessage({ type: 'clearChat' });
                    break;
            }
        });
    }

    public show() {
        if (this._view) {
            this._view.show?.(true);
        }
    }

    public async sendMessage(message: string, options?: any) {
        await this._handleSendMessage(message, options);
    }

    private async _handleSendMessage(message: string, options?: any) {
        if (!this._view) {
            return;
        }

        // Add user message to chat
        this._view.webview.postMessage({
            type: 'addMessage',
            message: {
                role: 'user',
                content: message
            }
        });

        // Show thinking indicator
        this._view.webview.postMessage({
            type: 'thinking',
            thinking: true
        });

        try {
            // Get workspace context
            const context = await this._getWorkspaceContext();

            // Send to API with streaming
            const response = await this._apiClient.chat({
                message,
                conversationId: this._conversationId,
                context,
                ...options
            });

            // Store conversation ID
            if (response.conversationId) {
                this._conversationId = response.conversationId;
            }

            // Add assistant message
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'assistant',
                    content: response.content,
                    thinking: response.thinking,
                    sources: response.sources
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`LibreChat error: ${error.message}`);
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'error',
                    content: `Error: ${error.message}`
                }
            });
        } finally {
            this._view.webview.postMessage({
                type: 'thinking',
                thinking: false
            });
        }
    }

    private async _getWorkspaceContext(): Promise<any> {
        const editor = vscode.window.activeTextEditor;
        const workspaceFolders = vscode.workspace.workspaceFolders;

        const context: any = {
            workspaceRoot: workspaceFolders?.[0]?.uri.fsPath,
            openFiles: []
        };

        // Add current file context
        if (editor) {
            const document = editor.document;
            context.currentFile = {
                path: document.fileName,
                language: document.languageId,
                content: document.getText(),
                selection: editor.selection.isEmpty
                    ? undefined
                    : document.getText(editor.selection),
                cursorPosition: {
                    line: editor.selection.active.line,
                    character: editor.selection.active.character
                }
            };
        }

        // Add all visible editors
        vscode.window.visibleTextEditors.forEach(editor => {
            if (editor.document.uri.scheme === 'file') {
                context.openFiles.push({
                    path: editor.document.fileName,
                    language: editor.document.languageId
                });
            }
        });

        return context;
    }

    private async _insertCode(code: string) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const position = editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(position, code);
            });
        }
    }

    private async _applyDiff(original: string, modified: string) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            await editor.edit(editBuilder => {
                editBuilder.replace(fullRange, modified);
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const htmlPath = path.join(
            this._extensionUri.fsPath,
            'src',
            'webview',
            'chat.html'
        );

        let html = fs.readFileSync(htmlPath, 'utf8');

        // Replace resource URIs
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'chat.js')
        );

        html = html.replace('{{scriptUri}}', scriptUri.toString());

        return html;
    }
}
