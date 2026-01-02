import * as vscode from 'vscode';
import { ApiClient } from '../api/client';

export class CodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.Refactor
    ];

    constructor(private apiClient: ApiClient) {}

    async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        // Only show actions if there's a selection or diagnostics
        const hasSelection = !range.isEmpty;
        const hasDiagnostics = context.diagnostics.length > 0;

        if (!hasSelection && !hasDiagnostics) {
            return actions;
        }

        if (hasSelection) {
            // Explain code action
            const explainAction = new vscode.CodeAction(
                'Explain with LibreChat',
                vscode.CodeActionKind.Empty
            );
            explainAction.command = {
                command: 'librechat.explainCode',
                title: 'Explain with LibreChat'
            };
            actions.push(explainAction);

            // Refactor code action
            const refactorAction = new vscode.CodeAction(
                'Refactor with LibreChat',
                vscode.CodeActionKind.Refactor
            );
            refactorAction.command = {
                command: 'librechat.refactorCode',
                title: 'Refactor with LibreChat'
            };
            actions.push(refactorAction);

            // Generate tests action
            const testsAction = new vscode.CodeAction(
                'Generate tests with LibreChat',
                vscode.CodeActionKind.Empty
            );
            testsAction.command = {
                command: 'librechat.generateTests',
                title: 'Generate tests with LibreChat'
            };
            actions.push(testsAction);

            // Add documentation action
            const docsAction = new vscode.CodeAction(
                'Add documentation with LibreChat',
                vscode.CodeActionKind.Empty
            );
            docsAction.command = {
                command: 'librechat.addComments',
                title: 'Add documentation with LibreChat'
            };
            actions.push(docsAction);
        }

        if (hasDiagnostics) {
            // Fix issue action
            const fixAction = new vscode.CodeAction(
                'Fix with LibreChat',
                vscode.CodeActionKind.QuickFix
            );
            fixAction.command = {
                command: 'librechat.fixBug',
                title: 'Fix with LibreChat'
            };
            fixAction.diagnostics = context.diagnostics;
            actions.push(fixAction);
        }

        return actions;
    }
}
