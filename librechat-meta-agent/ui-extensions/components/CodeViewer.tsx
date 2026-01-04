'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Code2, Layers, Zap } from 'lucide-react';

interface CodeSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  language: string;
  code: string;
  category: 'api' | 'feature' | 'integration';
}

interface CodeViewerProps {
  sections: CodeSection[];
  className?: string;
}

// Code highlighting with basic syntax coloring
function highlightCode(code: string, language: string): React.ReactNode {
  const lines = code.split('\n');

  return lines.map((line, i) => {
    let highlighted = line
      // Keywords
      .replace(
        /\b(const|let|var|function|async|await|return|if|else|try|catch|import|export|from|class|extends|new|throw|typeof|interface|type)\b/g,
        '<span class="text-[#C792EA]">$1</span>'
      )
      // Strings
      .replace(
        /(["'`])(?:(?=(\\?))\2.)*?\1/g,
        '<span class="text-[#C3E88D]">$&</span>'
      )
      // Numbers
      .replace(
        /\b(\d+)\b/g,
        '<span class="text-[#F78C6C]">$1</span>'
      )
      // Comments
      .replace(
        /(\/\/.*$)/gm,
        '<span class="text-[var(--text-muted)]">$1</span>'
      )
      // Functions
      .replace(
        /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
        '<span class="text-[#82AAFF]">$1</span>('
      );

    return (
      <div key={i} className="flex">
        <span className="select-none w-8 text-right pr-4 text-[var(--text-muted)] opacity-50 text-xs">
          {i + 1}
        </span>
        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    );
  });
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 btn-icon btn-icon-sm opacity-60 hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
      </button>
      <div className="code-viewer overflow-x-auto">
        <pre className="text-sm leading-relaxed">
          <code>{highlightCode(code, language)}</code>
        </pre>
      </div>
    </div>
  );
}

export function CodeViewer({ sections, className = '' }: CodeViewerProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSection(prev => (prev === id ? null : id));
  };

  const getCategoryStyles = (category: CodeSection['category']) => {
    switch (category) {
      case 'api':
        return 'bg-[rgba(31,183,180,0.1)] border-[var(--accent-500)]';
      case 'feature':
        return 'bg-[rgba(168,85,247,0.1)] border-[#A855F7]';
      case 'integration':
        return 'bg-[rgba(59,130,246,0.1)] border-[#3B82F6]';
      default:
        return 'bg-[var(--bg-3)] border-[var(--border-default)]';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {sections.map((section) => (
        <div
          key={section.id}
          className="glass-panel overflow-hidden"
        >
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-[var(--bg-3)] transition-colors"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getCategoryStyles(section.category)}`}
            >
              {section.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[var(--text-primary)] truncate">
                {section.title}
              </h3>
              <p className="text-sm text-[var(--text-muted)] truncate">
                {section.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-accent text-xs">
                {section.language}
              </span>
              {expandedSection === section.id ? (
                <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
              )}
            </div>
          </button>

          {expandedSection === section.id && (
            <div className="border-t border-[var(--border-subtle)] p-4">
              <CodeBlock code={section.code} language={section.language} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Pre-defined code sections for the Settings page
export const CODE_SECTIONS: CodeSection[] = [
  {
    id: 'chat-api',
    title: 'Chat API Handler',
    description: 'Multi-provider chat routing and streaming',
    icon: <Zap className="w-5 h-5 text-[var(--accent-500)]" />,
    language: 'TypeScript',
    category: 'api',
    code: `// app/api/chat/route.ts
export async function POST(request: NextRequest) {
  const { messages, model, stream = true, tools = [] } = body;

  // Determine provider from model ID
  const isAnthropic = model?.startsWith('claude');
  const isOpenAI = model?.startsWith('gpt') || model?.startsWith('o1');
  const isGoogle = model?.startsWith('gemini');
  const isDeepSeek = model?.startsWith('deepseek');

  if (isAnthropic) {
    return handleAnthropicChat(messages, model, stream, tools);
  } else if (isOpenAI) {
    return handleOpenAIChat(messages, model, stream, tools);
  } else if (isGoogle) {
    return handleGoogleChat(messages, model, stream, tools);
  } else if (isDeepSeek) {
    return handleDeepSeekChat(messages, model, stream, tools);
  }
}`,
  },
  {
    id: 'anthropic-streaming',
    title: 'Anthropic Streaming',
    description: 'Server-sent events for Claude models',
    icon: <Layers className="w-5 h-5 text-[#A855F7]" />,
    language: 'TypeScript',
    category: 'feature',
    code: `// Streaming response with Anthropic SDK
const streamResponse = new ReadableStream({
  async start(controller) {
    const response = await anthropic.messages.create({
      model: model || 'claude-opus-4-5-20251101',
      max_tokens: 8192,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    });

    for await (const event of response) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          const data = JSON.stringify({ content: delta.text });
          controller.enqueue(encoder.encode(\`data: \${data}\\n\\n\`));
        }
      }
    }

    controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
    controller.close();
  },
});`,
  },
  {
    id: 'theme-provider',
    title: 'Theme Provider',
    description: 'Dark/light mode with localStorage persistence',
    icon: <Code2 className="w-5 h-5 text-[#3B82F6]" />,
    language: 'TypeScript',
    category: 'integration',
    code: `// components/ThemeProvider.tsx
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('meta-agent-theme') as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    localStorage.setItem('meta-agent-theme', theme);
  }, [theme, mounted]);
}`,
  },
  {
    id: 'deep-reasoning',
    title: 'Deep Reasoning (o1)',
    description: 'OpenAI o1 reasoning model integration',
    icon: <Zap className="w-5 h-5 text-[var(--accent-500)]" />,
    language: 'TypeScript',
    category: 'api',
    code: `// Deep reasoning with OpenAI o1 models
async function handleOpenAIChat(
  messages: Array<{ role: string; content: string }>,
  model: string,
  stream: boolean,
  tools: string[]
) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${OPENAI_API_KEY}\`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o', // or 'o1' for reasoning
      messages: [systemMessage, ...messages],
      stream,
    }),
  });

  // Stream or return response
  return stream
    ? new Response(response.body, { headers: streamHeaders })
    : new Response(JSON.stringify({ content: data.choices[0]?.message?.content }));
}`,
  },
  {
    id: 'gemini-integration',
    title: 'Gemini Integration',
    description: 'Google Gemini 2.0 Flash & Pro models',
    icon: <Layers className="w-5 h-5 text-[#A855F7]" />,
    language: 'TypeScript',
    category: 'integration',
    code: `// Google Gemini API integration
async function handleGoogleChat(messages, model, stream, tools) {
  const geminiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    \`https://generativelanguage.googleapis.com/v1beta/models/\${model}:generateContent?key=\${GOOGLE_API_KEY}\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 8192 },
      }),
    }
  );

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return new Response(JSON.stringify({ content }));
}`,
  },
  {
    id: 'deepseek-r1',
    title: 'DeepSeek R1 Reasoner',
    description: 'DeepSeek reasoning model via OpenAI-compatible API',
    icon: <Code2 className="w-5 h-5 text-[#3B82F6]" />,
    language: 'TypeScript',
    category: 'api',
    code: `// DeepSeek uses OpenAI-compatible API
async function handleDeepSeekChat(messages, model, stream, tools) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${DEEPSEEK_API_KEY}\`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat', // or 'deepseek-reasoner' for R1
      messages: [systemMessage, ...messages],
      stream,
    }),
  });

  return stream
    ? new Response(response.body, { headers: streamHeaders })
    : new Response(JSON.stringify({ content: data.choices[0]?.message?.content }));
}`,
  },
];

export default CodeViewer;
