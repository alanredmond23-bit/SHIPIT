// vitest import removed - Jest globals used
import {
  detectArtifactType,
  detectLanguage,
  isMermaidDiagram,
  isHtml,
  isJson,
  isMarkdown,
  parseCodeFence,
  getExtensionForLanguage,
  getMimeType,
  normalizeIndentation,
  generateFilename,
  LANGUAGE_DISPLAY_NAMES,
} from '@/lib/artifacts';

describe('detectArtifactType', () => {
  describe('Mermaid detection', () => {
    it('should detect graph diagrams', () => {
      expect(detectArtifactType('graph TD\n  A --> B')).toBe('mermaid');
      expect(detectArtifactType('graph LR\n  A --> B')).toBe('mermaid');
    });

    it('should detect flowchart diagrams', () => {
      expect(detectArtifactType('flowchart TD\n  A --> B')).toBe('mermaid');
    });

    it('should detect sequence diagrams', () => {
      expect(detectArtifactType('sequenceDiagram\n  Alice->>Bob: Hello')).toBe('mermaid');
    });

    it('should detect class diagrams', () => {
      expect(detectArtifactType('classDiagram\n  class Animal')).toBe('mermaid');
    });

    it('should detect state diagrams', () => {
      expect(detectArtifactType('stateDiagram-v2\n  [*] --> Active')).toBe('mermaid');
    });

    it('should detect ER diagrams', () => {
      expect(detectArtifactType('erDiagram\n  CUSTOMER ||--o{ ORDER : places')).toBe('mermaid');
    });

    it('should detect gantt charts', () => {
      expect(detectArtifactType('gantt\n  title A Gantt Diagram')).toBe('mermaid');
    });

    it('should detect pie charts', () => {
      expect(detectArtifactType('pie\n  "Dogs" : 386')).toBe('mermaid');
    });
  });

  describe('SVG detection', () => {
    it('should detect SVG by opening tag', () => {
      expect(detectArtifactType('<svg width="100" height="100"></svg>')).toBe('svg');
    });

    it('should detect SVG by xmlns', () => {
      expect(detectArtifactType('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe('svg');
    });
  });

  describe('HTML detection', () => {
    it('should detect full HTML documents', () => {
      expect(detectArtifactType('<!DOCTYPE html><html><head></head><body></body></html>')).toBe('html');
    });

    it('should detect HTML components', () => {
      expect(detectArtifactType('<div class="container"><p>Hello</p></div>')).toBe('html');
    });
  });

  describe('JSON detection', () => {
    it('should detect JSON objects', () => {
      expect(detectArtifactType('{"key": "value"}')).toBe('json');
    });

    it('should detect JSON arrays', () => {
      expect(detectArtifactType('[1, 2, 3]')).toBe('json');
    });

    it('should detect complex JSON', () => {
      expect(detectArtifactType('{"users": [{"name": "John"}]}')).toBe('json');
    });
  });

  describe('Markdown detection', () => {
    it('should detect markdown with headers and links', () => {
      const md = '# Title\n\nSome text with a [link](http://example.com)';
      expect(detectArtifactType(md)).toBe('markdown');
    });

    it('should detect markdown with code blocks', () => {
      const md = '# Header\n\n```javascript\nconsole.log("hello");\n```';
      expect(detectArtifactType(md)).toBe('markdown');
    });
  });

  describe('Hint override', () => {
    it('should respect mermaid hint', () => {
      expect(detectArtifactType('some content', 'mermaid')).toBe('mermaid');
    });

    it('should respect html hint', () => {
      expect(detectArtifactType('some content', 'html')).toBe('html');
    });

    it('should respect markdown hint', () => {
      expect(detectArtifactType('some content', 'md')).toBe('markdown');
    });

    it('should respect svg hint', () => {
      expect(detectArtifactType('some content', 'svg')).toBe('svg');
    });

    it('should respect json hint', () => {
      expect(detectArtifactType('some content', 'json')).toBe('json');
    });
  });

  describe('Default to code', () => {
    it('should default to code for unknown content', () => {
      expect(detectArtifactType('const x = 5;')).toBe('code');
    });
  });
});

describe('detectLanguage', () => {
  describe('Filename detection', () => {
    it('should detect JavaScript by extension', () => {
      expect(detectLanguage('', 'script.js')).toBe('javascript');
      expect(detectLanguage('', 'module.mjs')).toBe('javascript');
    });

    it('should detect TypeScript by extension', () => {
      expect(detectLanguage('', 'app.ts')).toBe('typescript');
      expect(detectLanguage('', 'component.tsx')).toBe('tsx');
    });

    it('should detect Python by extension', () => {
      expect(detectLanguage('', 'script.py')).toBe('python');
    });

    it('should detect Go by extension', () => {
      expect(detectLanguage('', 'main.go')).toBe('go');
    });

    it('should detect Rust by extension', () => {
      expect(detectLanguage('', 'lib.rs')).toBe('rust');
    });

    it('should detect various file types', () => {
      expect(detectLanguage('', 'style.css')).toBe('css');
      expect(detectLanguage('', 'style.scss')).toBe('scss');
      expect(detectLanguage('', 'data.json')).toBe('json');
      expect(detectLanguage('', 'config.yaml')).toBe('yaml');
      expect(detectLanguage('', 'config.yml')).toBe('yaml');
      expect(detectLanguage('', 'README.md')).toBe('markdown');
      expect(detectLanguage('', 'script.sh')).toBe('bash');
      expect(detectLanguage('', 'Dockerfile')).toBe('dockerfile');
    });
  });

  describe('Shebang detection', () => {
    it('should detect Python by shebang', () => {
      expect(detectLanguage('#!/usr/bin/env python\nprint("hello")')).toBe('python');
    });

    it('should detect Node.js by shebang', () => {
      expect(detectLanguage('#!/usr/bin/env node\nconsole.log("hello")')).toBe('javascript');
    });

    it('should detect Bash by shebang', () => {
      expect(detectLanguage('#!/bin/bash\necho "hello"')).toBe('bash');
    });

    it('should detect Ruby by shebang', () => {
      expect(detectLanguage('#!/usr/bin/env ruby\nputs "hello"')).toBe('ruby');
    });
  });

  describe('Content-based detection', () => {
    it('should detect TypeScript by patterns', () => {
      expect(detectLanguage('interface User { name: string; }')).toBe('typescript');
      expect(detectLanguage('type Props = { value: number }')).toBe('typescript');
    });

    it('should detect TSX by React patterns', () => {
      expect(detectLanguage('import React from "react"\nconst App = () => <div/>')).toBe('tsx');
    });

    it('should detect JavaScript by patterns', () => {
      expect(detectLanguage('const x = 5;')).toBe('javascript');
      expect(detectLanguage('function foo() {}')).toBe('javascript');
    });

    it('should detect Python by patterns', () => {
      expect(detectLanguage('def hello():\n    print("hi")')).toBe('python');
      expect(detectLanguage('class MyClass:\n    pass')).toBe('python');
      expect(detectLanguage('import os\nfrom sys import argv')).toBe('python');
    });

    it('should detect Go by patterns', () => {
      expect(detectLanguage('package main\nfunc main() {}')).toBe('go');
    });

    it('should detect Rust by patterns', () => {
      expect(detectLanguage('fn main() {\n    println!("Hello");\n}')).toBe('rust');
      expect(detectLanguage('use std::io;')).toBe('rust');
    });

    it('should detect Java by patterns', () => {
      expect(detectLanguage('public class Main {\n    public static void main(String[] args) {}\n}')).toBe('java');
    });

    it('should detect Kotlin by patterns', () => {
      expect(detectLanguage('fun main() {\n    println("Hello")\n}')).toBe('kotlin');
    });

    it('should detect Ruby by patterns', () => {
      expect(detectLanguage('def greet\n  puts "hello"\nend')).toBe('ruby');
      expect(detectLanguage('require "json"')).toBe('ruby');
    });

    it('should detect PHP by patterns', () => {
      expect(detectLanguage('<?php\necho "Hello";\n?>')).toBe('php');
    });

    it('should detect SQL by patterns', () => {
      expect(detectLanguage('SELECT * FROM users WHERE id = 1;')).toBe('sql');
      expect(detectLanguage('INSERT INTO users (name) VALUES ("John");')).toBe('sql');
      expect(detectLanguage('CREATE TABLE users (id INT);')).toBe('sql');
    });

    it('should detect YAML by patterns', () => {
      expect(detectLanguage('name: John\nage: 30')).toBe('yaml');
    });

    it('should detect CSS by patterns', () => {
      expect(detectLanguage('.class {\n  color: red;\n}')).toBe('css');
      expect(detectLanguage('#id { margin: 0; }')).toBe('css');
    });

    it('should detect SCSS by patterns', () => {
      expect(detectLanguage('$primary: blue;\n.class { color: $primary; }')).toBe('scss');
    });

    it('should detect HTML by patterns', () => {
      expect(detectLanguage('<div>Hello</div>')).toBe('html');
    });

    it('should detect Shell by patterns', () => {
      expect(detectLanguage('if [ -f file ]; then\n  echo "exists"\nfi')).toBe('bash');
      expect(detectLanguage('for i in *.txt; do echo $i; done')).toBe('bash');
    });

    it('should detect JSON by structure', () => {
      expect(detectLanguage('{"key": "value"}')).toBe('json');
    });

    it('should default to plaintext', () => {
      expect(detectLanguage('some random text without patterns')).toBe('plaintext');
    });
  });
});

describe('isMermaidDiagram', () => {
  it('should return true for valid mermaid diagrams', () => {
    expect(isMermaidDiagram('graph TD')).toBe(true);
    expect(isMermaidDiagram('flowchart LR')).toBe(true);
    expect(isMermaidDiagram('sequenceDiagram')).toBe(true);
    expect(isMermaidDiagram('classDiagram')).toBe(true);
    expect(isMermaidDiagram('stateDiagram')).toBe(true);
    expect(isMermaidDiagram('erDiagram')).toBe(true);
    expect(isMermaidDiagram('journey')).toBe(true);
    expect(isMermaidDiagram('gantt')).toBe(true);
    expect(isMermaidDiagram('pie')).toBe(true);
    expect(isMermaidDiagram('gitGraph')).toBe(true);
    expect(isMermaidDiagram('mindmap')).toBe(true);
    expect(isMermaidDiagram('timeline')).toBe(true);
    expect(isMermaidDiagram('quadrantChart')).toBe(true);
    expect(isMermaidDiagram('requirementDiagram')).toBe(true);
  });

  it('should return false for non-mermaid content', () => {
    expect(isMermaidDiagram('const x = 5;')).toBe(false);
    expect(isMermaidDiagram('<div>Hello</div>')).toBe(false);
    expect(isMermaidDiagram('{"key": "value"}')).toBe(false);
  });

  it('should be case-insensitive for some patterns', () => {
    expect(isMermaidDiagram('GRAPH TD')).toBe(true);
    expect(isMermaidDiagram('Graph TD')).toBe(true);
  });
});

describe('isHtml', () => {
  it('should return true for DOCTYPE', () => {
    expect(isHtml('<!DOCTYPE html><html></html>')).toBe(true);
  });

  it('should return true for html tag', () => {
    expect(isHtml('<html><body></body></html>')).toBe(true);
  });

  it('should return true for complete HTML structures', () => {
    expect(isHtml('<div class="test"><p>Hello</p></div>')).toBe(true);
  });

  it('should return false for non-HTML content', () => {
    expect(isHtml('const x = 5;')).toBe(false);
    expect(isHtml('Hello World')).toBe(false);
  });

  it('should return false for partial tags', () => {
    expect(isHtml('<div')).toBe(false);
  });
});

describe('isJson', () => {
  it('should return true for valid JSON objects', () => {
    expect(isJson('{}')).toBe(true);
    expect(isJson('{"key": "value"}')).toBe(true);
    expect(isJson('{"nested": {"deep": true}}')).toBe(true);
  });

  it('should return true for valid JSON arrays', () => {
    expect(isJson('[]')).toBe(true);
    expect(isJson('[1, 2, 3]')).toBe(true);
    expect(isJson('[{"id": 1}]')).toBe(true);
  });

  it('should return false for invalid JSON', () => {
    expect(isJson('{key: value}')).toBe(false);
    expect(isJson('{"unclosed"')).toBe(false);
    expect(isJson('not json')).toBe(false);
  });

  it('should return false for non-JSON content', () => {
    expect(isJson('const x = {};')).toBe(false);
    expect(isJson('function() {}')).toBe(false);
  });
});

describe('isMarkdown', () => {
  it('should return true for content with headers', () => {
    expect(isMarkdown('# Header\n\nSome text with `code`')).toBe(true);
    expect(isMarkdown('## Subheader\n\n- List item')).toBe(true);
  });

  it('should return true for content with lists and links', () => {
    expect(isMarkdown('- Item 1\n- Item 2\n\n[Link](http://example.com)')).toBe(true);
  });

  it('should return true for content with code blocks', () => {
    expect(isMarkdown('# Title\n\n```js\ncode\n```')).toBe(true);
  });

  it('should return true for content with formatting', () => {
    expect(isMarkdown('**Bold** and *italic* text\n\n- List')).toBe(true);
  });

  it('should return false for plain text', () => {
    expect(isMarkdown('Just some plain text.')).toBe(false);
  });

  it('should return false for code', () => {
    expect(isMarkdown('const x = 5;')).toBe(false);
  });
});

describe('parseCodeFence', () => {
  it('should parse code fence with language', () => {
    const result = parseCodeFence('```javascript\nconsole.log("hello");\n```');
    expect(result).toEqual({
      language: 'javascript',
      code: 'console.log("hello");',
    });
  });

  it('should parse code fence without language', () => {
    const result = parseCodeFence('```\nsome code\n```');
    expect(result).toEqual({
      language: undefined,
      code: 'some code',
    });
  });

  it('should return null for non-code-fence content', () => {
    expect(parseCodeFence('not a code fence')).toBeNull();
    expect(parseCodeFence('```unclosed')).toBeNull();
  });

  it('should handle multiline code', () => {
    const code = '```python\ndef hello():\n    print("hi")\n```';
    const result = parseCodeFence(code);
    expect(result).toEqual({
      language: 'python',
      code: 'def hello():\n    print("hi")',
    });
  });
});

describe('getExtensionForLanguage', () => {
  it('should return correct extensions for common languages', () => {
    expect(getExtensionForLanguage('javascript')).toBe('js');
    expect(getExtensionForLanguage('typescript')).toBe('ts');
    expect(getExtensionForLanguage('python')).toBe('py');
    expect(getExtensionForLanguage('go')).toBe('go');
    expect(getExtensionForLanguage('rust')).toBe('rs');
    expect(getExtensionForLanguage('ruby')).toBe('rb');
    expect(getExtensionForLanguage('java')).toBe('java');
    expect(getExtensionForLanguage('csharp')).toBe('cs');
    expect(getExtensionForLanguage('cpp')).toBe('cpp');
    expect(getExtensionForLanguage('c')).toBe('c');
  });

  it('should return correct extensions for web languages', () => {
    expect(getExtensionForLanguage('html')).toBe('html');
    expect(getExtensionForLanguage('css')).toBe('css');
    expect(getExtensionForLanguage('scss')).toBe('scss');
    expect(getExtensionForLanguage('json')).toBe('json');
    expect(getExtensionForLanguage('yaml')).toBe('yaml');
    expect(getExtensionForLanguage('xml')).toBe('xml');
  });

  it('should return correct extensions for shell languages', () => {
    expect(getExtensionForLanguage('bash')).toBe('sh');
    expect(getExtensionForLanguage('shell')).toBe('sh');
    expect(getExtensionForLanguage('powershell')).toBe('ps1');
  });

  it('should return txt for unknown languages', () => {
    expect(getExtensionForLanguage('plaintext')).toBe('txt');
  });
});

describe('getMimeType', () => {
  it('should return correct MIME types for artifact types', () => {
    expect(getMimeType('html')).toBe('text/html');
    expect(getMimeType('svg')).toBe('image/svg+xml');
    expect(getMimeType('json')).toBe('application/json');
    expect(getMimeType('markdown')).toBe('text/markdown');
    expect(getMimeType('mermaid')).toBe('text/plain');
    expect(getMimeType('text')).toBe('text/plain');
  });

  it('should return correct MIME types for code with language', () => {
    expect(getMimeType('code', 'html')).toBe('text/html');
    expect(getMimeType('code', 'css')).toBe('text/css');
    expect(getMimeType('code', 'json')).toBe('application/json');
    expect(getMimeType('code', 'xml')).toBe('application/xml');
    expect(getMimeType('code', 'svg')).toBe('image/svg+xml');
  });

  it('should return text/plain for unknown code languages', () => {
    expect(getMimeType('code', 'javascript')).toBe('text/plain');
    expect(getMimeType('code', 'python')).toBe('text/plain');
  });
});

describe('normalizeIndentation', () => {
  it('should remove common leading indentation', () => {
    const code = '    line1\n    line2\n    line3';
    expect(normalizeIndentation(code)).toBe('line1\nline2\nline3');
  });

  it('should preserve relative indentation', () => {
    const code = '    line1\n        line2\n    line3';
    expect(normalizeIndentation(code)).toBe('line1\n    line2\nline3');
  });

  it('should handle mixed indentation', () => {
    const code = '  a\n    b\n  c';
    expect(normalizeIndentation(code)).toBe('a\n  b\nc');
  });

  it('should handle empty lines', () => {
    const code = '    line1\n\n    line2';
    expect(normalizeIndentation(code)).toBe('line1\n\nline2');
  });

  it('should return original if no indentation', () => {
    const code = 'line1\nline2';
    expect(normalizeIndentation(code)).toBe(code);
  });
});

describe('generateFilename', () => {
  it('should generate filename for different artifact types', () => {
    expect(generateFilename('My Component', 'html')).toBe('my-component.html');
    expect(generateFilename('Test SVG', 'svg')).toBe('test-svg.svg');
    expect(generateFilename('Data File', 'json')).toBe('data-file.json');
    expect(generateFilename('Readme', 'markdown')).toBe('readme.md');
    expect(generateFilename('Diagram', 'mermaid')).toBe('diagram.mmd');
  });

  it('should generate filename for code with language', () => {
    expect(generateFilename('Utils', 'code', 'javascript')).toBe('utils.js');
    expect(generateFilename('Utils', 'code', 'typescript')).toBe('utils.ts');
    expect(generateFilename('Script', 'code', 'python')).toBe('script.py');
  });

  it('should clean special characters from title', () => {
    expect(generateFilename('My! @Component# $Test', 'html')).toBe('my-component-test.html');
    expect(generateFilename('File (v2).ts', 'code', 'typescript')).toBe('file-v2-ts.ts');
  });

  it('should truncate long titles', () => {
    const longTitle = 'a'.repeat(100);
    const filename = generateFilename(longTitle, 'html');
    expect(filename.length).toBeLessThanOrEqual(55); // 50 chars + extension
  });

  it('should use default name for empty title', () => {
    expect(generateFilename('', 'html')).toBe('artifact.html');
    expect(generateFilename('   ', 'json')).toBe('artifact.json');
  });
});

describe('LANGUAGE_DISPLAY_NAMES', () => {
  it('should have display names for all supported languages', () => {
    expect(LANGUAGE_DISPLAY_NAMES.javascript).toBe('JavaScript');
    expect(LANGUAGE_DISPLAY_NAMES.typescript).toBe('TypeScript');
    expect(LANGUAGE_DISPLAY_NAMES.python).toBe('Python');
    expect(LANGUAGE_DISPLAY_NAMES.rust).toBe('Rust');
    expect(LANGUAGE_DISPLAY_NAMES.go).toBe('Go');
    expect(LANGUAGE_DISPLAY_NAMES.csharp).toBe('C#');
    expect(LANGUAGE_DISPLAY_NAMES.cpp).toBe('C++');
  });
});
