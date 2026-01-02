# Computer Use System

A powerful browser automation and computer use system for the LibreChat Meta Agent, similar to Claude's computer use feature.

## Features

### Browser Automation
- Launch and control headless Chrome browser
- Navigate to URLs
- Click elements (by selector or coordinates)
- Type text into input fields
- Press keyboard keys
- Scroll pages
- Take screenshots
- Download files
- Fill forms automatically

### AI-Powered Capabilities
- **Vision-based Screen Analysis**: Uses Claude's vision API to understand what's on screen
- **Element Detection**: Automatically detect interactive elements (buttons, links, inputs)
- **Task Planning**: Break down high-level tasks into executable steps
- **Smart Recovery**: Automatically retry and adapt when actions fail
- **Natural Language Control**: Execute complex tasks with simple descriptions

### UI Features
- Real-time screenshot display
- Click overlay for direct interaction
- Action toolbar with multiple modes
- URL navigation bar
- Task execution input
- Action history sidebar
- Element highlighting and analysis
- Recording and playback
- Fullscreen mode
- Zoom controls

## Architecture

### Backend Services

#### 1. Computer Use Engine (`computer-use.ts`)
Main orchestrator that manages sessions, coordinates actions, and maintains state.

**Key Methods:**
- `startBrowserSession()` - Start a new browser session
- `navigate()` - Navigate to a URL
- `click()` - Click at coordinates or selector
- `type()` - Type text
- `scroll()` - Scroll the page
- `screenshot()` - Take a screenshot
- `analyzeScreen()` - Analyze current screen with AI
- `executeTask()` - Execute high-level task with AI planning
- `endSession()` - End the session

#### 2. Browser Engine (`browser-engine.ts`)
Playwright-based browser automation engine.

**Features:**
- Headless Chrome with configurable viewport
- Cookie/session persistence
- Multi-tab support
- Dialog handling
- JavaScript execution
- File downloads/uploads
- Element selection and interaction

#### 3. Screen Analyzer (`screen-analyzer.ts`)
Vision-based screen understanding using Claude's multimodal API.

**Capabilities:**
- Screenshot analysis
- Element detection
- Form field identification
- Accessibility descriptions
- Change detection between screenshots
- Element search by natural language

#### 4. Task Planner (`task-planner.ts`)
AI-powered task decomposition and execution.

**Features:**
- Task breakdown into atomic steps
- Step execution with error handling
- Goal verification
- Automatic recovery from failures
- Action sequence optimization

### API Routes

```
POST   /api/computer/start                      - Start browser session
POST   /api/computer/:sessionId/end             - End session
GET    /api/computer/sessions                   - Get user sessions

POST   /api/computer/:sessionId/navigate        - Navigate to URL
POST   /api/computer/:sessionId/click           - Click element
POST   /api/computer/:sessionId/type            - Type text
POST   /api/computer/:sessionId/key             - Press key
POST   /api/computer/:sessionId/scroll          - Scroll page
POST   /api/computer/:sessionId/fill-form       - Fill form
POST   /api/computer/:sessionId/download        - Download file

GET    /api/computer/:sessionId/screenshot      - Get screenshot
POST   /api/computer/:sessionId/analyze         - Analyze screen
GET    /api/computer/:sessionId/element-at      - Get element at position

POST   /api/computer/:sessionId/task            - Execute AI task
POST   /api/computer/:sessionId/pause           - Pause session
POST   /api/computer/:sessionId/resume          - Resume session
GET    /api/computer/:sessionId/history         - Get action history

WS     /ws/computer/:sessionId                  - Real-time updates
```

### Database Schema

**Tables:**
- `computer_sessions` - Browser sessions
- `computer_actions` - Individual actions
- `saved_workflows` - User-defined workflows
- `workflow_executions` - Workflow execution history
- `screen_snapshots` - Screenshots and analysis
- `element_interactions` - Element interaction tracking
- `computer_task_executions` - AI task execution history
- `computer_downloads` - Downloaded files
- `computer_session_analytics` - Session analytics

## Usage

### Starting a Session

```typescript
import { ComputerUse } from '@/components/Computer';

function MyApp() {
  return (
    <ComputerUse
      userId="user-123"
      onSessionStart={(sessionId) => console.log('Session started:', sessionId)}
      onActionComplete={(action) => console.log('Action completed:', action)}
    />
  );
}
```

### API Usage

```typescript
// Start session
const response = await fetch('/api/computer/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    config: {
      viewport: { width: 1280, height: 720 },
      headless: true,
    },
  }),
});

const { data } = await response.json();
const sessionId = data.sessionId;

// Navigate to URL
await fetch(`/api/computer/${sessionId}/navigate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://google.com' }),
});

// Execute AI task
await fetch(`/api/computer/${sessionId}/task`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: 'Search for "artificial intelligence" and click the first result',
  }),
});

// End session
await fetch(`/api/computer/${sessionId}/end`, {
  method: 'POST',
});
```

### WebSocket for Real-time Updates

```typescript
const ws = new WebSocket(`ws://localhost:3000/ws/computer/${sessionId}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'screenshot':
      // New screenshot available
      console.log('Screenshot:', data.data.screenshot);
      break;
    case 'action':
      // Action completed
      console.log('Action:', data.data.action);
      break;
    case 'session_update':
      // Session status changed
      console.log('Status:', data.data.status);
      break;
  }
};

// Request screenshot
ws.send(JSON.stringify({ type: 'get_screenshot' }));
```

## AI Task Examples

### Simple Navigation
```
Task: "Go to Google and search for cats"
```

### Form Filling
```
Task: "Fill in the contact form with name 'John Doe' and email 'john@example.com', then submit"
```

### Data Extraction
```
Task: "Find the price of the first product on this page"
```

### Complex Workflows
```
Task: "Log in to the admin panel using the credentials in the form, navigate to users section, and count how many users are registered"
```

## Configuration

### Environment Variables

```env
ANTHROPIC_API_KEY=your_api_key_here
```

### Browser Configuration

```typescript
{
  headless: true,              // Run in headless mode
  viewport: {
    width: 1280,              // Viewport width
    height: 720               // Viewport height
  },
  userAgent: '...',           // Custom user agent
  timeout: 30000,             // Default timeout (ms)
  recordVideo: false          // Record video of session
}
```

## Security Considerations

1. **Session Isolation**: Each session runs in an isolated browser context
2. **User Authorization**: Sessions are tied to user IDs
3. **Timeout Limits**: Sessions automatically timeout after inactivity
4. **Resource Limits**: Configurable limits on concurrent sessions
5. **Download Sandboxing**: Downloads are stored in isolated directories
6. **URL Validation**: URLs are validated before navigation

## Performance Tips

1. **Use Headless Mode**: Headless browsers are faster
2. **Optimize Viewport**: Smaller viewports load faster
3. **Batch Actions**: Use AI tasks for multiple actions
4. **Enable Recording Only When Needed**: Video recording impacts performance
5. **Clean Up Sessions**: End sessions when done to free resources

## Troubleshooting

### Browser Won't Start
- Check that Chromium dependencies are installed
- Verify sufficient system resources
- Check Docker/container permissions

### Actions Failing
- Increase timeout values
- Use vision analysis to verify element selectors
- Check for dynamic content that needs waiting

### WebSocket Disconnecting
- Check network stability
- Verify WebSocket proxy configuration
- Implement reconnection logic

### Screenshots Not Updating
- Verify session is active
- Check WebSocket connection
- Manually refresh screenshot

## Dependencies

```json
{
  "playwright": "^1.40.0",
  "@anthropic-ai/sdk": "^0.9.0",
  "ws": "^8.14.0",
  "uuid": "^9.0.0"
}
```

## Database Setup

Run the schema migration:

```bash
psql -U postgres -d librechat -f schemas/008_computer_schema.sql
```

## Development

### Running Tests

```bash
npm test -- computer-use
```

### Debug Mode

Set environment variable:
```bash
DEBUG=computer:* npm start
```

## Roadmap

- [ ] Desktop automation (beyond browser)
- [ ] OCR for non-HTML content
- [ ] Screen recording playback
- [ ] Workflow templates library
- [ ] Multi-browser support (Firefox, Safari)
- [ ] Mobile device emulation
- [ ] Parallel session execution
- [ ] Advanced element detection algorithms

## License

Part of the LibreChat Meta Agent system.
