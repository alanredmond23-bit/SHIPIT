# Joanna - AI Personal Assistant

> **Your intelligent personal assistant for task management, workflow automation, and AI-powered productivity**

Joanna is a next-generation AI assistant designed specifically for solo entrepreneurs and one-person teams. It combines intelligent task management, customizable workflow automation, and multi-agent AI orchestration to help you stay organized and productive.

## ✨ Features

### 🤖 Multi-Agent AI System
- **Specialized AI Agents**: Task Manager, Workflow Orchestrator, Research Assistant, and more
- **Intelligent Routing**: Automatically selects the right agent for your request
- **Context-Aware**: Remembers your preferences and learns from interactions
- **Semantic Search**: Vector-powered knowledge base with intelligent retrieval

### ✅ Intelligent Task Management
- **Smart Prioritization**: AI-powered task priority suggestions
- **Dependency Detection**: Automatically identifies task relationships
- **Hierarchical Tasks**: Support for subtasks and task breakdowns
- **Deadline Tracking**: Never miss important due dates

### 🔄 Workflow Automation
- **Visual Workflow Builder**: Create state-machine based workflows
- **Multiple Triggers**: Manual, scheduled, event-based, or AI-suggested
- **Conditional Logic**: Smart branching based on context
- **Execution Logging**: Complete audit trail of all workflow runs

### 💾 Supabase Backend
- **PostgreSQL Database**: Robust, scalable data storage
- **Row Level Security**: Your data is protected and isolated
- **Real-time Updates**: Live synchronization across devices
- **S3-Compatible Storage**: File uploads with metadata indexing

### 🧠 Vector-Powered Knowledge Base
- **Semantic Search**: Find information by meaning, not just keywords
- **Document Embeddings**: AI-powered document understanding
- **Context Retrieval**: Relevant information surfaces automatically

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                      │
│         Next.js 14 + TypeScript + React         │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│              Edge Functions (API)               │
│  • task-processor  • workflow-engine           │
│  • ai-orchestrator • knowledge-indexer          │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│            Supabase PostgreSQL                  │
│  • Tasks  • Workflows  • Agents                │
│  • Conversations  • Knowledge  • Storage        │
│  • pgvector for embeddings                     │
└─────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm 9+
- **Supabase Account** ([Sign up free](https://supabase.com))
- **OpenAI API Key** (for embeddings and GPT models)
- **Anthropic API Key** (optional, for Claude models)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/alanredmond23-bit/SHIPIT.git
   cd SHIPIT
   ```

2. **Run setup script**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Run database migrations**
   ```bash
   npm run supabase:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
JOANNA/
├── .github/workflows/      # CI/CD pipelines
├── supabase/
│   ├── migrations/         # Database migrations
│   ├── schemas/           # Declarative schemas
│   ├── functions/         # Edge Functions
│   │   ├── task-processor/
│   │   ├── workflow-engine/
│   │   └── ai-orchestrator/
│   └── config.toml        # Supabase configuration
├── src/
│   ├── core/              # Core AI logic
│   │   ├── agents/        # AI agent implementations
│   │   └── orchestrator/  # Multi-agent coordination
│   ├── workflows/         # Workflow engine
│   ├── tasks/             # Task management
│   └── api/               # API routes
├── lib/
│   ├── supabase/          # Supabase clients
│   ├── ai/                # AI integrations (OpenAI, Anthropic)
│   └── utils/             # Shared utilities
├── types/                 # TypeScript types
├── docs/                  # Documentation
│   ├── architecture.md
│   ├── workflows.md
│   └── api.md
└── scripts/               # Utility scripts
```

## 🗄️ Database Schema

### Core Tables

- **profiles** - User profiles and preferences
- **agents** - AI agent configurations
- **tasks** - Task management with priorities and dependencies
- **workflows** - Workflow definitions and state machines
- **workflow_states** - Individual workflow states
- **workflow_transitions** - State transitions with conditions
- **conversations** - AI conversation history
- **messages** - Individual messages with embeddings
- **knowledge_items** - User knowledge base

### Storage Buckets

- `user-uploads` - User uploaded files
- `task-attachments` - Files attached to tasks
- `workflow-templates` - Workflow templates
- `agent-artifacts` - AI-generated content
- `knowledge-base` - Knowledge documents

## 🧪 Development

### Available Scripts

```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint
npm run type-check             # TypeScript type checking
npm test                       # Run tests
npm run supabase:start         # Start local Supabase
npm run supabase:migrate       # Apply migrations
npm run supabase:generate-types # Generate TypeScript types
```

### Running Tests

```bash
npm test                       # Run all tests
npm run test:watch            # Watch mode
npm run test:coverage         # Generate coverage report
```

## 📚 Documentation

- **[Architecture Guide](docs/architecture.md)** - System architecture and design decisions
- **[Workflow System](docs/workflows.md)** - How to create and manage workflows
- **[API Reference](docs/api.md)** - Complete API documentation

## 🔐 Security

- **Row Level Security (RLS)** - All database tables are protected with RLS policies
- **JWT Authentication** - Supabase Auth with secure token management
- **API Key Protection** - Service role keys never exposed to client
- **Data Encryption** - At rest and in transit

## 🛣️ Roadmap

- [x] Core database schema and migrations
- [x] Multi-agent AI orchestration
- [x] Task management system
- [x] Workflow automation engine
- [x] Vector-powered knowledge base
- [ ] Web UI with Next.js
- [ ] Real-time collaboration features
- [ ] Visual workflow builder
- [ ] Mobile applications (iOS/Android)
- [ ] Integration hub (Calendar, Email, Slack, etc.)
- [ ] Custom agent training

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **[Supabase](https://supabase.com)** - Backend infrastructure
- **[OpenAI](https://openai.com)** - GPT models and embeddings
- **[Anthropic](https://anthropic.com)** - Claude AI models
- **[Next.js](https://nextjs.org)** - React framework

## 📧 Contact

**Alan Redmond** - [@alanredmond23-bit](https://github.com/alanredmond23-bit)

**Project Link**: [https://github.com/alanredmond23-bit/SHIPIT](https://github.com/alanredmond23-bit/SHIPIT)

---

**Built with ❤️ for solo entrepreneurs and one-person teams**
