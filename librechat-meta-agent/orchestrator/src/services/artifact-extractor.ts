import { Logger } from 'pino';

/**
 * Artifact types supported by the system
 */
export enum ArtifactType {
  CODE = 'code',
  DOCUMENT = 'document',
  DIAGRAM = 'diagram',
  DATA = 'data',
  UNKNOWN = 'unknown',
}

/**
 * Programming languages detected from code fences
 */
export type SupportedLanguage =
  | 'typescript' | 'javascript' | 'tsx' | 'jsx'
  | 'python' | 'java' | 'cpp' | 'c' | 'csharp'
  | 'go' | 'rust' | 'php' | 'ruby' | 'swift'
  | 'kotlin' | 'sql' | 'html' | 'css' | 'scss'
  | 'json' | 'yaml' | 'xml' | 'markdown'
  | 'bash' | 'shell' | 'powershell'
  | 'plaintext';

/**
 * Metadata extracted from an artifact
 */
export interface ArtifactMetadata {
  id: string;
  type: ArtifactType;
  language?: SupportedLanguage;
  title?: string;
  description?: string;
  filename?: string;
  lineCount: number;
  characterCount: number;
  createdAt: Date;
  version: number;
}

/**
 * Extracted artifact with content and metadata
 */
export interface ExtractedArtifact {
  metadata: ArtifactMetadata;
  content: string;
  rawBlock: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Language aliases mapping for code fence detection
 */
const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  'ts': 'typescript',
  'js': 'javascript',
  'py': 'python',
  'sh': 'bash',
  'yml': 'yaml',
  'c++': 'cpp',
  'c#': 'csharp',
  'cs': 'csharp',
  'md': 'markdown',
  'txt': 'plaintext',
};

/**
 * Diagram-related keywords for detection
 */
const DIAGRAM_KEYWORDS = [
  'mermaid', 'flowchart', 'sequence', 'gantt',
  'graph', 'diagram', 'chart', 'svg'
];

/**
 * Service for extracting artifacts from AI response text
 */
export class ArtifactExtractor {
  private artifactCounter = 0;

  constructor(private logger: Logger) {}

  /**
   * Extract all artifacts from AI response text
   */
  extractAll(responseText: string, conversationId?: string): ExtractedArtifact[] {
    const artifacts: ExtractedArtifact[] = [];

    // Extract code blocks (```...```)
    const codeBlocks = this.extractCodeBlocks(responseText);
    artifacts.push(...codeBlocks);

    // Extract inline code that might be files
    const inlineArtifacts = this.extractInlineArtifacts(responseText);
    artifacts.push(...inlineArtifacts);

    // Log extraction results
    this.logger.info({
      conversationId,
      artifactsFound: artifacts.length,
      types: artifacts.reduce((acc, a) => {
        acc[a.metadata.type] = (acc[a.metadata.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    }, 'Artifacts extracted from response');

    return artifacts;
  }

  /**
   * Extract code blocks from markdown-style fenced code
   */
  private extractCodeBlocks(text: string): ExtractedArtifact[] {
    const artifacts: ExtractedArtifact[] = [];
    const codeBlockRegex = /```(\w+)?\s*(?:\{([^\}]+)\})?\n([\s\S]*?)```/g;

    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const [rawBlock, languageHint, metadata, content] = match;
      const startIndex = match.index;
      const endIndex = startIndex + rawBlock.length;

      // Parse language
      const language = this.parseLanguage(languageHint);

      // Detect artifact type
      const type = this.detectArtifactType(content, language, metadata);

      // Generate metadata
      const artifactMetadata = this.generateMetadata(
        content,
        type,
        language,
        metadata
      );

      artifacts.push({
        metadata: artifactMetadata,
        content: content.trim(),
        rawBlock,
        startIndex,
        endIndex,
      });
    }

    return artifacts;
  }

  /**
   * Extract inline artifacts (e.g., file paths with content)
   */
  private extractInlineArtifacts(text: string): ExtractedArtifact[] {
    const artifacts: ExtractedArtifact[] = [];

    // Match patterns like: "file: path/to/file.ts" followed by code
    const filePatternRegex = /(?:file|path|filename):\s*([^\n]+\.(\w+))\n([\s\S]+?)(?=\n(?:file|path|```)|$)/gi;

    let match: RegExpExecArray | null;

    while ((match = filePatternRegex.exec(text)) !== null) {
      const [rawBlock, filepath, extension, content] = match;
      const startIndex = match.index;
      const endIndex = startIndex + rawBlock.length;

      const language = this.parseLanguageFromExtension(extension);
      const type = this.detectArtifactType(content, language);

      const artifactMetadata = this.generateMetadata(
        content.trim(),
        type,
        language,
        undefined,
        filepath
      );

      artifacts.push({
        metadata: artifactMetadata,
        content: content.trim(),
        rawBlock,
        startIndex,
        endIndex,
      });
    }

    return artifacts;
  }

  /**
   * Parse language from code fence hint
   */
  private parseLanguage(hint?: string): SupportedLanguage | undefined {
    if (!hint) return undefined;

    const normalized = hint.toLowerCase().trim();

    // Check aliases first
    if (LANGUAGE_ALIASES[normalized]) {
      return LANGUAGE_ALIASES[normalized];
    }

    // Direct match
    return normalized as SupportedLanguage;
  }

  /**
   * Parse language from file extension
   */
  private parseLanguageFromExtension(extension: string): SupportedLanguage | undefined {
    const extMap: Record<string, SupportedLanguage> = {
      'ts': 'typescript',
      'tsx': 'tsx',
      'js': 'javascript',
      'jsx': 'jsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'sql': 'sql',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'md': 'markdown',
      'sh': 'bash',
      'bash': 'bash',
      'ps1': 'powershell',
    };

    return extMap[extension.toLowerCase()];
  }

  /**
   * Detect artifact type from content and context
   */
  private detectArtifactType(
    content: string,
    language?: SupportedLanguage,
    metadata?: string
  ): ArtifactType {
    const lowerContent = content.toLowerCase();
    const lowerMetadata = metadata?.toLowerCase() || '';

    // Check for diagrams
    if (DIAGRAM_KEYWORDS.some(keyword =>
      lowerContent.includes(keyword) || lowerMetadata.includes(keyword)
    )) {
      return ArtifactType.DIAGRAM;
    }

    // Check for data formats
    if (language === 'json' || language === 'yaml' || language === 'xml') {
      return ArtifactType.DATA;
    }

    // Check for documents
    if (language === 'markdown' || language === 'plaintext') {
      return ArtifactType.DOCUMENT;
    }

    // Default to code if it has a programming language
    if (language && language !== 'plaintext') {
      return ArtifactType.CODE;
    }

    return ArtifactType.UNKNOWN;
  }

  /**
   * Generate comprehensive metadata for an artifact
   */
  private generateMetadata(
    content: string,
    type: ArtifactType,
    language?: SupportedLanguage,
    metadataStr?: string,
    filename?: string
  ): ArtifactMetadata {
    this.artifactCounter++;

    // Parse metadata string if present (format: {title: "...", description: "..."})
    let title: string | undefined;
    let description: string | undefined;

    if (metadataStr) {
      const titleMatch = metadataStr.match(/title:\s*["']([^"']+)["']/i);
      const descMatch = metadataStr.match(/description:\s*["']([^"']+)["']/i);
      title = titleMatch?.[1];
      description = descMatch?.[1];
    }

    // Generate title from filename or content
    if (!title) {
      if (filename) {
        title = filename.split('/').pop();
      } else if (language) {
        title = `${type}-${this.artifactCounter}.${language}`;
      } else {
        title = `artifact-${this.artifactCounter}`;
      }
    }

    // Extract description from first comment if not provided
    if (!description && type === ArtifactType.CODE) {
      description = this.extractDescriptionFromCode(content, language);
    }

    const lines = content.split('\n');

    return {
      id: `artifact-${Date.now()}-${this.artifactCounter}`,
      type,
      language,
      title,
      description,
      filename: filename || title,
      lineCount: lines.length,
      characterCount: content.length,
      createdAt: new Date(),
      version: 1,
    };
  }

  /**
   * Extract description from code comments
   */
  private extractDescriptionFromCode(
    content: string,
    language?: SupportedLanguage
  ): string | undefined {
    const lines = content.split('\n').slice(0, 10); // Check first 10 lines

    // Look for common comment patterns
    for (const line of lines) {
      const trimmed = line.trim();

      // JSDoc-style: /** ... */
      const jsDocMatch = trimmed.match(/^\/\*\*?\s*(.+?)\s*\*?\*\/$/);
      if (jsDocMatch) return jsDocMatch[1];

      // Single-line comment: // ...
      const singleLineMatch = trimmed.match(/^\/\/\s*(.+)$/);
      if (singleLineMatch) return singleLineMatch[1];

      // Python/Ruby/Shell: # ...
      const hashMatch = trimmed.match(/^#\s*(.+)$/);
      if (hashMatch && ['python', 'ruby', 'bash', 'shell', 'yaml'].includes(language || '')) {
        return hashMatch[1];
      }

      // SQL/Lua: -- ...
      const dashMatch = trimmed.match(/^--\s*(.+)$/);
      if (dashMatch && ['sql'].includes(language || '')) {
        return dashMatch[1];
      }
    }

    return undefined;
  }

  /**
   * Update artifact with new content (for versioning)
   */
  updateArtifact(
    original: ExtractedArtifact,
    newContent: string
  ): ExtractedArtifact {
    return {
      ...original,
      content: newContent,
      metadata: {
        ...original.metadata,
        version: original.metadata.version + 1,
        lineCount: newContent.split('\n').length,
        characterCount: newContent.length,
      },
    };
  }

  /**
   * Reset counter (useful for testing)
   */
  resetCounter(): void {
    this.artifactCounter = 0;
  }
}
