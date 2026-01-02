// Task Planner - AI-powered task planning and execution
import Anthropic from '@anthropic-ai/sdk';
import { ComputerAction, TaskExecution } from '../computer-use';
import type { ComputerUseEngine } from '../computer-use';

interface TaskStep {
  action: string;
  target?: string;
  value?: string;
  description: string;
}

interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  estimatedDuration: number;
}

interface ExecutionContext {
  sessionId: string;
  currentStep: number;
  previousScreenshot?: string;
  errors: string[];
  retries: number;
}

export class TaskPlanner {
  private anthropic: Anthropic;
  private computerEngine: ComputerUseEngine;
  private maxRetries: number = 3;

  constructor(computerEngine: ComputerUseEngine) {
    this.computerEngine = computerEngine;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }

  /**
   * Execute a high-level task
   */
  async executeTask(sessionId: string, task: string): Promise<TaskExecution> {
    const actions: ComputerAction[] = [];
    const context: ExecutionContext = {
      sessionId,
      currentStep: 0,
      errors: [],
      retries: 0,
    };

    try {
      // Get initial screenshot
      const initialScreenshot = await this.computerEngine.screenshot(sessionId);
      context.previousScreenshot = initialScreenshot;

      // Plan the task
      const plan = await this.planTask(task, initialScreenshot);

      console.log('Task plan:', plan);

      // Execute each step
      for (let i = 0; i < plan.steps.length; i++) {
        context.currentStep = i;
        const step = plan.steps[i];

        console.log(`Executing step ${i + 1}/${plan.steps.length}: ${step.description}`);

        try {
          const result = await this.executeStep(context, step);
          actions.push(result);

          // Check if we achieved the goal
          if (i === plan.steps.length - 1) {
            const verified = await this.verifyGoal(
              sessionId,
              task,
              result.result?.screenshot || ''
            );

            if (!verified && context.retries < this.maxRetries) {
              console.log('Goal not achieved, retrying...');
              context.retries++;
              i = -1; // Restart from beginning
              continue;
            }
          }
        } catch (error) {
          console.error(`Step ${i + 1} failed:`, error);
          context.errors.push(error.message);

          // Try to recover
          const recovered = await this.recoverFromError(context, step, error);

          if (!recovered) {
            throw new Error(`Failed to execute step: ${step.description}`);
          }
        }
      }

      // Get final screenshot
      const finalScreenshot = await this.computerEngine.screenshot(sessionId);

      return {
        success: true,
        steps: actions,
        finalScreenshot,
      };
    } catch (error) {
      console.error('Task execution failed:', error);

      return {
        success: false,
        steps: actions,
        error: error.message,
      };
    }
  }

  /**
   * Plan task using AI
   */
  private async planTask(task: string, screenshot: string): Promise<TaskPlan> {
    try {
      const base64Image = screenshot.startsWith('data:')
        ? screenshot.split(',')[1]
        : screenshot;

      const prompt = `You are a task planner for browser automation. Given a task and a screenshot of the current page, create a step-by-step plan.

Task: ${task}

Analyze the screenshot and create a detailed plan. Each step should specify:
- action: The type of action (navigate, click, type, scroll, wait)
- target: CSS selector or coordinates for the action
- value: Value to type or other parameters
- description: Human-readable description

Format as JSON:
{
  "goal": "Brief summary of the goal",
  "steps": [
    {
      "action": "click",
      "target": "button.submit",
      "description": "Click the submit button"
    },
    {
      "action": "type",
      "target": "input[name='email']",
      "value": "user@example.com",
      "description": "Enter email address"
    }
  ],
  "estimatedDuration": 5000
}

Important:
- Be specific with selectors
- Consider waiting for elements to load
- Handle navigation and page transitions
- Keep steps atomic and simple`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        return {
          goal: plan.goal || task,
          steps: plan.steps || [],
          estimatedDuration: plan.estimatedDuration || 10000,
        };
      }

      throw new Error('Failed to parse task plan');
    } catch (error) {
      console.error('Failed to plan task:', error);

      // Fallback: create a simple plan
      return {
        goal: task,
        steps: [
          {
            action: 'wait',
            description: 'Manual intervention required',
          },
        ],
        estimatedDuration: 1000,
      };
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    context: ExecutionContext,
    step: TaskStep
  ): Promise<ComputerAction> {
    const { sessionId } = context;

    switch (step.action) {
      case 'navigate':
        if (!step.target) {
          throw new Error('Navigate requires a URL target');
        }
        await this.computerEngine.navigate(sessionId, step.target);
        break;

      case 'click':
        if (!step.target) {
          throw new Error('Click requires a target');
        }

        // Check if target is coordinates
        if (step.target.includes(',')) {
          const [x, y] = step.target.split(',').map(Number);
          await this.computerEngine.click(sessionId, { x, y });
        } else {
          await this.computerEngine.click(sessionId, { selector: step.target });
        }
        break;

      case 'type':
        if (!step.value) {
          throw new Error('Type requires a value');
        }

        if (step.target) {
          await this.computerEngine.type(sessionId, step.value, {
            selector: step.target,
          });
        } else {
          await this.computerEngine.type(sessionId, step.value);
        }
        break;

      case 'scroll':
        const direction = (step.target as any) || 'down';
        const amount = parseInt(step.value || '300');
        await this.computerEngine.scroll(sessionId, direction, amount);
        break;

      case 'wait':
        const duration = parseInt(step.value || '1000');
        await new Promise((resolve) => setTimeout(resolve, duration));
        break;

      case 'pressKey':
        if (!step.value) {
          throw new Error('PressKey requires a value');
        }
        await this.computerEngine.pressKey(sessionId, step.value);
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }

    // Take screenshot after action
    const screenshot = await this.computerEngine.screenshot(sessionId);
    context.previousScreenshot = screenshot;

    return {
      id: `step-${context.currentStep}`,
      type: step.action as any,
      params: { target: step.target, value: step.value },
      result: {
        success: true,
        screenshot,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Verify if goal was achieved
   */
  private async verifyGoal(
    sessionId: string,
    goal: string,
    screenshot: string
  ): Promise<boolean> {
    try {
      const base64Image = screenshot.startsWith('data:')
        ? screenshot.split(',')[1]
        : screenshot;

      const prompt = `Goal: ${goal}

Look at this screenshot and determine if the goal has been achieved.

Respond with JSON:
{
  "achieved": true/false,
  "reason": "Explanation of why the goal was or wasn't achieved"
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return false;
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log('Goal verification:', result);
        return result.achieved === true;
      }

      return false;
    } catch (error) {
      console.error('Failed to verify goal:', error);
      return false;
    }
  }

  /**
   * Recover from error
   */
  private async recoverFromError(
    context: ExecutionContext,
    step: TaskStep,
    error: Error
  ): Promise<boolean> {
    if (context.retries >= this.maxRetries) {
      return false;
    }

    try {
      // Get current screenshot
      const screenshot = await this.computerEngine.screenshot(context.sessionId);
      const base64Image = screenshot.startsWith('data:')
        ? screenshot.split(',')[1]
        : screenshot;

      const prompt = `An error occurred while trying to execute this step:
Step: ${step.description}
Action: ${step.action}
Target: ${step.target || 'none'}
Error: ${error.message}

Look at the current screenshot and suggest an alternative approach.

Respond with JSON:
{
  "canRecover": true/false,
  "alternative": {
    "action": "click",
    "target": "alternative selector",
    "description": "Try clicking this instead"
  }
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return false;
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);

        if (result.canRecover && result.alternative) {
          console.log('Attempting recovery with alternative:', result.alternative);
          context.retries++;

          // Execute alternative step
          await this.executeStep(context, result.alternative);
          return true;
        }
      }

      return false;
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      return false;
    }
  }

  /**
   * Break down complex task into subtasks
   */
  async decomposeTask(task: string): Promise<string[]> {
    try {
      const prompt = `Break down this complex task into smaller, independent subtasks:

Task: ${task}

Respond with a JSON array of subtask descriptions:
["subtask 1", "subtask 2", "subtask 3"]`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return [task];
      }

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const subtasks = JSON.parse(jsonMatch[0]);
        return Array.isArray(subtasks) ? subtasks : [task];
      }

      return [task];
    } catch (error) {
      console.error('Failed to decompose task:', error);
      return [task];
    }
  }

  /**
   * Optimize action sequence
   */
  optimizeSequence(actions: ComputerAction[]): ComputerAction[] {
    // Remove redundant actions
    const optimized: ComputerAction[] = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const nextAction = actions[i + 1];

      // Skip redundant screenshots
      if (action.type === 'screenshot' && nextAction?.type === 'screenshot') {
        continue;
      }

      // Skip redundant waits
      if (action.type === 'wait' && nextAction?.type === 'wait') {
        // Combine wait times
        action.params.duration =
          (action.params.duration || 0) + (nextAction.params.duration || 0);
        i++; // Skip next
      }

      optimized.push(action);
    }

    return optimized;
  }

  /**
   * Learn from execution history
   */
  async learnFromHistory(
    task: string,
    actions: ComputerAction[],
    success: boolean
  ): Promise<void> {
    // Store successful patterns for future use
    // This could be implemented with a database or cache
    console.log('Learning from execution:', { task, actionCount: actions.length, success });
  }
}
