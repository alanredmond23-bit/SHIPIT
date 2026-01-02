import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export interface ChatRequest {
    message: string;
    conversationId?: string;
    context?: any;
    mode?: 'chat' | 'extended-thinking' | 'deep-research';
}

export interface ChatResponse {
    content: string;
    conversationId?: string;
    thinking?: string;
    sources?: any[];
}

export interface CodeRequest {
    code: string;
    language: string;
    filePath?: string;
    context?: any;
}

export class ApiClient {
    private client: AxiosInstance;
    private serverUrl: string;
    private apiKey?: string;

    constructor() {
        this.updateConfig();

        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('librechat')) {
                this.updateConfig();
            }
        });

        this.client = axios.create({
            timeout: 120000, // 2 minutes
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add request interceptor for auth
        this.client.interceptors.request.use(config => {
            if (this.apiKey) {
                config.headers.Authorization = `Bearer ${this.apiKey}`;
            }
            return config;
        });
    }

    private updateConfig() {
        const config = vscode.workspace.getConfiguration('librechat');
        this.serverUrl = config.get('serverUrl') || 'http://localhost:3001';
        this.apiKey = config.get('apiKey');
    }

    async chat(request: ChatRequest): Promise<ChatResponse> {
        try {
            const response = await this.client.post(
                `${this.serverUrl}/api/ide/chat`,
                request
            );
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async explain(request: CodeRequest): Promise<ChatResponse> {
        try {
            const response = await this.client.post(
                `${this.serverUrl}/api/ide/explain`,
                request
            );
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async refactor(request: CodeRequest): Promise<ChatResponse> {
        try {
            const response = await this.client.post(
                `${this.serverUrl}/api/ide/refactor`,
                request
            );
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async generateTests(request: CodeRequest): Promise<ChatResponse> {
        try {
            const response = await this.client.post(
                `${this.serverUrl}/api/ide/tests`,
                request
            );
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async fixBug(request: CodeRequest & { bugDescription?: string }): Promise<ChatResponse> {
        try {
            const response = await this.client.post(
                `${this.serverUrl}/api/ide/fix`,
                request
            );
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async addComments(request: CodeRequest): Promise<ChatResponse> {
        try {
            const response = await this.client.post(
                `${this.serverUrl}/api/ide/comments`,
                request
            );
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async generateCode(request: { description: string; language?: string; context?: any }): Promise<ChatResponse> {
        try {
            const response = await this.client.post(
                `${this.serverUrl}/api/ide/generate`,
                request
            );
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async review(request: CodeRequest): Promise<ChatResponse> {
        try {
            const response = await this.client.post(
                `${this.serverUrl}/api/ide/review`,
                request
            );
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async complete(request: { code: string; language: string; position: { line: number; character: number } }): Promise<{ suggestions: string[] }> {
        try {
            const response = await this.client.post(
                `${this.serverUrl}/api/ide/complete`,
                request
            );
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }
}
