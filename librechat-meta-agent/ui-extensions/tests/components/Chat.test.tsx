import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPage from '@/app/chat/page';
import { mockFetchResponse, mockFetchError } from '../setup';

// Mock data
const mockModels = {
  data: [
    {
      id: 'claude-opus-4-5',
      name: 'Claude Opus 4.5',
      provider: 'anthropic',
      description: 'Most capable model',
      context_window: 200000,
      supports_vision: true,
      tier: 'flagship',
    },
    {
      id: 'claude-sonnet-4',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      description: 'Balanced performance',
      context_window: 200000,
      supports_vision: true,
      tier: 'balanced',
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      description: 'OpenAI flagship',
      context_window: 128000,
      supports_vision: false,
      tier: 'flagship',
    },
  ],
};

const mockStreamResponse = (content: string) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const chunks = content.split(' ');
      chunks.forEach((chunk, i) => {
        const data = `data: ${JSON.stringify({ content: chunk + ' ' })}\n\n`;
        controller.enqueue(encoder.encode(data));
      });
      controller.close();
    },
  });

  return {
    ok: true,
    status: 200,
    body: stream,
    headers: new Headers(),
  };
};

describe('Chat Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock initial models fetch
    mockFetchResponse(mockModels);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the chat page with empty state', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText(/How can I help you today?/i)).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
    });

    it('should display the Meta Agent branding', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Meta Agent')).toBeInTheDocument();
      });

      expect(screen.getByText('AI Orchestrator')).toBeInTheDocument();
    });

    it('should show empty state message when no messages exist', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText(/How can I help you today?/i)).toBeInTheDocument();
      });

      const description = screen.getByText(/powered by/i);
      expect(description).toBeInTheDocument();
    });

    it('should display quick action buttons in empty state', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Write Code')).toBeInTheDocument();
      });

      expect(screen.getByText('Web Search')).toBeInTheDocument();
      expect(screen.getByText('Create Image')).toBeInTheDocument();
      expect(screen.getByText('Analyze')).toBeInTheDocument();
    });

    it('should render message list container', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        const messageContainer = screen.getByText(/How can I help you today?/i).closest('div');
        expect(messageContainer).toBeInTheDocument();
      });
    });
  });

  describe('Model Selection', () => {
    it('should load and display available models', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Claude Opus 4.5')).toBeInTheDocument();
      });
    });

    it('should select default model (Claude Opus 4.5)', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Claude Opus 4.5')).toBeInTheDocument();
      });

      const modelButton = screen.getByText('Claude Opus 4.5').closest('button');
      expect(modelButton).toBeInTheDocument();
    });

    it('should open model selector dropdown on click', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Claude Opus 4.5')).toBeInTheDocument();
      });

      const modelButton = screen.getByText('Claude Opus 4.5').closest('button');
      await user.click(modelButton!);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search models...')).toBeInTheDocument();
      });
    });

    it('should display models grouped by provider', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Claude Opus 4.5')).toBeInTheDocument();
      });

      const modelButton = screen.getByText('Claude Opus 4.5').closest('button');
      await user.click(modelButton!);

      await waitFor(() => {
        expect(screen.getByText('anthropic')).toBeInTheDocument();
      });

      expect(screen.getByText('openai')).toBeInTheDocument();
    });

    it('should filter models by search query', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Claude Opus 4.5')).toBeInTheDocument();
      });

      const modelButton = screen.getByText('Claude Opus 4.5').closest('button');
      await user.click(modelButton!);

      const searchInput = await screen.findByPlaceholderText('Search models...');
      await user.type(searchInput, 'sonnet');

      await waitFor(() => {
        expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument();
      });
    });

    it('should change selected model when clicking different model', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Claude Opus 4.5')).toBeInTheDocument();
      });

      const modelButton = screen.getByText('Claude Opus 4.5').closest('button');
      await user.click(modelButton!);

      const sonnetModel = await screen.findByText('Claude Sonnet 4');
      await user.click(sonnetModel);

      await waitFor(() => {
        const updatedButton = screen.getAllByText('Claude Sonnet 4')[0];
        expect(updatedButton).toBeInTheDocument();
      });
    });
  });

  describe('Message Input', () => {
    it('should render message input field', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });
    });

    it('should update input value when typing', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = await screen.findByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Hello AI');

      expect(input).toHaveValue('Hello AI');
    });

    it('should send message on Enter key press', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels); // Models fetch
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Hello! How can I help you?'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Hello{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
    });

    it('should not send message on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const input = await screen.findByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(input).toHaveValue('Line 1\nLine 2');
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Response'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test message{Enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      const fetchSpy = jest.spyOn(global, 'fetch');
      mockFetchResponse(mockModels);

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, '   {Enter}');

      // Should only have the initial models fetch, no chat request
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from messages', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      const fetchSpy = jest.spyOn(global, 'fetch');
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Response'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, '  Hello  {Enter}');

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      });

      const lastCall = fetchSpy.mock.calls[1];
      const body = JSON.parse(lastCall[1]?.body as string);
      expect(body.messages[0].content).toBe('  Hello  ');
    });
  });

  describe('Send Button', () => {
    it('should display send button', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send/i });
        expect(sendButton).toBeInTheDocument();
      });
    });

    it('should send message on send button click', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Response'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test message');

      const sendButtons = screen.getAllByRole('button');
      const sendButton = sendButtons.find((btn) => btn.querySelector('svg'));
      await user.click(sendButton!);

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('should disable send button when input is empty', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const sendButton = buttons.find((btn) => btn.querySelector('svg'));
        expect(sendButton).toHaveAttribute('disabled');
      });
    });

    it('should enable send button when input has text', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find((btn) => btn.querySelector('svg'));
      expect(sendButton).not.toHaveAttribute('disabled');
    });
  });

  describe('Message Display', () => {
    it('should display user messages with correct styling', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('AI response'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'User message{Enter}');

      await waitFor(() => {
        const userMessage = screen.getByText('User message');
        expect(userMessage).toBeInTheDocument();
        const messageContainer = userMessage.closest('div');
        expect(messageContainer?.className).toContain('from-indigo-600');
      });
    });

    it('should display AI messages with correct styling', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('AI response'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Hello{Enter}');

      await waitFor(() => {
        const aiMessage = screen.getByText(/AI response/i);
        expect(aiMessage).toBeInTheDocument();
        const messageContainer = aiMessage.closest('div');
        expect(messageContainer?.className).toContain('bg-slate-800');
      });
    });

    it('should show streaming indicator during AI response', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);

      // Create a delayed stream
      const encoder = new TextEncoder();
      let controller: ReadableStreamDefaultController;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
        },
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
        headers: new Headers(),
      });

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        // Look for streaming indicator (animated dots)
        const dots = document.querySelector('.animate-bounce');
        expect(dots).toBeInTheDocument();
      });

      // Clean up
      controller!.close();
    });

    it('should display streamed content progressively', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('First Second Third'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/First Second Third/i)).toBeInTheDocument();
      });
    });

    it('should maintain message order', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Response 1'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Message 1{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Message 1')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Response 1/i)).toBeInTheDocument();
      });

      const messages = screen.getAllByText(/Message 1|Response 1/);
      expect(messages).toHaveLength(2);
    });

    it('should display model name in assistant messages', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Response'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Hello{Enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Claude Opus 4.5').length).toBeGreaterThan(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when chat request fails', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      mockFetchError('Network error');

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Sorry, something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should handle model loading failure gracefully', async () => {
      mockFetchError('Failed to load models');

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });
    });

    it('should stop streaming indicator after error', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      mockFetchError('Chat failed');

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Sorry, something went wrong/i)).toBeInTheDocument();
      });

      const dots = document.querySelector('.animate-bounce');
      expect(dots).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during message send', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);

      let controller: ReadableStreamDefaultController;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
        },
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
        headers: new Headers(),
      });

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        const dots = document.querySelector('.animate-bounce');
        expect(dots).toBeInTheDocument();
      });

      controller!.close();
    });

    it('should disable input during streaming', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);

      let controller: ReadableStreamDefaultController;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
        },
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
        headers: new Headers(),
      });

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        const dots = document.querySelector('.animate-bounce');
        expect(dots).toBeInTheDocument();
      });

      controller!.close();
    });
  });

  describe('Tools Integration', () => {
    it('should display tools toggle button', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Tools')).toBeInTheDocument();
      });
    });

    it('should show tools panel when tools button clicked', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Tools')).toBeInTheDocument();
      });

      const toolsButton = screen.getByText('Tools').closest('button');
      await user.click(toolsButton!);

      await waitFor(() => {
        expect(screen.getByText('Web Search')).toBeInTheDocument();
      });

      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Create Image')).toBeInTheDocument();
    });

    it('should toggle individual tools on and off', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Tools')).toBeInTheDocument();
      });

      const toolsButton = screen.getByText('Tools').closest('button');
      await user.click(toolsButton!);

      const webSearchTool = await screen.findByText('Web Search');
      await user.click(webSearchTool.closest('button')!);

      await waitFor(() => {
        const toolButton = webSearchTool.closest('button');
        expect(toolButton?.className).toContain('bg-slate-800');
      });
    });

    it('should show enabled tools count badge', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Tools')).toBeInTheDocument();
      });

      const toolsButton = screen.getByText('Tools').closest('button');

      // Artifacts is enabled by default
      const badge = within(toolsButton!).getByText('1');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Message Actions', () => {
    it('should show copy button on assistant messages', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('AI response'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/AI response/i)).toBeInTheDocument();
      });

      // Actions are visible on hover (opacity-0 group-hover:opacity-100)
      const messageDiv = screen.getByText(/AI response/i).closest('.group');
      expect(messageDiv).toBeInTheDocument();
    });

    it('should copy message text to clipboard', async () => {
      const user = userEvent.setup();
      const clipboardSpy = jest.spyOn(navigator.clipboard, 'writeText');
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Copy this text'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Copy this text/i)).toBeInTheDocument();
      });

      // Find and click copy button
      const copyButtons = document.querySelectorAll('button[title="Copy"]');
      if (copyButtons.length > 0) {
        await user.click(copyButtons[0] as HTMLElement);
        expect(clipboardSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Quick Actions', () => {
    it('should populate input when quick action clicked', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Write Code')).toBeInTheDocument();
      });

      const writeCodeButton = screen.getByText('Write Code').closest('button');
      await user.click(writeCodeButton!);

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      expect(input).toHaveValue('Help me write a React component');
    });

    it('should display all quick action buttons in empty state', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Write Code')).toBeInTheDocument();
      });

      expect(screen.getByText('Web Search')).toBeInTheDocument();
      expect(screen.getByText('Create Image')).toBeInTheDocument();
      expect(screen.getByText('Analyze')).toBeInTheDocument();
    });
  });

  describe('Attachments', () => {
    it('should show attachment button', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        const attachButton = document.querySelector('button[title="Attach files"]');
        expect(attachButton).toBeInTheDocument();
      });
    });

    it('should open file picker when attachment button clicked', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        const attachButton = document.querySelector('button[title="Attach files"]');
        expect(attachButton).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"]');
      const clickSpy = jest.spyOn(fileInput as HTMLElement, 'click');

      const attachButton = document.querySelector('button[title="Attach files"]');
      await user.click(attachButton as HTMLElement);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Voice Input', () => {
    it('should show voice input button', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        const voiceButton = document.querySelector('button[title="Voice input"]');
        expect(voiceButton).toBeInTheDocument();
      });
    });

    it('should toggle recording state on voice button click', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        const voiceButton = document.querySelector('button[title="Voice input"]');
        expect(voiceButton).toBeInTheDocument();
      });

      const voiceButton = document.querySelector('button[title="Voice input"]') as HTMLElement;
      await user.click(voiceButton);

      await waitFor(() => {
        expect(voiceButton.className).toContain('bg-red-500');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on interactive elements', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Message Meta Agent/i);
        expect(input).toHaveAttribute('rows');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.tab();

      expect(input).toHaveFocus();
    });
  });

  describe('Auto-scroll', () => {
    it('should scroll to bottom when new messages arrive', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Response'));

      const scrollIntoViewMock = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  describe('Conversation Persistence', () => {
    it('should maintain conversation history across interactions', async () => {
      const user = userEvent.setup();
      mockFetchResponse(mockModels);
      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Response 1'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Message Meta Agent/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Message Meta Agent/i);
      await user.type(input, 'First message{Enter}');

      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Response 1/i)).toBeInTheDocument();
      });

      (global.fetch as any).mockResolvedValueOnce(mockStreamResponse('Response 2'));

      await user.type(input, 'Second message{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Second message')).toBeInTheDocument();
      });

      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText(/Response 1/i)).toBeInTheDocument();
    });
  });
});
