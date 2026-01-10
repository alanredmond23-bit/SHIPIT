# Mission Control

> Your AI-powered workspace for intelligent conversations, deep research, and productivity automation.

[![Next.js](https://img.shields.io/badge/Next.js-14.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

Mission Control is a comprehensive AI workspace that brings together the best AI models, research tools, and productivity features in one beautiful interface. Built with Next.js 14 and designed with the Night-Light Teal design system.

### Key Features

- **Multi-Provider AI**: Claude, GPT-5, Gemini 2.0, DeepSeek R1, Llama 4, and more
- **Extended Thinking**: Watch AI reasoning unfold step-by-step
- **Deep Research**: Multi-source analysis with citations
- **Voice Chat**: Real-time voice conversations
- **Image & Video Generation**: Create visual content with AI
- **Custom Personas**: Build specialized AI personalities
- **Decision Frameworks**: RAPID, SPADE, and more
- **MCP Tools**: Extend capabilities with Model Context Protocol
- **Idea to Launch**: Ship products with AI guidance

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- API key for at least one AI provider

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/librechat-meta-agent.git
cd librechat-meta-agent/ui-extensions

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file:

```env
# Required: At least one AI provider
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Additional providers
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...

# Optional: Authentication (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

---

## Features

### Chat Interface

Converse with state-of-the-art AI models with streaming responses, markdown rendering, and code syntax highlighting.

```
/chat - Main chat interface
```

### Extended Thinking

Watch the AI's reasoning process unfold in real-time with tree visualization.

```
/thinking - Extended reasoning mode
```

### Deep Research

Comprehensive multi-source analysis with configurable depth and automatic citations.

```
/research - Research assistant
```

### Personas

Create custom AI personalities with tailored system prompts and behaviors.

```
/personas - Persona management
```

### Decision Frameworks

Make better decisions with structured frameworks like RAPID, SPADE, and Weighted Matrix.

```
/decisions - Framework wizard
```

### Media Generation

Create images and videos with AI.

```
/images - Image generation (DALL-E, Stable Diffusion)
/videos - Video generation (Runway, Pika)
```

### Voice Chat

Have spoken conversations with AI using speech-to-text and text-to-speech.

```
/voice - Voice interface
```

### MCP Tools

Extend AI capabilities with Model Context Protocol servers.

```
/tools - MCP server management
```

### Workflows

Build automated multi-step AI workflows with a visual canvas.

```
/workflows - Workflow builder
```

### Benchmarks

Compare AI model performance with real-time data.

```
/benchmarks - Performance dashboard
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.3 |
| Styling | Tailwind CSS 3.4 |
| State | React Query |
| Auth | Supabase |
| AI SDKs | Anthropic, OpenAI, Google AI |
| Testing | Jest, Playwright, React Testing Library |
| Icons | Lucide React |

---

## Project Structure

```
ui-extensions/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── chat/              # Chat interface
│   ├── thinking/          # Extended thinking
│   ├── research/          # Deep research
│   ├── personas/          # Persona management
│   ├── decisions/         # Decision frameworks
│   └── ...
├── components/            # React components
│   ├── Auth/             # Authentication
│   ├── Chat/             # Chat UI
│   ├── Research/         # Research mode
│   ├── Personas/         # Persona builder
│   ├── Voice/            # Voice chat
│   ├── ui/               # UI primitives
│   └── ...
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and clients
│   ├── auth/             # Auth helpers
│   └── realtime/         # WebSocket client
├── styles/               # Global styles
├── types/                # TypeScript types
├── docs/                 # Documentation
└── e2e/                  # End-to-end tests
```

---

## Available Scripts

```bash
# Development
npm run dev          # Start dev server on port 3000

# Building
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm run test         # Run unit tests
npm run test:watch   # Watch mode
npm run test:e2e     # Run Playwright tests
npm run test:e2e:ui  # Playwright with UI

# Code Quality
npm run lint         # Run ESLint
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](docs/USER_GUIDE.md) | Complete usage documentation |
| [Keyboard Shortcuts](docs/KEYBOARD_SHORTCUTS.md) | All keyboard shortcuts |
| [API Reference](docs/API.md) | API endpoint documentation |
| [Changelog](CHANGELOG.md) | Version history |
| [Quick Start](QUICK_START.md) | Auth setup guide |

---

## Authentication

Mission Control uses Supabase for authentication. See [QUICK_START.md](QUICK_START.md) for setup instructions.

Supported methods:
- Email/Password
- Google OAuth
- GitHub OAuth
- Magic Link

---

## AI Providers

| Provider | Models | Environment Variable |
|----------|--------|---------------------|
| Anthropic | Claude Opus 4.5, Sonnet 4, 3.5 Sonnet/Haiku | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-5.2 Pro, GPT-5, o3, o1 Pro, GPT-4o | `OPENAI_API_KEY` |
| Google | Gemini 2.0 Ultra/Pro/Flash | `GOOGLE_API_KEY` |
| DeepSeek | R1, R1 Zero, V3, Chat | `DEEPSEEK_API_KEY` |
| Meta | Llama 4 405B/70B | `META_API_KEY` |
| Mistral | Large 2, Codestral | `MISTRAL_API_KEY` |
| xAI | Grok 3, Grok 2 | `XAI_API_KEY` |

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Write TypeScript with strict mode
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

### Code of Conduct

Please be respectful and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude models
- [OpenAI](https://openai.com) for GPT models
- [Google](https://ai.google) for Gemini models
- [Vercel](https://vercel.com) for Next.js
- [Supabase](https://supabase.com) for authentication
- All our contributors and users

---

## Support

- **Documentation**: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/librechat-meta-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/librechat-meta-agent/discussions)

---

Made with care by the Mission Control team.
