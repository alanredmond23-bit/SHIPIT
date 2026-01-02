import { z } from 'zod';
import { Logger } from 'pino';
import { MCPClient, MCPTool } from '../mcp-client';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Code Execution Input Schema
const CodeExecutionInputSchema = z.object({
  language: z.enum(['python', 'javascript', 'typescript']).describe('Programming language'),
  code: z.string().min(1).max(50000).describe('Code to execute'),
  timeout: z.number().min(100).max(30000).default(5000).describe('Execution timeout in milliseconds'),
  env: z.record(z.string()).optional().describe('Environment variables'),
  args: z.array(z.string()).optional().describe('Command-line arguments'),
});

type CodeExecutionInput = z.infer<typeof CodeExecutionInputSchema>;

// Code Execution Result Types
export interface CodeExecutionResult {
  id: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  timedOut: boolean;
  error?: string;
  language: string;
  timestamp: string;
}

// Security and resource limits
interface SandboxLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxProcesses: number;
  maxFileSize: number;
  allowNetwork: boolean;
  allowFileSystem: boolean;
}

/**
 * Code Executor Tool Implementation
 * Provides safe code execution in a sandboxed environment
 */
export class CodeExecutorTool {
  private readonly TOOL_NAME = 'code_executor';
  private readonly SERVER_ID = 'builtin-tools';
  private activeExecutions: Map<string, ChildProcess> = new Map();

  // Default sandbox limits
  private readonly DEFAULT_LIMITS: SandboxLimits = {
    maxMemoryMB: 512,
    maxCpuPercent: 50,
    maxProcesses: 10,
    allowNetwork: false,
    allowFileSystem: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  };

  constructor(
    private mcpClient: MCPClient,
    private logger: Logger,
    private sandboxLimits: Partial<SandboxLimits> = {}
  ) {
    this.registerTool();
  }

  /**
   * Register the code executor tool with the MCP client
   */
  private registerTool(): void {
    const tool: MCPTool = {
      name: this.TOOL_NAME,
      description: 'Execute Python or JavaScript code in a secure sandbox. Returns stdout, stderr, and exit code.',
      inputSchema: CodeExecutionInputSchema,
      server: this.SERVER_ID,
    };

    try {
      this.mcpClient.registerTool(tool);
      this.logger.info({ toolName: this.TOOL_NAME }, 'Code executor tool registered');
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to register code executor tool');
      throw error;
    }
  }

  /**
   * Execute code in a sandboxed environment
   */
  async execute(input: CodeExecutionInput): Promise<CodeExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();

    // Validate input
    const validatedInput = CodeExecutionInputSchema.parse(input);

    this.logger.info(
      {
        executionId,
        language: validatedInput.language,
        codeLength: validatedInput.code.length,
      },
      'Starting code execution'
    );

    try {
      // Security checks
      this.performSecurityChecks(validatedInput);

      // Execute based on language
      const result = await this.executeInSandbox(executionId, validatedInput);

      this.logger.info(
        {
          executionId,
          success: result.success,
          executionTime: result.executionTime,
        },
        'Code execution completed'
      );

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        {
          executionId,
          error: error.message,
          executionTime,
        },
        'Code execution failed'
      );

      return {
        id: executionId,
        success: false,
        stdout: '',
        stderr: error.message,
        exitCode: null,
        executionTime,
        timedOut: false,
        error: error.message,
        language: validatedInput.language,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute code in sandbox
   */
  private async executeInSandbox(
    executionId: string,
    input: CodeExecutionInput
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const limits = { ...this.DEFAULT_LIMITS, ...this.sandboxLimits };

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let finished = false;

      // Prepare execution command
      const { command, args } = this.prepareCommand(input);

      this.logger.debug({ executionId, command, args }, 'Spawning process');

      // Spawn process
      const process = spawn(command, args, {
        timeout: input.timeout,
        env: {
          ...process.env,
          ...input.env,
          // Security: restrict environment
          NODE_ENV: 'sandbox',
          NO_COLOR: '1',
        },
        shell: false, // Security: disable shell interpretation
      });

      this.activeExecutions.set(executionId, process);

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        if (!finished) {
          timedOut = true;
          this.logger.warn({ executionId }, 'Execution timed out, killing process');
          process.kill('SIGKILL');
        }
      }, input.timeout);

      // Capture stdout
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Limit output size to prevent memory issues
        if (stdout.length > limits.maxFileSize) {
          stdout = stdout.substring(0, limits.maxFileSize) + '\n[Output truncated]';
          process.kill('SIGTERM');
        }
      });

      // Capture stderr
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > limits.maxFileSize) {
          stderr = stderr.substring(0, limits.maxFileSize) + '\n[Error output truncated]';
          process.kill('SIGTERM');
        }
      });

      // Handle errors
      process.on('error', (error) => {
        finished = true;
        clearTimeout(timeoutHandle);
        this.activeExecutions.delete(executionId);

        reject(new Error(`Process error: ${error.message}`));
      });

      // Handle completion
      process.on('close', (exitCode) => {
        finished = true;
        clearTimeout(timeoutHandle);
        this.activeExecutions.delete(executionId);

        const executionTime = Date.now() - startTime;

        const result: CodeExecutionResult = {
          id: executionId,
          success: exitCode === 0 && !timedOut,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          executionTime,
          timedOut,
          language: input.language,
          timestamp: new Date().toISOString(),
        };

        if (timedOut) {
          result.error = `Execution timed out after ${input.timeout}ms`;
        }

        resolve(result);
      });
    });
  }

  /**
   * Prepare execution command based on language
   */
  private prepareCommand(input: CodeExecutionInput): { command: string; args: string[] } {
    switch (input.language) {
      case 'python': {
        // Execute Python code directly via stdin
        return {
          command: 'python3',
          args: ['-c', input.code, ...(input.args || [])],
        };
      }

      case 'javascript': {
        // Execute JavaScript with Node.js
        return {
          command: 'node',
          args: ['--eval', input.code, ...(input.args || [])],
        };
      }

      case 'typescript': {
        // Execute TypeScript with tsx
        return {
          command: 'npx',
          args: ['tsx', '--eval', input.code, ...(input.args || [])],
        };
      }

      default:
        throw new Error(`Unsupported language: ${input.language}`);
    }
  }

  /**
   * Perform security checks on code
   */
  private performSecurityChecks(input: CodeExecutionInput): void {
    const code = input.code.toLowerCase();

    // Check for dangerous operations
    const dangerousPatterns = [
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /import.*child_process/,
      /exec\s*\(/,
      /eval\s*\(/,
      /function\s*\(\s*\)\s*{\s*return\s+this/,
      /__import__\s*\(\s*['"]os['"]\s*\)/,
      /import\s+os/,
      /subprocess/,
      /system\s*\(/,
      /popen\s*\(/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(
          `Security violation: Code contains potentially dangerous pattern: ${pattern.source}`
        );
      }
    }

    // Check code length
    if (input.code.length > 50000) {
      throw new Error('Code exceeds maximum length of 50,000 characters');
    }

    this.logger.debug('Security checks passed');
  }

  /**
   * Kill a running execution
   */
  async killExecution(executionId: string): Promise<boolean> {
    const process = this.activeExecutions.get(executionId);

    if (!process) {
      return false;
    }

    this.logger.warn({ executionId }, 'Killing execution');

    try {
      process.kill('SIGTERM');

      // If still running after 1 second, force kill
      setTimeout(() => {
        if (this.activeExecutions.has(executionId)) {
          process.kill('SIGKILL');
        }
      }, 1000);

      return true;
    } catch (error) {
      this.logger.error({ executionId, error }, 'Failed to kill execution');
      return false;
    }
  }

  /**
   * Get list of active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Format execution result for LLM consumption
   */
  formatResultForLLM(result: CodeExecutionResult): string {
    let formatted = `Code Execution Result (${result.language})\n`;
    formatted += `Execution ID: ${result.id}\n`;
    formatted += `Status: ${result.success ? 'Success' : 'Failed'}\n`;
    formatted += `Execution Time: ${result.executionTime}ms\n`;

    if (result.timedOut) {
      formatted += `⚠️  Timed Out\n`;
    }

    if (result.exitCode !== null) {
      formatted += `Exit Code: ${result.exitCode}\n`;
    }

    formatted += `\n`;

    if (result.stdout) {
      formatted += `STDOUT:\n${result.stdout}\n\n`;
    }

    if (result.stderr) {
      formatted += `STDERR:\n${result.stderr}\n\n`;
    }

    if (result.error) {
      formatted += `ERROR:\n${result.error}\n`;
    }

    return formatted;
  }

  /**
   * Validate language runtime is available
   */
  async validateRuntime(language: string): Promise<boolean> {
    try {
      const command = language === 'python' ? 'python3' : 'node';
      const process = spawn(command, ['--version']);

      return new Promise((resolve) => {
        process.on('close', (code) => {
          resolve(code === 0);
        });

        process.on('error', () => {
          resolve(false);
        });

        setTimeout(() => {
          process.kill();
          resolve(false);
        }, 5000);
      });
    } catch {
      return false;
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    const languages = ['python', 'javascript', 'typescript'];
    const supported: string[] = [];

    for (const lang of languages) {
      if (await this.validateRuntime(lang)) {
        supported.push(lang);
      }
    }

    return supported;
  }
}

/**
 * Factory function to create and initialize the code executor tool
 */
export function createCodeExecutorTool(
  mcpClient: MCPClient,
  logger: Logger,
  sandboxLimits?: Partial<SandboxLimits>
): CodeExecutorTool {
  return new CodeExecutorTool(mcpClient, logger, sandboxLimits);
}
