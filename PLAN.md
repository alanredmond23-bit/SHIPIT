# Implementation Plan: Functional Engines & UI Redesign

## Overview
Transform the decision frameworks and benchmark systems into fully functional engines, and redesign the Electron app UI with a classy minimalist aesthetic using teal accents.

---

## Part 1: Functional Engines

### 1.1 Decision Framework Engine
**Goal**: Make frameworks interactive and produce real outputs

#### Tasks:
- [ ] Create `DecisionEngine` class with state management
- [ ] Implement step-by-step framework wizard flow
- [ ] Add real-time scoring calculations
- [ ] Build Regret Minimization calculator with visualization
- [ ] Build Type 1/Type 2 decision tree with branching logic
- [ ] Build Inversion analysis with failure mode tracking
- [ ] Build MECE breakdown tool with overlap detection
- [ ] Build BCG Matrix plotter with quadrant recommendations
- [ ] Create bias detection system that analyzes user inputs
- [ ] Add AI-powered decision analysis (Claude integration)
- [ ] Export decisions to PDF/Markdown

### 1.2 Benchmark Engine
**Goal**: Real-time model comparison with live data

#### Tasks:
- [ ] Create `BenchmarkEngine` class with caching
- [ ] Build API integrations to fetch live scores:
  - Artificial Analysis API
  - LM Arena API
  - Official provider APIs
- [ ] Implement model comparison calculator
- [ ] Build price-performance optimizer
- [ ] Create recommendation engine with weighted scoring
- [ ] Add benchmark history tracking (show trends over time)
- [ ] Build interactive comparison charts (Chart.js/Recharts)

### 1.3 MCP Integration Engine
**Goal**: Actually connect and use MCP servers

#### Tasks:
- [ ] Create `MCPManager` class for server lifecycle
- [ ] Implement server installation scripts
- [ ] Build configuration generator UI
- [ ] Add server health checking
- [ ] Create tool invocation wrapper
- [ ] Build MCP server marketplace/browser

---

## Part 2: UI Redesign - Classy Minimalism

### Design System (Based on Reference Image)

#### Color Palette:
```css
/* Primary - Teal Accent (replacing orange) */
--teal-50: #f0fdfa;
--teal-100: #ccfbf1;
--teal-200: #99f6e4;
--teal-300: #5eead4;
--teal-400: #2dd4bf;
--teal-500: #14b8a6;  /* Primary accent */
--teal-600: #0d9488;
--teal-700: #0f766e;

/* Neutrals - Warm grays for elegance */
--warm-50: #fafaf9;   /* Background */
--warm-100: #f5f5f4;  /* Cards */
--warm-200: #e7e5e4;  /* Borders */
--warm-300: #d6d3d1;
--warm-400: #a8a29e;
--warm-500: #78716c;  /* Muted text */
--warm-700: #44403c;  /* Secondary text */
--warm-900: #1c1917;  /* Primary text */

/* Background */
--bg-primary: #fafaf9;
--bg-card: #ffffff;
```

#### Typography:
- **Headings**: Inter or SF Pro Display, light weight (300-400)
- **Body**: Inter, regular (400)
- **Large titles**: 2.5-3rem, letter-spacing: -0.02em
- **Clean, airy feel with generous line-height (1.6-1.8)**

#### Layout Principles:
- **Generous whitespace** - minimum 24px padding
- **Card-based design** with subtle borders (not shadows)
- **Asymmetric layouts** like the reference (content left, cards right)
- **Geometric accents** - subtle line art decorations
- **Floating action buttons** with teal accent

### 2.1 Core UI Components to Build

#### Tasks:
- [ ] Create new design tokens file (`design-tokens.ts`)
- [ ] Build `MinimalCard` component (like document cards in image)
- [ ] Build `SelectableCard` with teal checkmark
- [ ] Build `MinimalButton` - text-based with underline
- [ ] Build `AccentButton` - teal filled, rounded
- [ ] Build `IconButton` - circular with subtle bg
- [ ] Build `SectionHeader` with label + large title
- [ ] Build `GeometricDecor` - radial lines decoration
- [ ] Build `DownloadItem` component
- [ ] Build `SelectionBar` - floating bottom bar for bulk actions

### 2.2 Page Layouts to Redesign

#### Dashboard (Home)
- Clean split layout
- Left: Welcome + quick actions
- Right: Recent projects as minimal cards
- Teal accents on interactive elements
- Geometric decoration

#### Benchmark Dashboard
- Left: Filters + category pills
- Right: Leaderboard as clean cards
- Comparison tool with minimal charts
- Use case cards with selection

#### Decision Framework
- Step-by-step wizard with progress
- Clean input forms
- Results displayed in elegant cards
- Export options at bottom

#### Idea-to-Launch
- Phase navigator as horizontal timeline
- Clean card for current phase
- Artifacts as downloadable cards (like reference image)

### 2.3 Performance Optimizations

#### Tasks:
- [ ] Implement virtual scrolling for long lists
- [ ] Add skeleton loading states
- [ ] Lazy load components
- [ ] Optimize re-renders with React.memo
- [ ] Use CSS transforms for animations (GPU accelerated)
- [ ] Reduce bundle size - code split by route
- [ ] Add service worker for offline caching

---

## Part 3: Implementation Order

### Phase 1: Design Foundation (First)
1. Create design tokens and theme
2. Build core UI components
3. Set up component library with examples

### Phase 2: Page Redesigns
1. Redesign Dashboard/Home
2. Redesign Benchmark Dashboard
3. Redesign Decision Framework pages
4. Redesign Idea-to-Launch pages

### Phase 3: Functional Engines
1. Decision Framework Engine
2. Benchmark Engine with live data
3. MCP Integration Engine

### Phase 4: Polish
1. Performance optimizations
2. Animations and transitions
3. Responsive design
4. Accessibility audit

---

## File Structure

```
ui-extensions/
├── styles/
│   ├── design-tokens.ts      # Colors, typography, spacing
│   ├── globals.css           # Base styles
│   └── animations.css        # Smooth transitions
├── components/
│   ├── ui/                   # Core UI components
│   │   ├── MinimalCard.tsx
│   │   ├── SelectableCard.tsx
│   │   ├── MinimalButton.tsx
│   │   ├── AccentButton.tsx
│   │   ├── IconButton.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── GeometricDecor.tsx
│   │   └── SelectionBar.tsx
│   ├── Benchmarks/           # Redesigned
│   ├── DecisionFramework/    # Redesigned
│   └── IdeaToLaunch/         # Redesigned
└── hooks/
    ├── useDecisionEngine.ts
    ├── useBenchmarkEngine.ts
    └── useMCPManager.ts
```

---

## Questions for Clarification

1. **Data persistence**: Should decision sessions be saved to Supabase or local storage?
2. **Live benchmark data**: Should we fetch from APIs on-demand or use scheduled updates?
3. **MCP servers**: Should the app auto-install servers or guide users through manual setup?
4. **Animations**: Prefer subtle micro-interactions or more prominent page transitions?

---

## Estimated Scope

| Component | Files | Lines (est.) |
|-----------|-------|--------------|
| Design System | 8 | ~800 |
| UI Components | 12 | ~1,500 |
| Page Redesigns | 6 | ~2,000 |
| Decision Engine | 4 | ~1,200 |
| Benchmark Engine | 3 | ~800 |
| MCP Engine | 3 | ~600 |
| **Total** | **36** | **~7,000** |
