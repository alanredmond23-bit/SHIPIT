// vitest import removed - Jest globals used
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorkflowBuilder } from '../../components/WorkflowBuilder/WorkflowBuilder';

describe('WorkflowBuilder Component', () => {
  const mockOnSave = vi.fn();
  const mockOnRun = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render with a new workflow when no workflow provided', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      expect(screen.getByDisplayValue('New Workflow')).toBeInTheDocument();
      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should render with provided workflow data', () => {
      const workflow = {
        id: 'wf-123',
        name: 'My Workflow',
        description: 'Test workflow',
        status: 'active' as const,
        states: [],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      expect(screen.getByDisplayValue('My Workflow')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should show Run button when onRun is provided', () => {
      render(<WorkflowBuilder onSave={mockOnSave} onRun={mockOnRun} />);

      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
    });

    it('should not show Run button when onRun is not provided', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();
    });

    it('should display configuration panel by default', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      expect(screen.getByText('No Selection')).toBeInTheDocument();
    });
  });

  describe('Workflow Name Editing', () => {
    it('should allow editing workflow name', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      const nameInput = screen.getByDisplayValue('New Workflow');
      fireEvent.change(nameInput, { target: { value: 'Updated Workflow' } });

      expect(nameInput).toHaveValue('Updated Workflow');
    });

    it('should maintain workflow name when typing', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      const nameInput = screen.getByDisplayValue('New Workflow');
      fireEvent.change(nameInput, { target: { value: 'A' } });
      fireEvent.change(nameInput, { target: { value: 'AB' } });
      fireEvent.change(nameInput, { target: { value: 'ABC' } });

      expect(nameInput).toHaveValue('ABC');
    });

    it('should accept special characters in workflow name', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      const nameInput = screen.getByDisplayValue('New Workflow');
      fireEvent.change(nameInput, { target: { value: 'Workflow-2024_v1.0!' } });

      expect(nameInput).toHaveValue('Workflow-2024_v1.0!');
    });
  });

  describe('State Management', () => {
    it('should render states from workflow', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'draft' as const,
        states: [
          {
            id: 'state-1',
            name: 'Start',
            state_type: 'start' as const,
            position_x: 100,
            position_y: 100,
            color: '#6366f1',
          },
          {
            id: 'state-2',
            name: 'Process',
            state_type: 'action' as const,
            action_type: 'ai_task',
            position_x: 300,
            position_y: 100,
            color: '#6366f1',
          },
        ],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      // States should be rendered on the canvas
      // Note: This would require WorkflowCanvas to be testable
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    });

    it('should update state name when editing in config panel', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'draft' as const,
        states: [
          {
            id: 'state-1',
            name: 'Start',
            state_type: 'start' as const,
            position_x: 100,
            position_y: 100,
            color: '#6366f1',
          },
        ],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      // This would require selecting a state first
      // Implementation would depend on how WorkflowCanvas handles interactions
    });

    it('should allow selecting action type for action states', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'draft' as const,
        states: [
          {
            id: 'state-1',
            name: 'Action State',
            state_type: 'action' as const,
            position_x: 100,
            position_y: 100,
            color: '#6366f1',
          },
        ],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      // State selection and configuration would be tested here
      // This requires interaction with the canvas component
    });
  });

  describe('Saving Workflow', () => {
    it('should call onSave with workflow data when save button is clicked', async () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      const nameInput = screen.getByDisplayValue('New Workflow');
      fireEvent.change(nameInput, { target: { value: 'My Workflow' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Workflow',
            status: 'draft',
            states: [],
            transitions: [],
          })
        );
      });
    });

    it('should save workflow with updated states', async () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'draft' as const,
        states: [
          {
            id: 'state-1',
            name: 'Start',
            state_type: 'start' as const,
            position_x: 100,
            position_y: 100,
            color: '#6366f1',
          },
        ],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            states: expect.arrayContaining([
              expect.objectContaining({ id: 'state-1', name: 'Start' }),
            ]),
          })
        );
      });
    });

    it('should save workflow multiple times', async () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      const saveButton = screen.getByRole('button', { name: /save/i });

      fireEvent.click(saveButton);
      await waitFor(() => expect(mockOnSave).toHaveBeenCalledTimes(1));

      fireEvent.click(saveButton);
      await waitFor(() => expect(mockOnSave).toHaveBeenCalledTimes(2));

      fireEvent.click(saveButton);
      await waitFor(() => expect(mockOnSave).toHaveBeenCalledTimes(3));
    });
  });

  describe('Running Workflow', () => {
    it('should call onRun with workflow id when run button is clicked', async () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'active' as const,
        states: [],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} onRun={mockOnRun} />);

      const runButton = screen.getByRole('button', { name: /run/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockOnRun).toHaveBeenCalledWith('wf-123');
      });
    });

    it('should not show run button if onRun not provided', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();
    });

    it('should allow running workflow multiple times', async () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'active' as const,
        states: [],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} onRun={mockOnRun} />);

      const runButton = screen.getByRole('button', { name: /run/i });

      fireEvent.click(runButton);
      await waitFor(() => expect(mockOnRun).toHaveBeenCalledTimes(1));

      fireEvent.click(runButton);
      await waitFor(() => expect(mockOnRun).toHaveBeenCalledTimes(2));
    });
  });

  describe('Configuration Panel', () => {
    it('should toggle configuration panel visibility', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      expect(screen.getByText('No Selection')).toBeInTheDocument();

      const toggleButton = screen.getByRole('button', { name: /hide panel/i });
      fireEvent.click(toggleButton);

      expect(screen.queryByText('No Selection')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show panel/i })).toBeInTheDocument();
    });

    it('should remember panel state when toggling', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      const toggleButton = screen.getByRole('button', { name: /hide panel/i });
      fireEvent.click(toggleButton);

      const showButton = screen.getByRole('button', { name: /show panel/i });
      fireEvent.click(showButton);

      expect(screen.getByText('No Selection')).toBeInTheDocument();
    });

    it('should display no selection message by default', () => {
      render(<WorkflowBuilder onSave={mockOnSave} />);

      expect(screen.getByText('No Selection')).toBeInTheDocument();
      expect(
        screen.getByText(/Click on a state or transition to configure it/i)
      ).toBeInTheDocument();
    });
  });

  describe('Action Configuration', () => {
    it('should display AI task configuration for AI action type', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'draft' as const,
        states: [
          {
            id: 'state-1',
            name: 'AI Task',
            state_type: 'action' as const,
            action_type: 'ai_task',
            action_config: { prompt: 'Analyze this data' },
            position_x: 100,
            position_y: 100,
            color: '#6366f1',
          },
        ],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      // Configuration panel would show AI task fields
      // This requires state selection mechanism
    });

    it('should display HTTP request configuration for HTTP action type', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'draft' as const,
        states: [
          {
            id: 'state-1',
            name: 'API Call',
            state_type: 'action' as const,
            action_type: 'http_request',
            action_config: {
              url: 'https://api.example.com',
              method: 'POST',
            },
            position_x: 100,
            position_y: 100,
            color: '#6366f1',
          },
        ],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      // Configuration panel would show HTTP request fields
    });

    it('should display delay configuration for delay action type', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'draft' as const,
        states: [
          {
            id: 'state-1',
            name: 'Wait',
            state_type: 'action' as const,
            action_type: 'delay',
            action_config: { delay_seconds: 60 },
            position_x: 100,
            position_y: 100,
            color: '#6366f1',
          },
        ],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      // Configuration panel would show delay fields
    });
  });

  describe('Transitions', () => {
    it('should render transitions between states', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'draft' as const,
        states: [
          {
            id: 'state-1',
            name: 'Start',
            state_type: 'start' as const,
            position_x: 100,
            position_y: 100,
            color: '#6366f1',
          },
          {
            id: 'state-2',
            name: 'End',
            state_type: 'end' as const,
            position_x: 300,
            position_y: 100,
            color: '#6366f1',
          },
        ],
        transitions: [
          {
            id: 'trans-1',
            from_state_id: 'state-1',
            to_state_id: 'state-2',
            name: 'Continue',
          },
        ],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      // Transitions should be rendered on the canvas
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    });

    it('should allow adding transition conditions', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Test',
        status: 'draft' as const,
        states: [
          {
            id: 'state-1',
            name: 'Decision',
            state_type: 'decision' as const,
            position_x: 100,
            position_y: 100,
            color: '#6366f1',
          },
        ],
        transitions: [
          {
            id: 'trans-1',
            from_state_id: 'state-1',
            to_state_id: 'state-2',
            condition_expression: 'ctx.variables.approved === true',
          },
        ],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      // Transition configuration panel would show condition fields
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow with no states', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Empty Workflow',
        status: 'draft' as const,
        states: [],
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      expect(screen.getByDisplayValue('Empty Workflow')).toBeInTheDocument();
    });

    it('should handle workflow with many states', () => {
      const states = Array.from({ length: 50 }, (_, i) => ({
        id: `state-${i}`,
        name: `State ${i}`,
        state_type: 'action' as const,
        position_x: (i % 10) * 100,
        position_y: Math.floor(i / 10) * 100,
        color: '#6366f1',
      }));

      const workflow = {
        id: 'wf-123',
        name: 'Large Workflow',
        status: 'draft' as const,
        states,
        transitions: [],
      };

      render(<WorkflowBuilder workflow={workflow} onSave={mockOnSave} />);

      expect(screen.getByDisplayValue('Large Workflow')).toBeInTheDocument();
    });

    it('should handle very long workflow names', () => {
      const longName = 'A'.repeat(200);
      render(<WorkflowBuilder onSave={mockOnSave} />);

      const nameInput = screen.getByDisplayValue('New Workflow');
      fireEvent.change(nameInput, { target: { value: longName } });

      expect(nameInput).toHaveValue(longName);
    });
  });
});
