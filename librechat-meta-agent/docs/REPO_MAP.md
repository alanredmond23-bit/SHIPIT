# LibreChat Meta Agent - Repository Map

**Generated**: 2026-01-03
**Repository**: `/Users/alanredmond/githubrepos/SHIPIT/librechat-meta-agent/`
**Branch**: `add/theme-presets-and-selector`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Files** | 670+ |
| **Total Lines of Code** | ~125,454 |
| **Documentation Files** | 43 |
| **Database Schemas** | 21 SQL files |
| **Test Files** | 30+ |
| **Primary Languages** | TypeScript, JavaScript, SQL |

---

## Repository Structure

```
librechat-meta-agent/
|-- agents/                  # Agent definitions (1 agent)
|-- ARCHIVED/                # Archived reference components
|-- config/                  # Configuration examples
|-- deploy/                  # Deployment configurations
|-- desktop-app/             # Electron desktop wrapper
|-- docs/                    # Documentation (10 files)
|-- orchestrator/            # Backend API service
|-- schemas/                 # Database migrations (21 files)
|-- scripts/                 # Utility scripts
|-- ui-extensions/           # Next.js frontend application
|-- vscode-extension/        # VS Code IDE extension
```

---

## Directory Analysis

### 1. `/agents` - Agent Definitions
**Purpose**: Supervisor agent configuration for multi-agent orchestration

| Content | Count | Lines |
|---------|-------|-------|
| Subdirectories | 1 (supervisor) | - |
| YAML configs | 1 | 25 |
| System prompts | 1 | 44 |

**Key Files**:
- `supervisor/config.yaml` - Agent role and capability definitions
- `supervisor/system-prompt.md` - AI agent instructions

---

### 2. `/ARCHIVED` - Reference Components
**Purpose**: Preserved production-ready components awaiting integration

**Archived Components**:
- **Collaboration/** - Real-time collaboration features
  - CursorOverlay.tsx
  - TypingIndicator.tsx
  - PresenceAvatars.tsx
- **Artifacts/** - Code artifact display system
  - ArtifactPanel.tsx
  - CodeArtifact.tsx
  - ArtifactsDemo.tsx

**Status**: Fully functional, documented for future restoration

---

### 3. `/config` - Configuration Examples
**Purpose**: Example configuration files for services

| File | Purpose |
|------|---------|
| `image-generation.example.ts` | Image generation provider configuration |

**Lines**: 7,887

---

### 4. `/deploy` - Deployment Configurations
**Purpose**: Database initialization and deployment scripts

| File | Purpose |
|------|---------|
| `init.sql` | Initial PostgreSQL + pgvector setup |

**Lines**: 9,460

---

### 5. `/desktop-app` - Electron Application
**Purpose**: Desktop wrapper for the web application

| Metric | Value |
|--------|-------|
| JS Files | 2 |
| Lines of Code | 281 |
| Framework | Electron |

**Key Files**:
- `main.js` - Electron main process
- `preload.js` - Context bridge for security
- `package.json` - Dependencies and scripts

**Features**:
- Native desktop window
- System tray integration
- File system access

---

### 6. `/docs` - Documentation
**Purpose**: Feature guides and API references

| Document | Description |
|----------|-------------|
| COMPUTER_USE.md | Browser automation guide |
| DEEP_RESEARCH_GUIDE.md | Multi-source research system |
| FILE_UPLOAD_SYSTEM.md | File processing documentation |
| IMAGE_GENERATION_INTEGRATION.md | Image AI setup |
| IMAGE_GENERATION_SETUP.md | Provider configuration |
| MEMORY_SYSTEM.md | Memory/RAG architecture |
| RESEARCH_INTEGRATION.md | Search provider setup |
| VOICE_API_REFERENCE.md | Voice API endpoints |
| VOICE_INTEGRATION_EXAMPLE.md | Voice implementation examples |
| VOICE_SYSTEM.md | Voice architecture overview |

**Total Lines**: ~4,835

---

### 7. `/orchestrator` - Backend Service
**Purpose**: Express.js API server with AI orchestration

| Metric | Value |
|--------|-------|
| TypeScript/JS Files | 89 |
| Lines of Code | ~44,129 |
| Framework | Express.js |
| Port | 3100 |

**Directory Structure**:
```
orchestrator/
|-- src/
|   |-- api/            # REST endpoints
|   |   |-- chat.ts
|   |   |-- computer.ts
|   |   |-- files.ts
|   |   |-- google-workspace.ts
|   |   |-- images.ts
|   |   |-- memory.ts
|   |   |-- personas.ts
|   |   |-- research.ts
|   |   |-- routes.ts
|   |   |-- scheduled-tasks.ts
|   |   |-- thinking.ts
|   |   |-- videos.ts
|   |   |-- voice.ts
|   |-- config/         # Service configurations
|   |   |-- mcp-servers.ts  # 75+ MCP connectors
|   |-- db/             # Database client
|   |-- events/         # Event emitter
|   |-- middleware/     # Auth middleware
|   |-- services/       # Business logic
|   |   |-- ai/         # Claude, OpenAI, Google clients
|   |   |-- computer/   # Browser automation
|   |   |-- image/      # DALL-E, Stability, Replicate
|   |   |-- realtime/   # WebSocket server
|   |   |-- research/   # Web search & extraction
|   |   |-- scheduler/  # Task scheduling
|   |   |-- video/      # Runway, Pika integration
|   |   |-- voice/      # STT/TTS services
|   |-- types/          # TypeScript definitions
|-- tests/              # Unit & integration tests
|-- examples/           # API usage examples
```

**Key Services**:
| Service | Description |
|---------|-------------|
| `ai/*.ts` | Multi-provider AI clients (Anthropic, OpenAI, Google) |
| `deep-research.ts` | Multi-source research engine |
| `memory-service.ts` | RAG and memory management |
| `workflow-engine.ts` | Workflow state machine |
| `computer-use.ts` | Browser automation via Playwright |
| `voice-conversation.ts` | Real-time voice processing |
| `mcp-client.ts` | Model Context Protocol client |
| `benchmark-service.ts` | AI model comparison |
| `decision-framework.ts` | Decision wizard logic |
| `idea-to-launch.ts` | Project lifecycle management |

---

### 8. `/schemas` - Database Migrations
**Purpose**: Supabase/PostgreSQL schema definitions

| File | Description |
|------|-------------|
| 001_initial_schema.sql | Core tables (projects, tasks, agents) |
| 002_memory_schema.sql | Memory and embeddings |
| 003_files_schema.sql | File storage metadata |
| 004_thinking_schema.sql | Extended thinking logs |
| 005_research_schema.sql | Research results |
| 006_images_schema.sql | Image generation records |
| 007_voice_schema.sql | Voice session data |
| 008_computer_schema.sql | Browser automation logs |
| 009_personas_schema.sql | AI personas |
| 010_video_schema.sql | Video generation |
| 011_google_workspace_schema.sql | Google integration |
| 012_scheduled_tasks_schema.sql | Task scheduling |
| 013_auth_schema.sql | Authentication |
| 013_rls_policies.sql | Row-level security |
| 014_task_history.sql | Task execution history |
| 015_workflow_state_machine.sql | Workflow states |
| 016_conversations.sql | Chat history |
| 017_storage_buckets.sql | File buckets |
| 018_realtime_schema.sql | WebSocket presence |
| 019_idea_to_launch.sql | Project templates |
| 020_advanced_settings.sql | User preferences |

**Total Lines**: ~6,760
**Total Schemas**: 21

---

### 9. `/scripts` - Utility Scripts
**Purpose**: Deployment and testing automation

| Script | Description | Lines |
|--------|-------------|-------|
| `deploy.sh` | Docker/production deployment | 8,823 |
| `test-voice-system.sh` | Voice system testing | 5,980 |
| `test.sh` | General test runner | 4,081 |

**Total Lines**: ~701 (shell)

---

### 10. `/ui-extensions` - Frontend Application
**Purpose**: Next.js 14 web application with React 18

| Metric | Value |
|--------|-------|
| TypeScript/JS Files | 147 |
| Lines of Code | ~47,669 |
| Framework | Next.js 14.1 |
| Styling | Tailwind CSS |
| Port | 3000 |

**Directory Structure**:
```
ui-extensions/
|-- app/                 # Next.js App Router pages
|   |-- api/             # API routes
|   |-- auth/            # Authentication pages
|   |-- benchmarks/      # AI model comparison
|   |-- chat/            # Main chat interface
|   |-- computer/        # Browser automation UI
|   |-- decisions/       # Decision frameworks
|   |-- images/          # Image generation
|   |-- launch/          # Idea to Launch
|   |-- memory/          # Memory management
|   |-- personas/        # AI persona builder
|   |-- research/        # Deep research UI
|   |-- settings/        # Configuration UI
|   |-- tasks/           # Task scheduler
|   |-- thinking/        # Extended thinking
|   |-- tools/           # Tool execution
|   |-- videos/          # Video generation
|   |-- voice/           # Voice chat
|   |-- workflows/       # Workflow builder
|   |-- workspace/       # Google Workspace
|-- components/          # React components
|   |-- Auth/            # Login, signup forms
|   |-- Benchmarks/      # Benchmark dashboard
|   |-- Common/          # Shared components
|   |-- Computer/        # Computer use UI
|   |-- DecisionFramework/
|   |-- FileUpload/
|   |-- GoogleWorkspace/
|   |-- IdeaToLaunch/
|   |-- ImageGen/
|   |-- Navigation/      # Nav components
|   |-- Personas/
|   |-- Research/
|   |-- Settings/        # MCP Manager, model params
|   |-- Tasks/
|   |-- Thinking/
|   |-- ThinkingPanel/
|   |-- Tools/
|   |-- ui/              # Design system components
|   |-- VideoGen/
|   |-- Voice/
|   |-- WorkflowBuilder/
|-- e2e/                 # Playwright E2E tests
|-- hooks/               # Custom React hooks
|-- lib/                 # Utilities and clients
|   |-- auth/            # Supabase auth
|   |-- realtime/        # WebSocket client
|-- styles/              # Design tokens
|-- tests/               # Jest unit tests
|-- types/               # TypeScript definitions
```

**Key Components**:
| Component | Purpose |
|-----------|---------|
| Navigation/UnifiedNav | Main navigation with mobile support |
| Settings/MCPManager | 75+ MCP server configuration |
| ThinkingPanel | Extended AI reasoning display |
| Research/DeepResearch | Multi-source research |
| Voice/VoiceChat | Real-time voice interface |
| Computer/ComputerUse | Browser automation |
| Benchmarks/BenchmarkDashboard | AI model comparison |
| WorkflowBuilder | Visual workflow creation |
| IdeaToLaunch | Project lifecycle phases |
| DecisionFramework | Wizard-based decisions |

**Testing**:
- Jest unit tests: `tests/`
- Playwright E2E tests: `e2e/`
- Vitest configuration available

---

### 11. `/vscode-extension` - VS Code Extension
**Purpose**: IDE integration for AI assistance

| Metric | Value |
|--------|-------|
| TypeScript Files | 15 |
| Lines of Code | ~1,638 |
| Extension Type | VS Code Language Extension |

**Directory Structure**:
```
vscode-extension/
|-- src/
|   |-- api/             # API client
|   |-- chat/            # Chat view provider
|   |-- commands/        # VS Code commands
|   |   |-- comments.ts
|   |   |-- explain.ts
|   |   |-- fix.ts
|   |   |-- generate.ts
|   |   |-- refactor.ts
|   |   |-- review.ts
|   |   |-- tests.ts
|   |-- providers/       # Language providers
|       |-- CodeActionProvider.ts
|       |-- CompletionProvider.ts
|       |-- DiagnosticsProvider.ts
|       |-- HoverProvider.ts
|-- extension.ts         # Main entry point
```

**Features**:
- Code generation
- Code review
- Refactoring suggestions
- Test generation
- Inline explanations
- Auto-completions
- Diagnostics

---

## Root-Level Files

### Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (gitignored) |
| `.env.example` | Environment template (202 lines) |
| `.gitignore` | Git exclusions |
| `docker-compose.yml` | Docker service definitions |
| `Dockerfile.orchestrator` | Orchestrator container |
| `Dockerfile.ui` | UI container |
| `nginx.conf` | Reverse proxy configuration |

### Documentation Files

| File | Purpose | Lines |
|------|---------|-------|
| README.md | Project overview | 100 |
| CHANGELOG.md | Version history | 141 |
| FEATURES_ROADMAP.md | Feature planning | 5,508 |
| INTEGRATION_STEPS.md | Setup guide | 9,808 |
| MEMORY_SETUP_CHECKLIST.md | Memory system setup | 5,595 |
| MEMORY_SYSTEM_SUMMARY.txt | Memory architecture | 15,477 |
| PERSONAS_SYSTEM_GUIDE.md | Persona system | 12,383 |
| SCHEDULED_TASKS_SETUP.md | Task scheduling | 11,237 |
| SCHEDULED_TASKS_SUMMARY.md | Scheduler overview | 13,438 |
| TEST_SUITE_README.md | Testing guide | 10,624 |
| VOICE_QUICK_START.md | Voice setup | 3,275 |
| VOICE_SYSTEM_SUMMARY.md | Voice architecture | 17,139 |
| VS_CODE_EXTENSION_COMPLETE.md | Extension docs | 9,302 |
| VS_CODE_INTEGRATION_SUMMARY.md | IDE integration | 12,224 |

---

## Recent Git History (Last 20 Commits)

| Hash | Message |
|------|---------|
| 3bcdb47 | feat: add Night-Light Teal theme system and Settings page |
| 3b7c9a5 | Add implementation plan document |
| ff610c2 | feat: add Playwright testing framework with E2E and unit tests |
| 6277cbe | Merge branch 'claude/librechat-framework-J7SpZ' |
| cac4f67 | Add functional engines and minimalist UI redesign |
| 94bb9bd | feat: add Mistral and xAI Grok models + env config updates |
| 16c0852 | Add decision frameworks, benchmarks, and MCP integrations |
| 4ab58cd | Merge theme-presets branch: MCP, Electron, Chat UI, migrations |
| c8600d4 | Add Idea-to-Launch structured workflow framework |
| c145f32 | feat: Add MCP server registry with 75+ connectors |
| 18456f9 | feat: Add deployment script and apply Supabase migrations |
| e3f151d | feat: Add Electron desktop app wrapper |
| 6635e3d | feat: Complete chat UI redesign with dynamic model fetching |
| 7c50842 | feat: Add latest LLM models, auth system, and fix exports |
| 8f6a05b | Add deployment, auth, AI APIs, tests, mobile UI, real-time |
| 48a46a5 | Archive Joanna project, Meta Agent is now main platform |
| 130b1bd | Merge Joanna features: RLS, workflow state machine, history |
| ea98672 | Fix component exports and imports |
| db61527 | Fix db import paths for services |
| a7a5ec4 | Add all 10 missing features to match Claude, ChatGPT, Gemini |

---

## TODO/FIXME Comments

| Location | Comment |
|----------|---------|
| `orchestrator/src/services/workflow-engine.ts:281` | TODO: Implement retry with delay |
| `orchestrator/src/api/google-workspace.ts:37` | TODO: Get from authenticated session |
| `orchestrator/src/api/voice.ts:71,219,296,341,377` | TODO: Get userId from auth |
| `ui-extensions/app/memory/page.tsx:169` | TODO: Make project_id dynamic |

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14.1
- **UI Library**: React 18.2
- **Styling**: Tailwind CSS 3.4
- **State**: TanStack React Query 5
- **Icons**: Lucide React
- **AI SDK**: @anthropic-ai/sdk

### Backend
- **Runtime**: Node.js (TypeScript)
- **Framework**: Express.js 4.18
- **Database**: PostgreSQL with pgvector
- **Cache**: Redis (ioredis)
- **AI Clients**: Anthropic, OpenAI, Google
- **Browser**: Playwright 1.57
- **Validation**: Zod

### Testing
- **Unit Tests**: Jest 29, Vitest 1.2
- **E2E Tests**: Playwright 1.57
- **Coverage**: @vitest/coverage-v8

### Deployment
- **Containers**: Docker Compose
- **Reverse Proxy**: Nginx
- **Desktop**: Electron

---

## API Providers Supported

| Provider | Models | API Key Variable |
|----------|--------|------------------|
| Anthropic | Claude 3.5, Claude 4 | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-4, GPT-4 Turbo, DALL-E | `OPENAI_API_KEY` |
| Google | Gemini Pro, Gemini Ultra | `GOOGLE_API_KEY` |
| DeepSeek | DeepSeek V3, R1 | `DEEPSEEK_API_KEY` |
| Mistral | Mistral Large, Medium | `MISTRAL_API_KEY` |
| xAI | Grok-1, Grok-2 | `XAI_API_KEY` |
| Together AI | Llama 3.x, open models | `TOGETHER_API_KEY` |
| Groq | Fast inference | `GROQ_API_KEY` |
| Stability AI | Stable Diffusion | `STABILITY_API_KEY` |
| Replicate | Various models | `REPLICATE_API_KEY` |
| ElevenLabs | Voice synthesis | `ELEVENLABS_API_KEY` |

---

## Getting Started

```bash
# Clone and setup
cd /Users/alanredmond/githubrepos/SHIPIT/librechat-meta-agent

# Copy environment template
cp .env.example .env

# Add your API keys to .env
# Minimum: ANTHROPIC_API_KEY

# Start with Docker
docker compose up -d

# Access UI
open http://localhost:3000

# Access API
curl http://localhost:3100/health
```

---

## Development

```bash
# Start database only
docker compose up postgres redis -d

# Run orchestrator (port 3100)
cd orchestrator && npm install && npm run dev

# Run UI (port 3000)
cd ui-extensions && npm install && npm run dev

# Run tests
npm test              # Unit tests
npm run test:e2e      # E2E tests
```

---

## Related Documentation

- [CHANGELOG.md](/CHANGELOG.md) - Version history
- [FEATURES_ROADMAP.md](/FEATURES_ROADMAP.md) - Planned features
- [INTEGRATION_STEPS.md](/INTEGRATION_STEPS.md) - Setup guide
- [MEMORY_SYSTEM_SUMMARY.txt](/MEMORY_SYSTEM_SUMMARY.txt) - Memory architecture
- [VOICE_SYSTEM_SUMMARY.md](/VOICE_SYSTEM_SUMMARY.md) - Voice system details
- [VS_CODE_INTEGRATION_SUMMARY.md](/VS_CODE_INTEGRATION_SUMMARY.md) - IDE setup

---

*This repository map was auto-generated by AGENT 3: REPO MAPPER*
