# Artifacts System

Complete artifact/canvas system similar to Claude's Artifacts feature for displaying and managing code, documents, diagrams, and data.

## Features

### CodeArtifact Component
- **Monaco-style code editor** with syntax highlighting
- **25+ languages** supported (TypeScript, Python, Java, Go, Rust, etc.)
- **Copy, download, and run buttons**
- **Language selector** dropdown
- **Line numbers** with dynamic width
- **Fullscreen mode** for better viewing
- **Editable mode** with change tracking
- **Mobile-friendly** with touch interactions

### ArtifactPanel Component
- **Sliding panel** (right or bottom position)
- **Version history** with restore functionality
- **Edit mode** with save/discard
- **Touch gestures** for closing (swipe)
- **Responsive design** adapts to screen size
- **Safe area support** for mobile notches

### ArtifactExtractor Service
- **Extract code blocks** from markdown fenced code
- **Detect artifact types** (code, document, diagram, data)
- **Parse languages** from code fences
- **Generate metadata** automatically
- **Support inline artifacts** with file paths
- **Version tracking** built-in

## Installation

The components are already set up in your project. Just import them:

```typescript
import { CodeArtifact, ArtifactPanel } from '@/components/Artifacts';
```

## Usage Examples

### Basic Code Display

```tsx
import { CodeArtifact } from '@/components/Artifacts';

export default function MyComponent() {
  const code = `function hello() {
  console.log('Hello, world!');
}`;

  return (
    <CodeArtifact
      id="demo-1"
      content={code}
      language="typescript"
      title="Hello World"
      filename="hello.ts"
    />
  );
}
```

### Editable Code with Save

```tsx
import { CodeArtifact } from '@/components/Artifacts';
import { useState } from 'react';

export default function EditableCode() {
  const [code, setCode] = useState('const x = 1;');

  return (
    <CodeArtifact
      id="editable"
      content={code}
      language="javascript"
      editable={true}
      onChange={setCode}
      onRun={(code) => {
        console.log('Running:', code);
        // Execute code here
      }}
    />
  );
}
```

### Full Artifact Panel

```tsx
import { ArtifactPanel } from '@/components/Artifacts';
import { useState } from 'react';

export default function ArtifactDemo() {
  const [isOpen, setIsOpen] = useState(false);

  const artifact = {
    id: 'art-1',
    type: 'code' as const,
    title: 'User Service',
    filename: 'userService.ts',
    content: 'export class UserService {...}',
    language: 'typescript' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 3,
    description: 'User authentication service'
  };

  const versions = [
    {
      version: 1,
      content: 'export class UserService {}',
      timestamp: new Date(Date.now() - 86400000),
      description: 'Initial version'
    },
    {
      version: 2,
      content: 'export class UserService { login() {} }',
      timestamp: new Date(Date.now() - 43200000),
      description: 'Added login method'
    },
    {
      version: 3,
      content: artifact.content,
      timestamp: artifact.updatedAt,
      description: 'Current version'
    }
  ];

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        View Artifact
      </button>

      <ArtifactPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        artifact={artifact}
        versions={versions}
        onSave={(id, content) => {
          console.log('Saving:', id, content);
        }}
        onRestoreVersion={(id, version) => {
          console.log('Restoring version:', version);
        }}
        onRun={(id, code) => {
          console.log('Running:', code);
        }}
      />
    </>
  );
}
```

### Backend: Extract Artifacts from AI Response

```typescript
import { ArtifactExtractor, ArtifactType } from '@/services/artifact-extractor';
import pino from 'pino';

const logger = pino();
const extractor = new ArtifactExtractor(logger);

// AI response with code blocks
const aiResponse = `
Here's a TypeScript function:

\`\`\`typescript
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
\`\`\`

And here's a Python example:

\`\`\`python
def calculate_total(items):
    return sum(item.price for item in items)
\`\`\`
`;

// Extract all artifacts
const artifacts = extractor.extractAll(aiResponse, 'conversation-123');

artifacts.forEach((artifact) => {
  console.log('Found artifact:', {
    id: artifact.metadata.id,
    type: artifact.metadata.type,
    language: artifact.metadata.language,
    title: artifact.metadata.title,
    lines: artifact.metadata.lineCount
  });
});

// Save to database
for (const artifact of artifacts) {
  await artifactManager.create({
    task_id: 'task-123',
    name: artifact.metadata.title,
    type: artifact.metadata.type,
    storage_path: `/artifacts/${artifact.metadata.id}`,
    mime_type: `text/${artifact.metadata.language || 'plain'}`,
    size_bytes: artifact.metadata.characterCount,
    metadata: {
      language: artifact.metadata.language,
      lineCount: artifact.metadata.lineCount,
      version: artifact.metadata.version
    }
  });
}
```

### Full Integration Example

```tsx
'use client';

import { useState } from 'react';
import { ArtifactPanel, Artifact } from '@/components/Artifacts';
import { useQuery } from '@tanstack/react-query';

export default function ChatWithArtifacts() {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  // Fetch artifacts from backend
  const { data: artifacts } = useQuery({
    queryKey: ['artifacts'],
    queryFn: () => fetch('/api/artifacts').then(r => r.json())
  });

  // Fetch version history when artifact selected
  const { data: versions } = useQuery({
    queryKey: ['artifact-versions', selectedArtifact?.id],
    queryFn: () =>
      fetch(`/api/artifacts/${selectedArtifact?.id}/versions`).then(r => r.json()),
    enabled: !!selectedArtifact
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Chat messages */}
      <div className="flex-1 overflow-auto p-4">
        {/* Your chat UI here */}

        {/* Artifact buttons */}
        <div className="flex gap-2 flex-wrap mt-4">
          {artifacts?.map((artifact: Artifact) => (
            <button
              key={artifact.id}
              onClick={() => setSelectedArtifact(artifact)}
              className="px-4 py-2 bg-indigo-600 rounded-lg"
            >
              View {artifact.title}
            </button>
          ))}
        </div>
      </div>

      {/* Artifact Panel */}
      <ArtifactPanel
        isOpen={!!selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
        artifact={selectedArtifact || undefined}
        versions={versions}
        onSave={async (id, content) => {
          await fetch(`/api/artifacts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ content })
          });
        }}
        onRestoreVersion={async (id, version) => {
          await fetch(`/api/artifacts/${id}/restore`, {
            method: 'POST',
            body: JSON.stringify({ version })
          });
        }}
        position="right"
      />
    </div>
  );
}
```

## API Reference

### CodeArtifact Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | Required | Unique identifier |
| `content` | `string` | Required | Code content to display |
| `language` | `CodeLanguage` | `'plaintext'` | Programming language |
| `filename` | `string` | Optional | Filename to display |
| `title` | `string` | Optional | Title for the artifact |
| `editable` | `boolean` | `false` | Whether code is editable |
| `onChange` | `(content: string) => void` | Optional | Called when content changes |
| `onRun` | `(code: string) => void` | Optional | Called when run button clicked |
| `showLineNumbers` | `boolean` | `true` | Show line numbers |
| `maxHeight` | `string` | `'600px'` | Maximum height before scrolling |
| `fullscreen` | `boolean` | `false` | Start in fullscreen mode |

### ArtifactPanel Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | Required | Whether panel is visible |
| `onClose` | `() => void` | Required | Called when panel closes |
| `artifact` | `Artifact` | Optional | Current artifact to display |
| `versions` | `ArtifactVersion[]` | `[]` | Version history |
| `onSave` | `(id: string, content: string) => void` | Optional | Save handler |
| `onRestoreVersion` | `(id: string, version: number) => void` | Optional | Restore handler |
| `onRun` | `(id: string, code: string) => void` | Optional | Run code handler |
| `position` | `'right' \| 'bottom'` | `'right'` | Panel position |
| `allowEdit` | `boolean` | `true` | Allow editing |

### ArtifactExtractor Methods

#### `extractAll(responseText: string, conversationId?: string): ExtractedArtifact[]`

Extract all artifacts from AI response text.

#### `updateArtifact(original: ExtractedArtifact, newContent: string): ExtractedArtifact`

Update artifact with new content (increments version).

#### `resetCounter(): void`

Reset the internal counter (useful for testing).

## Supported Languages

TypeScript, JavaScript, TSX, JSX, Python, Java, C++, C, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, SQL, HTML, CSS, SCSS, JSON, YAML, XML, Markdown, Bash, Shell, PowerShell, Plain Text

## Mobile Optimizations

- **Touch targets**: Minimum 44x44px for all interactive elements
- **Swipe gestures**: Swipe down (bottom panel) or right (side panel) to close
- **Safe areas**: Respects device notches and home indicators
- **Responsive**: Adapts to screen size (full width on mobile, fixed width on desktop)
- **Scrolling**: iOS momentum scrolling enabled
- **Keyboard**: Proper keyboard handling for text inputs

## Styling

Uses Tailwind CSS with custom classes:
- `.tap-target`: Touch-friendly minimum size
- `.scroll-container`: iOS smooth scrolling
- `.card`: Consistent card styling
- `.btn-primary`, `.btn-secondary`: Button styles

All colors use the project's dark theme palette (slate, indigo, purple).

## TypeScript Support

Full TypeScript support with exported types:
- `CodeLanguage`
- `CodeArtifactProps`
- `Artifact`
- `ArtifactType`
- `ArtifactVersion`
- `ArtifactPanelProps`
- `ArtifactMetadata`
- `ExtractedArtifact`

## License

Part of LibreChat Meta Agent project.
