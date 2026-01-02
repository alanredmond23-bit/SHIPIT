import * as vscode from 'vscode';
import { ChatViewProvider } from './chat/ChatViewProvider';
import { explainCode } from './commands/explain';
import { refactorCode } from './commands/refactor';
import { generateTests } from './commands/tests';
import { fixBug } from './commands/fix';
import { addComments } from './commands/comments';
import { generateCode } from './commands/generate';
import { reviewCode } from './commands/review';
import { CodeActionProvider } from './providers/CodeActionProvider';
import { CompletionProvider } from './providers/CompletionProvider';
import { HoverProvider } from './providers/HoverProvider';
import { DiagnosticsProvider } from './providers/DiagnosticsProvider';
import { ApiClient } from './api/client';

let chatViewProvider: ChatViewProvider;
let apiClient: ApiClient;
let diagnosticsProvider: DiagnosticsProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('LibreChat Meta Agent extension activated');

    // Initialize API client
    apiClient = new ApiClient();

    // Register chat view provider
    chatViewProvider = new ChatViewProvider(context.extensionUri, apiClient);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'librechat.chatView',
            chatViewProvider
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.chat', () => {
            chatViewProvider.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.explainCode', async () => {
            await explainCode(apiClient, chatViewProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.refactorCode', async () => {
            await refactorCode(apiClient, chatViewProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.generateTests', async () => {
            await generateTests(apiClient, chatViewProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.fixBug', async () => {
            await fixBug(apiClient, chatViewProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.addComments', async () => {
            await addComments(apiClient, chatViewProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.generateCode', async () => {
            await generateCode(apiClient, chatViewProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.review', async () => {
            await reviewCode(apiClient, chatViewProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.extendedThinking', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter your question for extended thinking',
                placeHolder: 'What should I consider when...'
            });
            if (input) {
                chatViewProvider.show();
                chatViewProvider.sendMessage(input, { mode: 'extended-thinking' });
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('librechat.research', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter your research question',
                placeHolder: 'Research topic...'
            });
            if (input) {
                chatViewProvider.show();
                chatViewProvider.sendMessage(input, { mode: 'deep-research' });
            }
        })
    );

    // Register providers
    const selector: vscode.DocumentSelector = { scheme: 'file' };

    // Code actions (quick fixes and refactorings)
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            selector,
            new CodeActionProvider(apiClient),
            { providedCodeActionKinds: CodeActionProvider.providedCodeActionKinds }
        )
    );

    // Completions
    const config = vscode.workspace.getConfiguration('librechat');
    if (config.get('autoSuggest')) {
        context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                selector,
                new CompletionProvider(apiClient),
                '\n', '.', '(', '{', '[', ' '
            )
        );
    }

    // Hover provider
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            selector,
            new HoverProvider(apiClient)
        )
    );

    // Diagnostics provider
    diagnosticsProvider = new DiagnosticsProvider(apiClient);
    context.subscriptions.push(diagnosticsProvider);

    // Show welcome message on first install
    const hasShownWelcome = context.globalState.get('hasShownWelcome');
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to LibreChat Meta Agent! Use Ctrl+Shift+L to open the chat.',
            'Open Chat',
            'Settings'
        ).then(selection => {
            if (selection === 'Open Chat') {
                vscode.commands.executeCommand('librechat.chat');
            } else if (selection === 'Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'librechat');
            }
        });
        context.globalState.update('hasShownWelcome', true);
    }
}

export function deactivate() {
    if (diagnosticsProvider) {
        diagnosticsProvider.dispose();
    }
}
