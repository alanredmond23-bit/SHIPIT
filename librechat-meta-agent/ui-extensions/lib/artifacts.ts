/**
 * Artifact Utilities
 *
 * Functions for artifact type detection, language detection, and parsing
 */

// Supported artifact types
export type ArtifactType =
  | 'code'
  | 'html'
  | 'markdown'
  | 'mermaid'
  | 'svg'
  | 'json'
  | 'text';

// Supported code languages for syntax highlighting
export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'r'
  | 'sql'
  | 'html'
  | 'css'
  | 'scss'
  | 'less'
  | 'json'
  | 'yaml'
  | 'xml'
  | 'markdown'
  | 'bash'
  | 'shell'
  | 'powershell'
  | 'dockerfile'
  | 'graphql'
  | 'svg'
  | 'plaintext';

// Language display names
export const LANGUAGE_DISPLAY_NAMES: Record<CodeLanguage, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  r: 'R',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  markdown: 'Markdown',
  bash: 'Bash',
  shell: 'Shell',
  powershell: 'PowerShell',
  dockerfile: 'Dockerfile',
  graphql: 'GraphQL',
  svg: 'SVG',
  plaintext: 'Plain Text',
};

// File extension to language mapping
const EXTENSION_TO_LANGUAGE: Record<string, CodeLanguage> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  java: 'java',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  c: 'c',
  h: 'c',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  sc: 'scala',
  r: 'r',
  sql: 'sql',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  md: 'markdown',
  mdx: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  psm1: 'powershell',
  dockerfile: 'dockerfile',
  graphql: 'graphql',
  gql: 'graphql',
  svg: 'svg',
  txt: 'plaintext',
};

/**
 * Detect artifact type from content
 */
export function detectArtifactType(content: string, hint?: string): ArtifactType {
  const trimmed = content.trim();

  // Check for explicit hint
  if (hint) {
    const lowerHint = hint.toLowerCase();
    if (lowerHint === 'mermaid') return 'mermaid';
    if (lowerHint === 'html' || lowerHint === 'htm') return 'html';
    if (lowerHint === 'markdown' || lowerHint === 'md') return 'markdown';
    if (lowerHint === 'svg') return 'svg';
    if (lowerHint === 'json') return 'json';
  }

  // Detect Mermaid diagrams
  if (isMermaidDiagram(trimmed)) {
    return 'mermaid';
  }

  // Detect SVG
  if (trimmed.startsWith('<svg') || trimmed.includes('xmlns="http://www.w3.org/2000/svg"')) {
    return 'svg';
  }

  // Detect HTML (check for common HTML patterns)
  if (isHtml(trimmed)) {
    return 'html';
  }

  // Detect JSON
  if (isJson(trimmed)) {
    return 'json';
  }

  // Detect Markdown (if it has markdown-specific syntax)
  if (isMarkdown(trimmed)) {
    return 'markdown';
  }

  // Default to code
  return 'code';
}

/**
 * Detect code language from content or filename
 */
export function detectLanguage(content: string, filename?: string): CodeLanguage {
  // Try to detect from filename extension
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && ext in EXTENSION_TO_LANGUAGE) {
      return EXTENSION_TO_LANGUAGE[ext];
    }
  }

  const trimmed = content.trim();

  // Check for shebang
  if (trimmed.startsWith('#!')) {
    const firstLine = trimmed.split('\n')[0].toLowerCase();
    if (firstLine.includes('python')) return 'python';
    if (firstLine.includes('node') || firstLine.includes('deno') || firstLine.includes('bun')) return 'javascript';
    if (firstLine.includes('ruby')) return 'ruby';
    if (firstLine.includes('bash') || firstLine.includes('sh') || firstLine.includes('zsh')) return 'bash';
    if (firstLine.includes('php')) return 'php';
  }

  // TypeScript/JavaScript patterns
  if (/^(import|export|const|let|var|function|class|interface|type|enum)\s/.test(trimmed)) {
    if (trimmed.includes('interface ') || trimmed.includes('type ') || trimmed.includes(': ')) {
      return trimmed.includes('React') || trimmed.includes('tsx') || trimmed.includes('jsx') ? 'tsx' : 'typescript';
    }
    return trimmed.includes('React') || trimmed.includes('<') ? 'jsx' : 'javascript';
  }

  // Python patterns
  if (/^(def |class |import |from |if __name__|@\w+)/.test(trimmed) || trimmed.includes('print(')) {
    return 'python';
  }

  // Go patterns
  if (/^(package |func |import \(|type |var )/.test(trimmed)) {
    return 'go';
  }

  // Rust patterns
  if (/^(fn |impl |use |mod |pub |struct |enum |trait )/.test(trimmed)) {
    return 'rust';
  }

  // Java/Kotlin patterns
  if (/^(public |private |protected |package |fun |class |interface )/.test(trimmed)) {
    if (trimmed.includes('fun ')) return 'kotlin';
    return 'java';
  }

  // Ruby patterns
  if (/^(def |class |module |require |gem )/.test(trimmed) || trimmed.includes(' do |')) {
    return 'ruby';
  }

  // PHP patterns
  if (trimmed.startsWith('<?php') || /^\$\w+\s*=/.test(trimmed)) {
    return 'php';
  }

  // SQL patterns
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\s/i.test(trimmed)) {
    return 'sql';
  }

  // YAML patterns
  if (/^[\w-]+:\s*[\w\-"']+/m.test(trimmed) && !trimmed.includes('{')) {
    return 'yaml';
  }

  // CSS patterns
  if (/^[\.\#\w\[\*][^{]*\{[\s\S]*?\}/.test(trimmed)) {
    return trimmed.includes('@mixin') || trimmed.includes('$') ? 'scss' : 'css';
  }

  // HTML patterns
  if (/^<[a-z!]/i.test(trimmed) && trimmed.includes('>')) {
    return 'html';
  }

  // Shell patterns
  if (/^(if \[|for |while |case |echo |cd |ls |grep |awk |sed |chmod |chown )/.test(trimmed)) {
    return 'bash';
  }

  // JSON patterns
  if (isJson(trimmed)) {
    return 'json';
  }

  // Default to plaintext
  return 'plaintext';
}

/**
 * Check if content is a Mermaid diagram
 */
export function isMermaidDiagram(content: string): boolean {
  const trimmed = content.trim();
  const mermaidStarts = [
    'graph ',
    'graph\n',
    'flowchart ',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram',
    'erDiagram',
    'journey',
    'gantt',
    'pie',
    'gitGraph',
    'mindmap',
    'timeline',
    'quadrantChart',
    'requirementDiagram',
    'C4Context',
    'C4Container',
    'C4Component',
    'C4Dynamic',
    'C4Deployment',
  ];

  return mermaidStarts.some(start =>
    trimmed.startsWith(start) || trimmed.toLowerCase().startsWith(start.toLowerCase())
  );
}

/**
 * Check if content is HTML
 */
export function isHtml(content: string): boolean {
  const trimmed = content.trim();

  // Must start with a tag
  if (!trimmed.startsWith('<')) return false;

  // Check for common HTML document markers
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype')) return true;
  if (trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) return true;
  if (trimmed.startsWith('<head') || trimmed.startsWith('<body')) return true;

  // Check if it looks like a complete HTML document or component
  const hasClosingTags = /<\/[a-z][a-z0-9]*>/i.test(trimmed);
  const hasMultipleTags = (trimmed.match(/<[a-z][a-z0-9]*[\s>]/gi) || []).length > 1;

  return hasClosingTags && hasMultipleTags;
}

/**
 * Check if content is valid JSON
 */
export function isJson(content: string): boolean {
  const trimmed = content.trim();
  if ((!trimmed.startsWith('{') && !trimmed.startsWith('[')) ||
      (!trimmed.endsWith('}') && !trimmed.endsWith(']'))) {
    return false;
  }

  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if content is Markdown
 */
export function isMarkdown(content: string): boolean {
  const trimmed = content.trim();

  // Check for common Markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headers
    /^\*{3}|^_{3}|^-{3}/m, // Horizontal rules
    /^\s*[-*+]\s/m, // Unordered lists
    /^\s*\d+\.\s/m, // Ordered lists
    /\[.+\]\(.+\)/, // Links
    /!\[.+\]\(.+\)/, // Images
    /```[\s\S]*```/, // Code blocks
    /`[^`]+`/, // Inline code
    /^\s*>\s/m, // Blockquotes
    /\*\*[^*]+\*\*/, // Bold
    /\*[^*]+\*/, // Italic
    /~~[^~]+~~/, // Strikethrough
  ];

  const matchCount = markdownPatterns.filter(pattern => pattern.test(trimmed)).length;
  return matchCount >= 2;
}

/**
 * Parse a code fence from markdown
 */
export function parseCodeFence(content: string): { language?: string; code: string } | null {
  const match = content.match(/^```(\w*)\n([\s\S]*?)```$/);
  if (!match) return null;

  return {
    language: match[1] || undefined,
    code: match[2].trim(),
  };
}

/**
 * Get file extension for a language
 */
export function getExtensionForLanguage(language: CodeLanguage): string {
  const extensions: Partial<Record<CodeLanguage, string>> = {
    javascript: 'js',
    typescript: 'ts',
    jsx: 'jsx',
    tsx: 'tsx',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    go: 'go',
    rust: 'rs',
    ruby: 'rb',
    php: 'php',
    swift: 'swift',
    kotlin: 'kt',
    scala: 'scala',
    r: 'r',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    xml: 'xml',
    markdown: 'md',
    bash: 'sh',
    shell: 'sh',
    powershell: 'ps1',
    dockerfile: 'dockerfile',
    graphql: 'graphql',
    svg: 'svg',
    plaintext: 'txt',
  };

  return extensions[language] || 'txt';
}

/**
 * Get MIME type for artifact download
 */
export function getMimeType(type: ArtifactType, language?: CodeLanguage): string {
  switch (type) {
    case 'html':
      return 'text/html';
    case 'svg':
      return 'image/svg+xml';
    case 'json':
      return 'application/json';
    case 'markdown':
      return 'text/markdown';
    case 'mermaid':
      return 'text/plain';
    case 'code':
      if (language === 'html') return 'text/html';
      if (language === 'css' || language === 'scss' || language === 'less') return 'text/css';
      if (language === 'json') return 'application/json';
      if (language === 'xml') return 'application/xml';
      if (language === 'svg') return 'image/svg+xml';
      return 'text/plain';
    default:
      return 'text/plain';
  }
}

/**
 * Format code with basic indentation normalization
 */
export function normalizeIndentation(code: string): string {
  const lines = code.split('\n');

  // Find minimum indentation (ignoring empty lines)
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const indent = line.match(/^(\s*)/)?.[1].length || 0;
    minIndent = Math.min(minIndent, indent);
  }

  if (minIndent === Infinity || minIndent === 0) {
    return code;
  }

  // Remove minimum indentation from all lines
  return lines
    .map(line => line.slice(minIndent))
    .join('\n');
}

/**
 * Generate a download filename for an artifact
 */
export function generateFilename(title: string, type: ArtifactType, language?: CodeLanguage): string {
  // Clean the title for use as filename
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  let extension: string;

  switch (type) {
    case 'html':
      extension = 'html';
      break;
    case 'svg':
      extension = 'svg';
      break;
    case 'json':
      extension = 'json';
      break;
    case 'markdown':
      extension = 'md';
      break;
    case 'mermaid':
      extension = 'mmd';
      break;
    case 'code':
      extension = language ? getExtensionForLanguage(language) : 'txt';
      break;
    default:
      extension = 'txt';
  }

  return `${cleanTitle || 'artifact'}.${extension}`;
}
