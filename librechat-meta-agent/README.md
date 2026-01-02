# LibreChat Meta Master Agent

A multi-agent orchestration system with a mobile-friendly Mission Control UI.

## Quick Start (iPhone)

### 1. Set up environment
```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

### 2. Start services
```bash
docker compose up -d
```

### 3. Access on iPhone
Open Safari and go to: `http://YOUR_SERVER_IP:3000`

**Add to Home Screen:**
1. Tap the Share button
2. Select "Add to Home Screen"
3. Name it "Mission Control"

## Architecture

```
┌─────────────────────────────────────────┐
│           Mission Control UI            │
│         (Mobile PWA - Port 3000)        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Orchestrator API              │
│            (Port 3100)                  │
│  ┌─────────────────────────────────┐   │
│  │     Supervisor Dispatch Loop     │   │
│  │  ┌──────┐ ┌──────┐ ┌──────────┐ │   │
│  │  │UI    │ │Back  │ │Compliance│ │   │
│  │  │Lead  │ │Lead  │ │Lead      │ │   │
│  │  └──────┘ └──────┘ └──────────┘ │   │
│  │  ┌──────┐ ┌──────┐ ┌──────────┐ │   │
│  │  │Resrch│ │Verify│ │Librarian │ │   │
│  │  │Lead  │ │Agent │ │          │ │   │
│  │  └──────┘ └──────┘ └──────────┘ │   │
│  └─────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         PostgreSQL + pgvector           │
│            (Port 5433)                  │
└─────────────────────────────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Dashboard stats |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| POST | /api/tasks/:id/execute | Execute task |
| GET | /api/agents | Agent status |

## Agents

| Agent | Role |
|-------|------|
| supervisor | Orchestrates all agents |
| ui-lead | Frontend development |
| backend-lead | Backend/API development |
| compliance-lead | Security & compliance |
| research-lead | Research & analysis |
| verifier | QA & testing |
| librarian | Memory & indexing |

## Development

```bash
# Start database only
docker compose up postgres redis -d

# Run orchestrator locally
cd orchestrator && npm install && npm run dev

# Run UI locally
cd ui-extensions && npm install && npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| ANTHROPIC_API_KEY | Required for Claude API |
| POSTGRES_PASSWORD | Database password |
| CORS_ORIGINS | Allowed origins |
