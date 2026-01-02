import * as vscode from 'vscode';
import { ApiClient } from '../api/client';

export class CompletionProvider implements vscode.CompletionItemProvider {
    private lastTrigger: number = 0;
    private readonly debounceMs = 500;

    constructor(private apiClient: ApiClient) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {
        // Debounce to avoid too many API calls
        const now = Date.now();
        if (now - this.lastTrigger < this.debounceMs) {
            return undefined;
        }
        this.lastTrigger = now;

        // Only trigger on specific contexts
        if (
            context.triggerKind === vscode.CompletionTriggerKind.Invoke ||
            context.triggerCharacter === '\n'
        ) {
            try {
                // Get code before cursor
                const textBefore = document.getText(
                    new vscode.Range(new vscode.Position(0, 0), position)
                );

                // Get suggestions from API
                const response = await this.apiClient.complete({
                    code: textBefore,
                    language: document.languageId,
                    position: {
                        line: position.line,
                        character: position.character
                    }
                });

                // Convert suggestions to completion items
                const completionItems: vscode.CompletionItem[] = response.suggestions.map(
                    (suggestion, index) => {
                        const item = new vscode.CompletionItem(
                            suggestion,
                            vscode.CompletionItemKind.Snippet
                        );
                        item.insertText = new vscode.SnippetString(suggestion);
                        item.detail = 'LibreChat AI suggestion';
                        item.sortText = `0${index}`; // Ensure our items appear first
                        return item;
                    }
                );

                return new vscode.CompletionList(completionItems, false);
            } catch (error) {
                // Silently fail - don't show errors for autocomplete
                console.error('LibreChat completion error:', error);
                return undefined;
            }
        }

        return undefined;
    }
}
