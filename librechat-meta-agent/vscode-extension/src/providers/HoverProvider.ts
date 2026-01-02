import * as vscode from 'vscode';
import { ApiClient } from '../api/client';

export class HoverProvider implements vscode.HoverProvider {
    private cache = new Map<string, { hover: vscode.Hover; timestamp: number }>();
    private readonly cacheTTL = 60000; // 1 minute

    constructor(private apiClient: ApiClient) {}

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        // Get word at position
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }

        const word = document.getText(wordRange);
        if (!word || word.length < 3) {
            return undefined;
        }

        // Check cache
        const cacheKey = `${document.uri.toString()}:${word}:${position.line}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.hover;
        }

        try {
            // Get surrounding context
            const startLine = Math.max(0, position.line - 3);
            const endLine = Math.min(document.lineCount - 1, position.line + 3);
            const contextRange = new vscode.Range(
                new vscode.Position(startLine, 0),
                new vscode.Position(endLine, document.lineAt(endLine).text.length)
            );
            const context = document.getText(contextRange);

            // Get explanation from API
            const response = await this.apiClient.explain({
                code: context,
                language: document.languageId,
                filePath: document.fileName,
                context: {
                    focusWord: word,
                    focusLine: position.line - startLine
                }
            });

            if (response.content) {
                const markdown = new vscode.MarkdownString(response.content);
                markdown.isTrusted = true;
                markdown.supportHtml = true;

                const hover = new vscode.Hover(markdown, wordRange);

                // Cache the result
                this.cache.set(cacheKey, { hover, timestamp: Date.now() });

                // Clean old cache entries
                this.cleanCache();

                return hover;
            }
        } catch (error) {
            // Silently fail - don't show errors for hover
            console.error('LibreChat hover error:', error);
        }

        return undefined;
    }

    private cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTTL) {
                this.cache.delete(key);
            }
        }
    }
}
