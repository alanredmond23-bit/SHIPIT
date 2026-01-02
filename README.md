# Meta Agent - Complete AI Platform

> **The most feature-complete AI platform matching and exceeding Claude Desktop, ChatGPT, and Gemini**

Meta Agent is a next-generation AI platform built on LibreChat, featuring 16 advanced capabilities including extended thinking, deep research, multimodal generation, and visual workflow automation.

## 🚀 Features (16 Total)

### 🧠 AI Reasoning
| Feature | Description |
|---------|-------------|
| **Extended Thinking** | Visual thought trees, confidence scoring, self-critique loops, 6 reasoning templates |
| **Deep Research** | 10+ parallel sources, knowledge graphs, citation management (APA/MLA/Chicago/IEEE) |

### 🎨 Multimodal Generation
| Feature | Description |
|---------|-------------|
| **Image Generation** | DALL-E 3, Stability AI, Replicate with style presets |
| **Video Generation** | Runway Gen-3, Pika Labs, Replicate with camera controls |
| **Voice Conversation** | Real-time WebSocket, Whisper STT, ElevenLabs TTS, 15+ voices |

### 🔧 Automation & Integration
| Feature | Description |
|---------|-------------|
| **Computer Use** | Playwright browser automation, vision-based screen analysis |
| **Visual Workflow Builder** | Drag-and-drop state machine with conditions and triggers |
| **Scheduled Tasks** | Cron-based automation, 9 action types, execution history |
| **Google Workspace** | Gmail, Calendar, Drive, Docs, Sheets integration |
| **VS Code Extension** | IDE integration with inline AI assistance |

### 🛡️ Enterprise Features
| Feature | Description |
|---------|-------------|
| **Row Level Security** | Multi-tenant data isolation on all 15+ tables |
| **Audit Trail** | Complete task/project history with change tracking |
| **Conversation History** | Persistent chat with semantic search |
| **File Storage** | 9 organized buckets with quotas and RLS |
| **Custom Personas** | GPT/Gem-style with knowledge bases and marketplace |
| **Semantic Search** | pgvector-powered similarity search across all content |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                    │
│  Dashboard | Thinking | Research | Images | Videos | Voice  │
│  Workflows | Tasks | Workspace | Computer | Personas        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                  Orchestrator (Express + WS)                 │
│  TaskGraph | Supervisor | Artifacts | Memory | Workflows    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                PostgreSQL + pgvector                         │
│  17 Schema Files | RLS Policies | Audit Triggers            │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
SHIPIT/
├── librechat-meta-agent/           # Main application
│   ├── orchestrator/               # Backend services
│   │   ├── src/
│   │   │   ├── api/               # REST endpoints
│   │   │   ├── services/          # Business logic
│   │   │   │   ├── task-graph.ts
│   │   │   │   ├── supervisor-dispatch.ts
│   │   │   │   ├── workflow-engine.ts
│   │   │   │   ├── memory-service.ts
│   │   │   │   └── ...
│   │   │   └── types/             # TypeScript types
│   │   └── package.json
│   │
│   ├── ui-extensions/             # Frontend (Next.js)
│   │   ├── app/                   # Pages
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── thinking/          # Extended Thinking
│   │   │   ├── research/          # Deep Research
│   │   │   ├── images/            # Image Generation
│   │   │   ├── videos/            # Video Generation
│   │   │   ├── voice/             # Voice Chat
│   │   │   ├── workflows/         # Workflow Builder
│   │   │   ├── tasks/             # Task Scheduler
│   │   │   ├── workspace/         # Google Workspace
│   │   │   ├── computer/          # Computer Use
│   │   │   └── personas/          # Custom Personas
│   │   ├── components/            # React components
│   │   └── package.json
│   │
│   ├── schemas/                   # Database schemas (17 files)
│   │   ├── 001_initial_schema.sql
│   │   ├── ...
│   │   ├── 013_rls_policies.sql
│   │   ├── 014_task_history.sql
│   │   ├── 015_workflow_state_machine.sql
│   │   ├── 016_conversations.sql
│   │   └── 017_storage_buckets.sql
│   │
│   └── vscode-extension/          # VS Code integration
│
└── archive/joanna/                # Archived Joanna project
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ with pgvector
- API Keys: Anthropic, OpenAI (optional), Google (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/alanredmond23-bit/SHIPIT.git
cd SHIPIT/librechat-meta-agent

# Install orchestrator dependencies
cd orchestrator && npm install

# Install UI dependencies
cd ../ui-extensions && npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run database migrations
psql -f ../schemas/*.sql

# Start the orchestrator
cd ../orchestrator && npm run dev

# Start the UI (in another terminal)
cd ../ui-extensions && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

### Core Tables
- `meta_projects` - Project management
- `meta_workstreams` - Workstream organization
- `meta_tasks` - Task tracking with dependencies
- `meta_task_runs` - Execution history
- `meta_artifacts` - Generated outputs
- `meta_memory_facts` - Semantic memory with embeddings

### Feature Tables
- `thinking_sessions` - Extended thinking logs
- `research_sessions` - Research with sources
- `generated_images` - Image generation history
- `generated_videos` - Video generation history
- `voice_sessions` - Voice conversation logs
- `computer_sessions` - Browser automation sessions
- `personas` - Custom AI personas
- `google_workspace_connections` - OAuth connections
- `scheduled_tasks` - Automation schedules

### Workflow Tables
- `meta_workflows` - Workflow definitions
- `meta_workflow_states` - State machine states
- `meta_workflow_transitions` - State transitions
- `meta_workflow_instances` - Running instances
- `meta_workflow_logs` - Execution logs

### Security & History
- `meta_task_history` - Audit trail
- `meta_project_history` - Change tracking
- `meta_conversations` - Chat history
- `meta_messages` - Message storage
- `meta_file_metadata` - File tracking
- `meta_storage_quotas` - Usage limits

## 🔐 Security

- **Row Level Security (RLS)** on all tables
- **JWT Authentication** via Supabase/custom auth
- **API Key Protection** - Server-side only
- **Audit Logging** - Complete change history
- **Data Encryption** - At rest and in transit

## 📊 Comparison with Competitors

| Feature | Meta Agent | Claude Desktop | ChatGPT | Gemini |
|---------|:----------:|:--------------:|:-------:|:------:|
| Extended Thinking | ✅ Visual | ✅ Text | ❌ | ✅ Text |
| Deep Research | ✅ 10+ sources | ❌ | ✅ | ✅ |
| Image Generation | ✅ Multi-provider | ❌ | ✅ | ✅ |
| Video Generation | ✅ Multi-provider | ❌ | ❌ | ✅ |
| Voice Chat | ✅ | ❌ | ✅ | ✅ |
| Computer Use | ✅ | ✅ | ❌ | ❌ |
| Custom Personas | ✅ | ❌ | ✅ | ✅ |
| Workflow Builder | ✅ Visual | ❌ | ❌ | ❌ |
| Task Scheduler | ✅ | ❌ | ❌ | ❌ |
| IDE Extension | ✅ | ✅ | ❌ | ❌ |
| Google Workspace | ✅ | ❌ | ❌ | ✅ |
| RLS Security | ✅ | N/A | N/A | N/A |
| Audit Trail | ✅ | ❌ | ❌ | ❌ |
| Self-Hostable | ✅ | ❌ | ❌ | ❌ |

## 📈 Stats

- **~52,000+ lines** of TypeScript/SQL
- **17 database schemas**
- **16 major features**
- **130+ source files**
- **Self-hostable** - Full control over your data

## 🛣️ Roadmap

- [x] 10 core features (thinking, research, images, video, voice, computer, personas, workspace, tasks, vscode)
- [x] 6 enterprise features (RLS, audit, workflows, conversations, storage, search)
- [ ] Real-time collaboration
- [ ] Mobile applications
- [ ] Plugin marketplace
- [ ] Custom model training

## 📄 License

MIT License - See LICENSE file for details.

## 🙏 Acknowledgments

- **[LibreChat](https://librechat.ai)** - Base chat platform
- **[Anthropic](https://anthropic.com)** - Claude AI models
- **[OpenAI](https://openai.com)** - GPT models and DALL-E
- **[Supabase](https://supabase.com)** - Database infrastructure

---

**Built with ❤️ as the most complete open-source AI platform**
