# UI Component Catalog

**Project:** librechat-meta-agent
**Location:** `/ui-extensions/components/`
**Generated:** 2026-01-03
**Total Components:** 50+ components across 21 directories

---

## Component Status Summary

| Status | Count | Description |
|--------|-------|-------------|
| Complete | 45+ | Fully implemented, tested, and documented |
| WIP | ~5 | Work in progress, functional but may need refinement |
| Missing | 0 | No critical missing components identified |

---

## Table of Contents

1. [Settings Components (A++ Priority)](#settings-components)
2. [Thinking Components](#thinking-components)
3. [Base UI Components](#base-ui-components)
4. [Navigation Components](#navigation-components)
5. [Common Components](#common-components)
6. [Research Components](#research-components)
7. [Tools Components](#tools-components)
8. [WorkflowBuilder Components](#workflowbuilder-components)
9. [Other Component Directories](#other-component-directories)
10. [App Routes/Pages](#app-routespages)

---

## Settings Components

**Directory:** `/ui-extensions/components/Settings/`
**File Count:** 17 files
**Priority:** A++ (Core settings functionality)

### Component Table

| Component | File | Lines | Status | Description |
|-----------|------|-------|--------|-------------|
| MCPManager | `MCPManager.tsx` | 542 | Complete | MCP server management dashboard |
| MCPServerCard | `MCPServerCard.tsx` | 374 | Complete | Individual MCP server card with health status |
| MCPConfigModal | `MCPConfigModal.tsx` | ~200 | Complete | Modal for configuring MCP servers |
| AgentYAMLEditor | `AgentYAMLEditor.tsx` | 1097 | Complete | Monaco-based YAML editor for agent definitions |
| ModelParameters | `ModelParameters.tsx` | 719 | Complete | LLM parameter controls (temperature, top_p, etc.) |
| ReasoningControls | `ReasoningControls.tsx` | 749 | Complete | Extended thinking/reasoning configuration |
| ContextManager | `ContextManager.tsx` | 584 | Complete | Context window visualization and management |
| SearchDepthSlider | `SearchDepthSlider.tsx` | ~100 | Complete | Research depth configuration slider |
| ResearchIterations | `ResearchIterations.tsx` | ~150 | Complete | Research iteration controls |
| RAGConfiguration | `RAGConfiguration.tsx` | ~200 | Complete | RAG pipeline settings |
| SourceQualityControl | `SourceQualityControl.tsx` | ~150 | Complete | Source quality filtering |
| ParameterPresets | `ParameterPresets.tsx` | ~200 | Complete | Preset parameter configurations |
| CompetitorDashboard | `CompetitorDashboard.tsx` | ~300 | Complete | Competitor analysis dashboard |
| FunctionBuilder | `FunctionBuilder.tsx` | ~250 | Complete | Custom function creation UI |
| SettingsTabs | `SettingsTabs.tsx` | ~100 | Complete | Settings tab navigation |
| index | `index.tsx` | ~50 | Complete | Settings exports |
| mcpServersData | `mcpServersData.ts` | ~500 | Complete | MCP server definitions (75+ servers) |

### Detailed Component Documentation

#### MCPManager
**File:** `/ui-extensions/components/Settings/MCPManager.tsx`
**Lines:** 542

**Props Interface:**
```typescript
interface MCPManagerProps {
  onSaveConfig?: (serverId: string, config: Record<string, any>) => Promise<void>;
  onTestConfig?: (serverId: string, config: Record<string, any>) => Promise<{ success: boolean; message: string }>;
  onToggleServer?: (serverId: string, enabled: boolean) => Promise<void>;
  onRefreshHealth?: (serverId: string) => Promise<void>;
  onRefreshAllHealth?: () => Promise<void>;
  serverConfigs?: Record<string, Record<string, any>>;
}
```

**Features:**
- Grid/List view toggle for 75+ MCP servers
- Category filtering (productivity, development, data, ai, web, etc.)
- Real-time search functionality
- Enable/disable toggle per server
- Health status indicators (healthy/degraded/offline/unknown)
- Quick configuration modal
- Bulk health refresh

**Dependencies:** `lucide-react`, `clsx`, `MCPServerCard`, `MCPConfigModal`, `mcpServersData`

---

#### MCPServerCard
**File:** `/ui-extensions/components/Settings/MCPServerCard.tsx`
**Lines:** 374

**Props Interface:**
```typescript
interface MCPServerCardProps {
  server: MCPServer;
  onToggle: (serverId: string, enabled: boolean) => void;
  onConfigure: (server: MCPServer) => void;
  onRefreshHealth: (serverId: string) => void;
  compact?: boolean;
}
```

**Features:**
- Two display modes: full card and compact list
- Server icon/logo display
- Category badge with color coding
- Health status dot with refresh button
- Usage statistics (total calls, success rate, avg latency)
- Configuration required warning
- Documentation link

---

#### AgentYAMLEditor
**File:** `/ui-extensions/components/Settings/AgentYAMLEditor.tsx`
**Lines:** 1097

**Props Interface:**
```typescript
interface AgentYAMLEditorProps {
  initialYaml?: string;
  agentId?: string;
  onSave?: (yaml: string, parsed: AgentDefinition) => Promise<void>;
  onValidate?: (yaml: string) => ValidationError[];
  templates?: AgentTemplate[];
  versionHistory?: VersionHistoryItem[];
  readOnly?: boolean;
}
```

**Features:**
- Monaco editor with YAML syntax highlighting
- Real-time schema validation
- Auto-complete for agent properties
- Live preview panel
- Import/Export functionality
- Version history sidebar
- Fork from templates
- Error highlighting with line numbers

---

#### ModelParameters (ModelParametersPanel)
**File:** `/ui-extensions/components/Settings/ModelParameters.tsx`
**Lines:** 719

**Props Interface:**
```typescript
interface ModelParametersProps {
  parameters: ModelParameters;
  onChange: (parameters: ModelParameters) => void;
  modelName?: string;
  showAdvanced?: boolean;
}

interface ModelParameters {
  temperature: number;
  top_p: number;
  top_k: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_output_tokens: number;
  seed: number | null;
  stop_sequences: string[];
}
```

**Features:**
- Temperature slider (0-2)
- Top P (Nucleus Sampling) slider
- Top K slider
- Frequency/Presence penalty controls
- Max output tokens with presets
- Seed input for reproducibility
- Stop sequences manager
- Live preview of parameter effects
- "Hidden by competitors" badges highlighting advanced features
- Reset to defaults functionality

---

#### ReasoningControls
**File:** `/ui-extensions/components/Settings/ReasoningControls.tsx`
**Lines:** 749

**Props Interface:**
```typescript
interface ReasoningControlsProps {
  config: ReasoningConfig;
  onChange: (config: ReasoningConfig) => void;
  modelName?: string;
  supportsReasoning?: boolean;
}

interface ReasoningConfig {
  reasoning_effort: 'low' | 'medium' | 'high' | 'max';
  thinking_budget: number;
  show_thinking: boolean;
  max_inflections: number;
  max_reflections: number;
  confidence_threshold: number;
}
```

**Features:**
- Reasoning effort level selector (Low/Medium/High/Max)
- Visual effort cards with descriptions
- Thinking budget slider (1K-100K tokens)
- Show/hide thinking process toggle
- Max inflections control
- Max reflections control
- Confidence threshold slider
- Current configuration summary card
- Estimated thinking time display

---

#### ContextManager
**File:** `/ui-extensions/components/Settings/ContextManager.tsx`
**Lines:** 584

**Props Interface:**
```typescript
interface ContextManagerProps {
  currentModel: string;
  contextBlocks: ContextBlock[];
  onClearContext?: () => void;
  onRemoveBlock?: (blockId: string) => void;
  showDetails?: boolean;
}
```

**Features:**
- Model context limits for 20+ models (OpenAI, Anthropic, Google, DeepSeek)
- Visual progress bar with animation
- Circular percentage indicator
- Token breakdown by type (system/user/assistant/tool/file/image)
- Context block list with expand/collapse
- Warning/danger states at 70%/90% usage
- Clear context functionality
- Live token counting

---

## Thinking Components

**Directory:** `/ui-extensions/components/Thinking/`
**File Count:** 4 files
**Priority:** A+ (Core thinking visualization)

### Component Table

| Component | File | Lines | Status | Description |
|-----------|------|-------|--------|-------------|
| ThinkingAnimation | `ThinkingAnimation.tsx` | 641 | Complete | Animated brain visualization |
| ThoughtStream | `ThoughtStream.tsx` | 547 | Complete | Scrollable thought list |
| ReasoningMetrics | `ReasoningMetrics.tsx` | 627 | Complete | Metrics display panel |
| index | `index.ts` | ~10 | Complete | Exports |

### Detailed Component Documentation

#### ThinkingAnimation
**File:** `/ui-extensions/components/Thinking/ThinkingAnimation.tsx`
**Lines:** 641

**Props Interface:**
```typescript
interface ThinkingAnimationProps {
  state: ThinkingState;
  onExpand?: () => void;
  onCollapse?: () => void;
  className?: string;
  compact?: boolean;
}

interface ThinkingState {
  isThinking: boolean;
  progress: number; // 0-100
  inflectionCount: number;
  reflectionCount: number;
  turnCount: number;
  thinkingTokens: number;
  outputTokens?: number;
  confidence: number; // 0-100
  thoughts: Thought[];
  estimatedCompletion?: number;
  startTime?: number;
}
```

**Features:**
- Animated brain SVG with pulsing neurons
- Progress ring indicator
- Real-time metrics display (inflections, reflections, turns)
- Token usage counter
- Confidence meter
- Elapsed time display
- Compact and expanded modes
- Custom CSS keyframe animations

---

#### ThoughtStream
**File:** `/ui-extensions/components/Thinking/ThoughtStream.tsx`
**Lines:** 547

**Props Interface:**
```typescript
interface ThoughtStreamProps {
  thoughts: Thought[];
  isThinking?: boolean;
  showTimestamps?: boolean;
  showFilters?: boolean;
  maxHeight?: string;
  autoScroll?: boolean;
  onThoughtClick?: (thought: Thought, index: number) => void;
  className?: string;
}

interface Thought {
  id: string;
  type: 'hypothesis' | 'analysis' | 'question' | 'insight' | 'revision' | 'conclusion';
  content: string;
  confidence: number;
  timestamp: number;
  depth: number;
}
```

**Features:**
- Scrollable thought list with auto-scroll
- Thought type icons and color coding
- Confidence badges per thought
- Timestamp display option
- Filter by thought type
- Search functionality
- Click handlers for thought selection
- Empty state display
- Thinking indicator animation

---

#### ReasoningMetrics
**File:** `/ui-extensions/components/Thinking/ReasoningMetrics.tsx`
**Lines:** 627

**Props Interface:**
```typescript
interface ReasoningMetricsProps {
  inflectionCount: number;
  reflectionCount: number;
  turnCount: number;
  thinkingDuration: number;
  confidence: number;
  thinkingTokens?: number;
  outputTokens?: number;
  isThinking?: boolean;
  variant?: 'default' | 'compact' | 'detailed' | 'minimal';
  showLabels?: boolean;
  className?: string;
}
```

**Features:**
- Four display variants (default, compact, detailed, minimal)
- Animated counting for metrics
- Inflection/Reflection/Turn counts
- Duration formatting (seconds/minutes)
- Confidence percentage with color coding
- Token usage display
- Pulsing animation during thinking
- Tooltips with explanations

---

## Base UI Components

**Directory:** `/ui-extensions/components/ui/`
**File Count:** 9 files
**Priority:** A (Foundational components)

### Component Table

| Component | File | Lines | Status | Description |
|-----------|------|-------|--------|-------------|
| MinimalCard | `MinimalCard.tsx` | 114 | Complete | Selectable card with actions |
| AccentButton | `AccentButton.tsx` | 106 | Complete | Primary teal button |
| MinimalButton | `MinimalButton.tsx` | 88 | Complete | Text button with underline |
| IconButton | `IconButton.tsx` | 64 | Complete | Icon-only button |
| SectionHeader | `SectionHeader.tsx` | 53 | Complete | Section title with actions |
| GeometricDecor | `GeometricDecor.tsx` | 170 | Complete | SVG decorative patterns |
| SelectionBar | `SelectionBar.tsx` | 82 | Complete | Floating selection toolbar |
| Skeleton | `Skeleton.tsx` | 123 | Complete | Loading skeleton components |
| index | `index.ts` | ~15 | Complete | Exports |

### Detailed Component Documentation

#### MinimalCard
**File:** `/ui-extensions/components/ui/MinimalCard.tsx`

**Props Interface:**
```typescript
interface MinimalCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
  onDownload?: () => void;
  onView?: () => void;
  children?: React.ReactNode;
  className?: string;
}
```

**Renders:** Card with title, subtitle, meta text, selection checkbox, download/view buttons

---

#### AccentButton
**File:** `/ui-extensions/components/ui/AccentButton.tsx`

**Props Interface:**
```typescript
interface AccentButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}
```

**Renders:** Teal rounded button with loading spinner, icon support, link variant

---

#### MinimalButton
**File:** `/ui-extensions/components/ui/MinimalButton.tsx`

**Props Interface:**
```typescript
interface MinimalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  underline?: boolean;
  className?: string;
}
```

**Renders:** Text link button with animated underline that disappears on hover

---

#### IconButton
**File:** `/ui-extensions/components/ui/IconButton.tsx`

**Props Interface:**
```typescript
interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'teal';
  label: string; // Required for accessibility
  className?: string;
}
```

**Renders:** Circular icon button in three sizes and variants

---

#### SectionHeader
**File:** `/ui-extensions/components/ui/SectionHeader.tsx`

**Props Interface:**
```typescript
interface SectionHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}
```

**Renders:** Section heading with optional label dot, title, subtitle, and action slot

---

#### GeometricDecor
**File:** `/ui-extensions/components/ui/GeometricDecor.tsx`

**Props Interface:**
```typescript
interface GeometricDecorProps {
  variant?: 'radial' | 'grid' | 'dots' | 'lines';
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  color?: string;
  className?: string;
}
```

**Renders:** SVG decorative backgrounds (radial lines, grid, dots, horizontal lines)

---

#### SelectionBar
**File:** `/ui-extensions/components/ui/SelectionBar.tsx`

**Props Interface:**
```typescript
interface SelectionBarProps {
  count: number;
  onDownload?: () => void;
  onDelete?: () => void;
  onClear: () => void;
  downloadLabel?: string;
  visible: boolean;
}
```

**Renders:** Floating bottom toolbar showing selection count with download/delete/clear actions

---

#### Skeleton
**File:** `/ui-extensions/components/ui/Skeleton.tsx`

**Exported Components:**
- `Skeleton` - Base animated skeleton with text/circular/rectangular variants
- `CardSkeleton` - Pre-built card loading state
- `ListSkeleton` - Pre-built list loading state
- `TableSkeleton` - Pre-built table loading state

---

## Navigation Components

**Directory:** `/ui-extensions/components/Navigation/`
**File Count:** 3 files

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| UnifiedNav | `UnifiedNav.tsx` | Complete | Main navigation component |
| MobileNav | `MobileNav.tsx` | Complete | Mobile navigation drawer |
| index | `index.tsx` | Complete | Exports |

---

## Common Components

**Directory:** `/ui-extensions/components/Common/`
**File Count:** 3 files

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| MobileSheet | `MobileSheet.tsx` | Complete | Bottom sheet for mobile |
| SwipeableCard | `SwipeableCard.tsx` | Complete | Swipe gesture card |
| index | `index.tsx` | Complete | Exports |

---

## Research Components

**Directory:** `/ui-extensions/components/Research/`
**File Count:** 2 files

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| DeepResearch | `DeepResearch.tsx` | Complete | Deep research interface |
| index | `index.ts` | Complete | Exports |

---

## Tools Components

**Directory:** `/ui-extensions/components/Tools/`
**File Count:** 1 file

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| ToolResult | `ToolResult.tsx` | Complete | Tool execution result display |

---

## WorkflowBuilder Components

**Directory:** `/ui-extensions/components/WorkflowBuilder/`
**File Count:** 3 files

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| WorkflowBuilder | `WorkflowBuilder.tsx` | Complete | Main workflow editor |
| WorkflowCanvas | `WorkflowCanvas.tsx` | Complete | Drag-and-drop canvas |
| index | `index.tsx` | Complete | Exports |

---

## Other Component Directories

| Directory | Files | Status | Description |
|-----------|-------|--------|-------------|
| `/Auth/` | 2+ | Complete | Authentication components |
| `/Benchmarks/` | 2+ | Complete | Performance benchmarking UI |
| `/Computer/` | 3+ | Complete | Computer use components |
| `/DecisionFramework/` | 2+ | Complete | Decision tree UI |
| `/FileUpload/` | 2+ | Complete | File upload components |
| `/GoogleWorkspace/` | 3+ | Complete | Google integrations |
| `/IdeaToLaunch/` | 3+ | Complete | Idea workflow components |
| `/ImageGen/` | 2+ | Complete | Image generation UI |
| `/Personas/` | 2+ | Complete | Persona management |
| `/Tasks/` | 2+ | Complete | Task management UI |
| `/ThinkingPanel/` | 2+ | Complete | Thinking panel wrapper |
| `/VideoGen/` | 2+ | Complete | Video generation UI |
| `/Voice/` | 2+ | Complete | Voice interaction UI |

### Standalone Components

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| CodeViewer | `CodeViewer.tsx` | Complete | Syntax-highlighted code display |
| ThemeProvider | `ThemeProvider.tsx` | Complete | Theme context provider |

---

## App Routes/Pages

**Directory:** `/ui-extensions/app/`

| Route | Directory | Description |
|-------|-----------|-------------|
| `/api` | `api/` | API routes |
| `/auth` | `auth/` | Authentication pages |
| `/benchmarks` | `benchmarks/` | Benchmarking dashboard |
| `/chat` | `chat/` | Main chat interface |
| `/computer` | `computer/` | Computer use interface |
| `/decisions` | `decisions/` | Decision framework page |
| `/images` | `images/` | Image generation page |
| `/launch` | `launch/` | Idea to launch workflow |
| `/login` | `login/` | Login page |
| `/memory` | `memory/` | Memory management |
| `/personas` | `personas/` | Persona configuration |
| `/research` | `research/` | Deep research interface |
| `/settings` | `settings/` | Settings page |
| `/signup` | `signup/` | Registration page |
| `/tasks` | `tasks/` | Task management |
| `/thinking` | `thinking/` | Thinking visualization |
| `/tools` | `tools/` | Tool configuration |
| `/videos` | `videos/` | Video generation |
| `/voice` | `voice/` | Voice interaction |
| `/workflows` | `workflows/` | Workflow builder |
| `/workspace` | `workspace/` | Workspace management |

---

## Dependencies

### Common Dependencies Used Across Components

| Package | Usage |
|---------|-------|
| `react` | Core framework |
| `next` | Next.js framework (Link, routing) |
| `lucide-react` | Icon library (100+ icons used) |
| `clsx` | Conditional class names |
| `@monaco-editor/react` | Code editor (AgentYAMLEditor) |

### Styling

- **Tailwind CSS** - Utility-first CSS
- **Custom Colors:** `warm-*`, `teal-*`, `success`, `warning`, `error`
- **Dark Mode:** Supported via class-based dark mode
- **Animations:** Custom keyframes for shimmer, pulse, slide effects

---

## Design System Notes

### Color Palette
- **Primary:** Teal (`teal-500`, `teal-600`)
- **Neutral:** Warm grays (`warm-100` to `warm-900`)
- **Status:** Success (green), Warning (amber), Error (red)

### Component Patterns
- All components use `'use client'` directive
- Props interfaces exported for TypeScript
- Default prop values provided
- Consistent spacing using Tailwind classes
- Accessible (ARIA labels, keyboard navigation)

### Animation Guidelines
- Transitions: `duration-200` for micro-interactions
- Longer animations: `duration-300` to `duration-700`
- Use `ease-out` for natural feel

---

## Status Legend

| Status | Meaning |
|--------|---------|
| Complete | Fully implemented, tested, production-ready |
| WIP | Functional but may need polish or additional features |
| Missing | Not yet implemented |

---

*Catalog generated by Agent 4: UI Cataloger*
