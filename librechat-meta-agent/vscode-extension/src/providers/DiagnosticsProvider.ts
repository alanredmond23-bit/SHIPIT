import * as vscode from 'vscode';
import { ApiClient } from '../api/client';

export class DiagnosticsProvider implements vscode.Disposable {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private diagnosticQueue = new Map<string, NodeJS.Timeout>();
    private readonly debounceMs = 2000;

    constructor(private apiClient: ApiClient) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('librechat');

        // Listen to document changes
        vscode.workspace.onDidChangeTextDocument(this.onDocumentChange, this);
        vscode.workspace.onDidOpenTextDocument(this.onDocumentOpen, this);
        vscode.workspace.onDidCloseTextDocument(this.onDocumentClose, this);

        // Analyze currently open documents
        vscode.workspace.textDocuments.forEach(doc => {
            if (this.shouldAnalyze(doc)) {
                this.queueAnalysis(doc);
            }
        });
    }

    private shouldAnalyze(document: vscode.TextDocument): boolean {
        // Only analyze file scheme documents
        if (document.uri.scheme !== 'file') {
            return false;
        }

        // Only analyze code files
        const codeLanguages = [
            'javascript',
            'typescript',
            'python',
            'java',
            'cpp',
            'c',
            'csharp',
            'go',
            'rust',
            'php',
            'ruby'
        ];

        return codeLanguages.includes(document.languageId);
    }

    private onDocumentChange(event: vscode.TextDocumentChangeEvent) {
        if (this.shouldAnalyze(event.document)) {
            this.queueAnalysis(event.document);
        }
    }

    private onDocumentOpen(document: vscode.TextDocument) {
        if (this.shouldAnalyze(document)) {
            this.queueAnalysis(document);
        }
    }

    private onDocumentClose(document: vscode.TextDocument) {
        // Clear diagnostics for closed document
        this.diagnosticCollection.delete(document.uri);

        // Cancel any pending analysis
        const timeout = this.diagnosticQueue.get(document.uri.toString());
        if (timeout) {
            clearTimeout(timeout);
            this.diagnosticQueue.delete(document.uri.toString());
        }
    }

    private queueAnalysis(document: vscode.TextDocument) {
        const key = document.uri.toString();

        // Clear existing timeout
        const existingTimeout = this.diagnosticQueue.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Queue new analysis
        const timeout = setTimeout(() => {
            this.analyzeDocument(document);
            this.diagnosticQueue.delete(key);
        }, this.debounceMs);

        this.diagnosticQueue.set(key, timeout);
    }

    private async analyzeDocument(document: vscode.TextDocument) {
        try {
            const code = document.getText();

            // Skip empty documents
            if (!code.trim()) {
                return;
            }

            // Get code review from API
            const response = await this.apiClient.review({
                code,
                language: document.languageId,
                filePath: document.fileName,
                context: {
                    focusAreas: ['Bug detection', 'Security vulnerabilities', 'Code quality']
                }
            });

            // Parse diagnostics from response
            const diagnostics = this.parseDiagnostics(response.content, document);

            // Update diagnostics
            this.diagnosticCollection.set(document.uri, diagnostics);
        } catch (error) {
            // Silently fail - don't show errors for background diagnostics
            console.error('LibreChat diagnostics error:', error);
        }
    }

    private parseDiagnostics(
        reviewContent: string,
        document: vscode.TextDocument
    ): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // Parse review content for issues
        // Format: "Line X: [SEVERITY] message"
        // or "Line X-Y: [SEVERITY] message"
        const lines = reviewContent.split('\n');

        for (const line of lines) {
            const match = line.match(
                /Line (\d+)(?:-(\d+))?:\s*\[(ERROR|WARNING|INFO)\]\s*(.+)/i
            );

            if (match) {
                const startLine = parseInt(match[1]) - 1;
                const endLine = match[2] ? parseInt(match[2]) - 1 : startLine;
                const severityText = match[3].toUpperCase();
                const message = match[4];

                // Map severity
                let severity: vscode.DiagnosticSeverity;
                switch (severityText) {
                    case 'ERROR':
                        severity = vscode.DiagnosticSeverity.Error;
                        break;
                    case 'WARNING':
                        severity = vscode.DiagnosticSeverity.Warning;
                        break;
                    case 'INFO':
                    default:
                        severity = vscode.DiagnosticSeverity.Information;
                        break;
                }

                // Create diagnostic
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(
                        Math.max(0, startLine),
                        0,
                        Math.min(document.lineCount - 1, endLine),
                        999
                    ),
                    message,
                    severity
                );
                diagnostic.source = 'LibreChat';

                diagnostics.push(diagnostic);
            }
        }

        return diagnostics;
    }

    dispose() {
        // Clear all timeouts
        for (const timeout of this.diagnosticQueue.values()) {
            clearTimeout(timeout);
        }
        this.diagnosticQueue.clear();

        // Clear diagnostics
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
    }
}
