# Mission Control - User Guide

Welcome to Mission Control, your AI-powered workspace for intelligent conversations, deep research, and productivity automation.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Chat Interface](#chat-interface)
4. [Model Selection](#model-selection)
5. [Using Personas](#using-personas)
6. [Managing Projects](#managing-projects)
7. [Task Scheduling](#task-scheduling)
8. [Voice Chat](#voice-chat)
9. [Research Mode](#research-mode)
10. [Extended Thinking](#extended-thinking)
11. [Image Generation](#image-generation)
12. [Video Generation](#video-generation)
13. [MCP Tools](#mcp-tools)
14. [Computer Use](#computer-use)
15. [Decision Frameworks](#decision-frameworks)
16. [Benchmark Dashboard](#benchmark-dashboard)
17. [Workflows](#workflows)
18. [Settings Configuration](#settings-configuration)

---

## Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/librechat-meta-agent.git
   cd librechat-meta-agent/ui-extensions
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the `ui-extensions` directory:
   ```env
   # Required: At least one AI provider
   ANTHROPIC_API_KEY=sk-ant-...

   # Optional: Additional providers
   OPENAI_API_KEY=sk-...
   GOOGLE_API_KEY=AIza...
   DEEPSEEK_API_KEY=sk-...

   # Optional: Supabase Authentication
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### First Run

When you first open Mission Control, you will see the main dashboard with:

- **Quick Actions**: Fast access to Chat, Think, Research, Create, and Settings
- **Featured Tools**: Idea to Launch, Benchmark Dashboard, Decision Frameworks
- **Recent Activity**: Your latest interactions
- **Performance Insights**: Analytics on your usage

---

## Dashboard Overview

The dashboard is your command center, providing at-a-glance access to all features.

### Quick Actions Panel

| Action | Description | Keyboard Shortcut |
|--------|-------------|-------------------|
| Chat | Start a new conversation | `Cmd/Ctrl + N` |
| Think | Extended reasoning mode | `Cmd/Ctrl + T` |
| Research | Deep multi-source analysis | `Cmd/Ctrl + R` |
| Create | Generate images | `Cmd/Ctrl + I` |
| Settings | Configure API keys and theme | `Cmd/Ctrl + ,` |

### Statistics Cards

- **Conversations**: Total chat sessions
- **Decisions Made**: Frameworks used
- **Projects**: Active project count

### Capabilities Grid

A visual overview of all available features:
- Extended Thinking
- Deep Research
- Image Generation
- Video Generation
- Voice Chat
- Computer Use
- Custom Personas
- Task Scheduler
- Decision Frameworks
- Idea to Launch

---

## Chat Interface

The chat interface is your primary way to interact with AI models.

### Starting a Conversation

1. Navigate to `/chat` or click "Start Chat" on the dashboard
2. Type your message in the input field at the bottom
3. Press `Enter` to send or `Shift+Enter` for a new line
4. View the AI response in real-time with streaming

### Message Actions

- **Copy**: Click the copy icon to copy a message to clipboard
- **Regenerate**: Request a new response from the AI
- **Edit**: Modify your previous messages
- **Branch**: Create a conversation branch from any point

### Chat Features

| Feature | Description |
|---------|-------------|
| Markdown | Full markdown rendering with syntax highlighting |
| Code Blocks | Syntax-highlighted code with copy button |
| LaTeX | Mathematical equations rendered beautifully |
| Artifacts | Interactive code and document previews |
| Streaming | Real-time response display |

### Tools in Chat

Enable tools from the toolbar:
- **Web Search**: Access current information
- **Code Interpreter**: Execute Python code
- **Artifacts**: Create interactive documents

---

## Model Selection

Mission Control supports multiple AI providers and models.

### Available Providers

| Provider | Models | Key Features |
|----------|--------|--------------|
| **Anthropic** | Claude Opus 4.5, Sonnet 4, 3.5 Sonnet/Haiku | Extended thinking, tool use |
| **OpenAI** | GPT-5.2 Pro, GPT-5, o3, o1 Pro, GPT-4o | Reasoning, multimodal |
| **Google** | Gemini 2.0 Ultra/Pro/Flash | 10M token context |
| **DeepSeek** | R1, R1 Zero, V3 | Open-source reasoning |
| **Meta** | Llama 4 405B/70B | Open-weight models |
| **Mistral** | Large 2, Codestral | Code specialization |
| **xAI** | Grok 3, Grok 2 | Real-time X integration |

### Changing Models

1. Click the model selector in the chat header
2. Choose a provider from the dropdown
3. Select a specific model
4. Your selection persists across sessions

### Model Recommendations

- **Complex Reasoning**: Claude Opus 4.5, GPT-5.2 Pro, DeepSeek R1
- **Fast Responses**: Claude 3.5 Haiku, Gemini 2.0 Flash
- **Long Documents**: Gemini 2.0 (10M context)
- **Code Generation**: Codestral, Claude Sonnet 4

---

## Using Personas

Personas allow you to customize AI behavior for specific use cases.

### Accessing Personas

Navigate to `/personas` to explore and manage personas.

### Built-in Personas

- **Default Assistant**: Helpful, balanced responses
- **Code Expert**: Technical programming focus
- **Writer**: Creative and editorial assistance
- **Analyst**: Data and research focus
- **Tutor**: Educational explanations

### Creating Custom Personas

1. Click "Create Persona" in the Persona Explorer
2. Fill in the persona details:
   - **Name**: A descriptive title
   - **Description**: What this persona specializes in
   - **System Prompt**: Instructions that shape behavior
   - **Temperature**: Creativity level (0-1)
   - **Avatar**: Choose an icon or upload an image
3. Click "Save" to create your persona

### Using a Persona

1. In the chat interface, click the persona selector
2. Choose your desired persona
3. All subsequent messages use that persona's configuration

### Persona Chat

Navigate to the Persona Chat view to see your conversation history with each persona and switch between them easily.

---

## Managing Projects

The Projects feature helps you organize related conversations and documents.

### Creating a Project

1. Navigate to `/projects`
2. Click "New Project"
3. Enter project details:
   - Name
   - Description
   - Color/Icon
   - Tags

### Project Features

- **Grouped Conversations**: All chats related to a project
- **Document Storage**: Attach files and references
- **Timeline View**: See project activity chronologically
- **Collaboration**: Share projects with team members

### Idea to Launch

For product development, use the `/launch` workflow:

1. **Ideation Phase**: Brainstorm and refine your idea
2. **Planning Phase**: Create roadmaps and specifications
3. **Development Phase**: Build with AI assistance
4. **Launch Phase**: Prepare for release

Each phase includes templates, AI guidance, and progress tracking.

---

## Task Scheduling

Automate recurring tasks with the Task Scheduler.

### Accessing Tasks

Navigate to `/tasks` to view and manage scheduled tasks.

### Creating a Scheduled Task

1. Click "New Task"
2. Configure the task:
   - **Name**: Task identifier
   - **Prompt**: The AI instruction to execute
   - **Schedule**: Cron expression or simple interval
   - **Model**: Which AI model to use
   - **Output**: Where to save results

### Schedule Examples

| Schedule | Cron Expression | Description |
|----------|-----------------|-------------|
| Daily at 9 AM | `0 9 * * *` | Every day at 9:00 |
| Every Monday | `0 0 * * 1` | Mondays at midnight |
| Every 6 hours | `0 */6 * * *` | 12AM, 6AM, 12PM, 6PM |
| First of month | `0 0 1 * *` | Monthly on the 1st |

### Task History

View past executions, outputs, and any errors in the task history panel.

---

## Voice Chat

Have spoken conversations with AI models.

### Starting Voice Chat

1. Navigate to `/voice`
2. Click the microphone button to start recording
3. Speak your message
4. The AI responds with synthesized speech

### Voice Settings

- **Input Device**: Select your microphone
- **Output Device**: Choose speaker/headphones
- **Voice**: Select the AI voice style
- **Speed**: Adjust playback speed
- **Auto-send**: Send immediately after silence

### Tips for Voice Chat

- Speak clearly and at a moderate pace
- Wait for the beep before speaking
- Use "Stop" or click the button to end recording
- Background noise may affect recognition quality

---

## Research Mode

Deep Research mode performs comprehensive multi-source analysis.

### Starting Research

1. Navigate to `/research`
2. Enter your research question or topic
3. Configure options:
   - **Depth**: Quick, Standard, or Deep
   - **Sources**: Web, Academic, News, or All
   - **Format**: Report, Summary, or Outline

### Research Output

Research results include:
- **Executive Summary**: Key findings at a glance
- **Detailed Analysis**: In-depth exploration of the topic
- **Source Citations**: Links to all referenced materials
- **Related Topics**: Suggestions for further research

### Saving Research

- Export as PDF or Markdown
- Save to a Project
- Share via link

---

## Extended Thinking

Extended Thinking provides visible step-by-step reasoning.

### Using Extended Thinking

1. Navigate to `/thinking`
2. Enter a complex question or problem
3. Watch the AI's reasoning process unfold
4. View the final answer with full reasoning chain

### Thinking Display

The thinking panel shows:
- **Current Step**: What the AI is considering
- **Reasoning Chain**: The logical progression
- **Confidence Levels**: How certain the AI is
- **Alternative Paths**: Other approaches considered

### Best Uses for Extended Thinking

- Mathematical proofs
- Logic puzzles
- Strategic planning
- Complex analysis
- Problem decomposition

---

## Image Generation

Create images using AI models like DALL-E and Stable Diffusion.

### Generating Images

1. Navigate to `/images`
2. Enter a descriptive prompt
3. Configure options:
   - **Model**: DALL-E 3, Stable Diffusion, etc.
   - **Size**: 1024x1024, 1024x1792, etc.
   - **Style**: Natural, Vivid, etc.
   - **Quantity**: 1-4 images

### Image Actions

- **Download**: Save to your computer
- **Edit**: Modify with inpainting
- **Variations**: Generate similar images
- **Upscale**: Increase resolution

### Prompt Tips

- Be specific about subjects and setting
- Include artistic style references
- Specify lighting and mood
- Mention composition preferences

---

## Video Generation

Create videos using AI models like Runway and Pika.

### Generating Videos

1. Navigate to `/videos`
2. Choose generation mode:
   - **Text to Video**: Describe what you want
   - **Image to Video**: Animate a static image
3. Configure settings and generate

### Video Options

- **Duration**: 4-16 seconds
- **Resolution**: 720p or 1080p
- **Style**: Cinematic, Animation, etc.
- **Motion**: Camera movement preferences

---

## MCP Tools

Model Context Protocol (MCP) tools extend AI capabilities.

### Available MCP Servers

| Server | Category | Features |
|--------|----------|----------|
| Filesystem | Utility | Read, write, manage files |
| GitHub | Development | Repos, issues, PRs, code search |
| Slack | Communication | Messages, channels, search |
| PostgreSQL | Data | Database queries, schema |
| Brave Search | Productivity | Web search, news, images |
| Puppeteer | Development | Browser automation, scraping |
| Memory | AI | Knowledge graph, context retention |
| Google Drive | Productivity | Files, search, download |
| Fetch | Utility | URL fetching, markdown conversion |

### Managing MCP Servers

1. Navigate to `/tools`
2. Browse available servers by category
3. Click "Install" on desired servers
4. Configure required environment variables
5. Start/stop servers as needed

### Exporting Configuration

Generate a Claude Desktop compatible configuration:
1. Click "Export Config"
2. Copy the JSON output
3. Paste into your Claude Desktop settings

---

## Computer Use

Control a browser directly through AI commands.

### Accessing Computer Use

1. Navigate to `/computer`
2. The browser interface loads
3. Instruct the AI what to do

### Capabilities

- Navigate to websites
- Click buttons and links
- Fill out forms
- Take screenshots
- Extract information

### Safety Notes

- Computer Use operates in a sandboxed environment
- Sensitive actions require confirmation
- Never enter passwords through AI control

---

## Decision Frameworks

Make better decisions using proven frameworks.

### Available Frameworks

| Framework | Best For |
|-----------|----------|
| **RAPID** | Organizational decisions with clear roles |
| **SPADE** | Strategic decisions requiring broad input |
| **Weighted Matrix** | Comparing multiple options quantitatively |
| **Pre-mortem** | Risk assessment and mitigation |
| **Six Thinking Hats** | Creative and critical analysis |

### Using a Framework

1. Navigate to `/decisions`
2. Select a framework
3. Follow the guided wizard
4. Document your decision process
5. Export or save the result

---

## Benchmark Dashboard

Compare AI model performance with real-time data.

### Viewing Benchmarks

Navigate to `/benchmarks` to see:

- **Model Comparison Charts**: Visual performance data
- **Leaderboards**: Rankings by capability
- **Cost Analysis**: Price per token comparisons
- **Latency Metrics**: Response time data

### Benchmark Categories

- Reasoning
- Code Generation
- Creative Writing
- Instruction Following
- Safety
- Multimodal

---

## Workflows

Build automated multi-step AI workflows.

### Creating a Workflow

1. Navigate to `/workflows`
2. Click "New Workflow"
3. Add steps from the toolbox
4. Connect steps with arrows
5. Configure each step's parameters
6. Save and run

### Workflow Components

- **Triggers**: What starts the workflow
- **AI Steps**: Model inference nodes
- **Logic**: Conditionals and loops
- **Actions**: External integrations
- **Outputs**: Where results go

---

## Settings Configuration

### API Status

1. Navigate to `/settings`
2. View connection status for each provider
3. Click "Refresh" to recheck

### Configuring API Keys

Add to your `.env.local` file:

```env
# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
META_API_KEY=...
MISTRAL_API_KEY=...
XAI_API_KEY=xai-...
```

### Theme Settings

1. Go to Settings > Appearance
2. Choose Dark Mode or Light Mode
3. Preview the Night-Light Teal color palette

### Code Inspector

View the underlying implementation of features:
1. Settings > Code Inspector
2. Click on any section to expand
3. Syntax-highlighted code with explanations

---

## Troubleshooting

### Common Issues

**"Missing environment variables" error**
- Ensure `.env.local` exists in the `ui-extensions` directory
- Restart the development server after changes

**Model not responding**
- Check API key is correct
- Verify provider status in Settings
- Check your API quota/credits

**Authentication issues**
- Clear browser cookies
- Reconfigure Supabase credentials
- Check OAuth callback URLs

### Getting Help

- Check the [QUICK_START.md](../QUICK_START.md) guide
- Review [SUPABASE_AUTH_SETUP.md](../SUPABASE_AUTH_SETUP.md) for auth issues
- Open an issue on GitHub for bugs

---

## Appendix: Feature Reference

| Feature | Route | Description |
|---------|-------|-------------|
| Dashboard | `/` | Main command center |
| Chat | `/chat` | Conversational AI |
| Thinking | `/thinking` | Extended reasoning |
| Research | `/research` | Deep analysis |
| Images | `/images` | Image generation |
| Videos | `/videos` | Video generation |
| Voice | `/voice` | Voice conversations |
| Personas | `/personas` | Custom AI personalities |
| Projects | `/projects` | Organize work |
| Tasks | `/tasks` | Scheduled automation |
| Launch | `/launch` | Idea to product workflow |
| Benchmarks | `/benchmarks` | Model comparison |
| Decisions | `/decisions` | Decision frameworks |
| Workflows | `/workflows` | Automation builder |
| Tools | `/tools` | MCP management |
| Computer | `/computer` | Browser control |
| Settings | `/settings` | Configuration |

---

*Last updated: January 2026*
