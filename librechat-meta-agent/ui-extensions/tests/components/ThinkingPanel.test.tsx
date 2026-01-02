import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExtendedThinking from '../../components/ThinkingPanel/ExtendedThinking';
import { mockFetchResponse, mockFetchError } from '../setup';

describe('ExtendedThinking Component', () => {
  const mockOnComplete = vi.fn();
  const defaultProps = {
    apiBaseUrl: '/api',
    onComplete: mockOnComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  describe('Initial Render', () => {
    it('should render the start form initially', () => {
      render(<ExtendedThinking {...defaultProps} />);

      expect(screen.getByText('Extended Thinking Engine')).toBeInTheDocument();
      expect(screen.getByText('Start Thinking Session')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('What would you like to think about?')).toBeInTheDocument();
    });

    it('should display feature cards', () => {
      render(<ExtendedThinking {...defaultProps} />);

      expect(screen.getByText('Visual Thought Tree')).toBeInTheDocument();
      expect(screen.getByText('Confidence Scoring')).toBeInTheDocument();
      expect(screen.getByText('Self-Critique')).toBeInTheDocument();
      expect(screen.getByText('Parallel Exploration')).toBeInTheDocument();
    });

    it('should have disabled submit button when query is empty', () => {
      render(<ExtendedThinking {...defaultProps} />);

      const startButton = screen.getByRole('button', { name: /start thinking/i });
      expect(startButton).toBeDisabled();
    });

    it('should load templates on mount', async () => {
      const mockTemplates = [
        { id: 'temp-1', name: 'Scientific Analysis', description: 'For research', category: 'science' },
        { id: 'temp-2', name: 'Business Strategy', description: 'For planning', category: 'business' },
      ];

      mockFetchResponse({ data: mockTemplates });

      render(<ExtendedThinking {...defaultProps} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/thinking/templates');
      });
    });
  });

  describe('Starting a Session', () => {
    it('should start a thinking session when form is submitted', async () => {
      const mockSession = {
        id: 'session-123',
        rootNodeId: 'node-root',
        status: 'thinking',
        stats: {
          branchesExplored: 0,
          averageConfidence: 0,
          totalTokens: 0,
          maxDepthReached: 0,
        },
        config: {
          maxTokens: 10000,
          maxDepth: 10,
        },
      };

      const mockTree = [
        {
          id: 'node-root',
          parentId: null,
          sessionId: 'session-123',
          content: 'Initial thought',
          type: 'observation',
          confidence: 75,
          depth: 0,
          children: [],
          metadata: {
            tokens: 100,
            duration: 500,
            model: 'claude-3-5-sonnet',
            timestamp: new Date(),
          },
          status: 'active',
        },
      ];

      mockFetchResponse({ data: mockSession });
      mockFetchResponse({ data: mockTree });

      render(<ExtendedThinking {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'How can we solve climate change?' } });

      const startButton = screen.getByRole('button', { name: /start thinking/i });
      expect(startButton).not.toBeDisabled();

      fireEvent.click(startButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/thinking/start',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('How can we solve climate change?'),
          })
        );
      });
    });

    it('should show error when query is empty', async () => {
      render(<ExtendedThinking {...defaultProps} />);

      const startButton = screen.getByRole('button', { name: /start thinking/i });
      expect(startButton).toBeDisabled();
    });

    it('should handle API errors gracefully', async () => {
      mockFetchError('Failed to start thinking');

      render(<ExtendedThinking {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'Test query' } });

      const startButton = screen.getByRole('button', { name: /start thinking/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start thinking/i)).toBeInTheDocument();
      });
    });

    it('should include selected template in request', async () => {
      const mockTemplates = [{ id: 'temp-1', name: 'Scientific', description: 'Desc', category: 'sci' }];
      mockFetchResponse({ data: mockTemplates });
      mockFetchResponse({ data: { id: 'session-123', rootNodeId: 'root', status: 'thinking', stats: {}, config: {} } });
      mockFetchResponse({ data: [] });

      render(<ExtendedThinking {...defaultProps} />);

      await waitFor(() => expect(screen.getByText('Scientific')).toBeInTheDocument());

      const templateSelect = screen.getByRole('combobox', { name: /reasoning template/i });
      fireEvent.change(templateSelect, { target: { value: 'temp-1' } });

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'Test' } });

      const startButton = screen.getByRole('button', { name: /start thinking/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/thinking/start',
          expect.objectContaining({
            body: expect.stringContaining('temp-1'),
          })
        );
      });
    });
  });

  describe('Session Display', () => {
    it('should display session statistics', async () => {
      const mockSession = {
        id: 'session-123',
        rootNodeId: 'node-root',
        status: 'thinking',
        stats: {
          branchesExplored: 15,
          averageConfidence: 82.5,
          totalTokens: 5000,
          maxDepthReached: 5,
        },
        config: {
          maxTokens: 10000,
          maxDepth: 10,
        },
      };

      mockFetchResponse({ data: [] }); // templates
      mockFetchResponse({ data: mockSession });
      mockFetchResponse({ data: [] }); // tree

      render(<ExtendedThinking {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'Test' } });

      const startButton = screen.getByRole('button', { name: /start thinking/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument(); // branchesExplored
        expect(screen.getByText('82.5%')).toBeInTheDocument(); // averageConfidence
        expect(screen.getByText('5000/10000')).toBeInTheDocument(); // tokens
        expect(screen.getByText('5/10')).toBeInTheDocument(); // depth
      });
    });

    it('should show pause button when session is thinking', async () => {
      const mockSession = {
        id: 'session-123',
        rootNodeId: 'root',
        status: 'thinking',
        stats: {},
        config: {},
      };

      mockFetchResponse({ data: [] });
      mockFetchResponse({ data: mockSession });
      mockFetchResponse({ data: [] });

      render(<ExtendedThinking {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /start thinking/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });
    });

    it('should show conclude button when session is active', async () => {
      const mockSession = {
        id: 'session-123',
        rootNodeId: 'root',
        status: 'thinking',
        stats: {},
        config: {},
      };

      mockFetchResponse({ data: [] });
      mockFetchResponse({ data: mockSession });
      mockFetchResponse({ data: [] });

      render(<ExtendedThinking {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /start thinking/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /conclude/i })).toBeInTheDocument();
      });
    });

    it('should display final conclusion when completed', async () => {
      const mockSession = {
        id: 'session-123',
        rootNodeId: 'root',
        status: 'completed',
        finalConclusion: 'After thorough analysis, the best approach is...',
        stats: {
          branchesExplored: 20,
        },
        config: {},
      };

      mockFetchResponse({ data: [] });
      mockFetchResponse({ data: mockSession });
      mockFetchResponse({ data: [] });

      render(<ExtendedThinking {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /start thinking/i }));

      await waitFor(() => {
        expect(screen.getByText('Final Conclusion')).toBeInTheDocument();
        expect(screen.getByText(/After thorough analysis/)).toBeInTheDocument();
        expect(screen.getByText(/Synthesized from 20 thoughts/)).toBeInTheDocument();
      });
    });
  });

  describe('Thought Tree Interactions', () => {
    it('should expand thought when expand button is clicked', async () => {
      const mockSession = {
        id: 'session-123',
        rootNodeId: 'root',
        status: 'paused',
        stats: {},
        config: {},
      };

      const mockTree = [
        {
          id: 'root',
          content: 'Root thought',
          type: 'observation',
          confidence: 80,
          depth: 0,
          children: [],
          metadata: { tokens: 100, duration: 500, model: 'claude', timestamp: new Date() },
          status: 'active',
        },
      ];

      mockFetchResponse({ data: [] });
      mockFetchResponse({ data: mockSession });
      mockFetchResponse({ data: mockTree });

      render(<ExtendedThinking {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /start thinking/i }));

      await waitFor(() => {
        expect(screen.getByText('Root thought')).toBeInTheDocument();
      });

      mockFetchResponse({ success: true });
      mockFetchResponse({ data: mockTree });
      mockFetchResponse({ data: mockSession });

      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/thinking/session-123/expand',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('should critique thought when critique button is clicked', async () => {
      const mockSession = {
        id: 'session-123',
        rootNodeId: 'root',
        status: 'paused',
        stats: {},
        config: {},
      };

      const mockTree = [
        {
          id: 'root',
          content: 'Root thought',
          type: 'observation',
          confidence: 80,
          depth: 0,
          children: [],
          metadata: { tokens: 100, duration: 500, model: 'claude', timestamp: new Date() },
          status: 'active',
        },
      ];

      mockFetchResponse({ data: [] });
      mockFetchResponse({ data: mockSession });
      mockFetchResponse({ data: mockTree });

      render(<ExtendedThinking {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /start thinking/i }));

      await waitFor(() => {
        expect(screen.getByText('Root thought')).toBeInTheDocument();
      });

      mockFetchResponse({ success: true });

      const critiqueButton = screen.getByRole('button', { name: /critique/i });
      fireEvent.click(critiqueButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/thinking/session-123/critique',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('should explore alternatives when alternatives button is clicked', async () => {
      const mockSession = {
        id: 'session-123',
        rootNodeId: 'root',
        status: 'paused',
        stats: {},
        config: {},
      };

      const mockTree = [
        {
          id: 'root',
          content: 'Root thought',
          type: 'observation',
          confidence: 80,
          depth: 0,
          children: [],
          metadata: { tokens: 100, duration: 500, model: 'claude', timestamp: new Date() },
          status: 'active',
        },
      ];

      mockFetchResponse({ data: [] });
      mockFetchResponse({ data: mockSession });
      mockFetchResponse({ data: mockTree });

      render(<ExtendedThinking {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText('What would you like to think about?');
      fireEvent.change(queryInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /start thinking/i }));

      await waitFor(() => {
        expect(screen.getByText('Root thought')).toBeInTheDocument();
      });

      mockFetchResponse({ success: true });

      const alternativesButton = screen.getByRole('button', { name: /alternatives/i });
      fireEvent.click(alternativesButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/thinking/session-123/alternatives',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"count":3'),
          })
        );
      });
    });
  });

  describe('Configuration Options', () => {
    it('should allow changing max tokens', () => {
      render(<ExtendedThinking {...defaultProps} />);

      const maxTokensInput = screen.getByLabelText(/max tokens/i);
      fireEvent.change(maxTokensInput, { target: { value: '20000' } });

      expect(maxTokensInput).toHaveValue(20000);
    });

    it('should allow changing max depth', () => {
      render(<ExtendedThinking {...defaultProps} />);

      const maxDepthInput = screen.getByLabelText(/max depth/i);
      fireEvent.change(maxDepthInput, { target: { value: '15' } });

      expect(maxDepthInput).toHaveValue(15);
    });

    it('should allow selecting thinking style', () => {
      render(<ExtendedThinking {...defaultProps} />);

      const styleSelect = screen.getByLabelText(/thinking style/i);
      fireEvent.change(styleSelect, { target: { value: 'creative' } });

      expect(styleSelect).toHaveValue('creative');
    });
  });
});
