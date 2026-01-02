// Screen Analyzer - Vision-based screen analysis
import Anthropic from '@anthropic-ai/sdk';
import { ScreenAnalysis, DetectedElement } from '../computer-use';

interface VisionAnalysisResult {
  description: string;
  elements: Array<{
    type: string;
    text?: string;
    location: string;
    bounds?: { x: number; y: number; width: number; height: number };
  }>;
  suggestedActions: string[];
}

export class ScreenAnalyzer {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }

  /**
   * Analyze screen using vision model
   */
  async analyze(screenshot: string, html?: string): Promise<ScreenAnalysis> {
    try {
      // Extract base64 from data URL if needed
      const base64Image = screenshot.startsWith('data:')
        ? screenshot.split(',')[1]
        : screenshot;

      // Build analysis prompt
      const prompt = this.buildAnalysisPrompt(html);

      // Call Claude with vision
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

      // Parse response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const analysisResult = this.parseAnalysisResponse(content.text);

      // Extract text from HTML if available
      const extractedText = html ? this.extractTextFromHTML(html) : '';

      // Convert to ScreenAnalysis format
      const elements: DetectedElement[] = analysisResult.elements.map((el, idx) => ({
        id: `detected-${idx}`,
        type: this.mapElementType(el.type),
        text: el.text,
        bounds: el.bounds || { x: 0, y: 0, width: 0, height: 0 },
        interactable: this.isInteractable(el.type),
        attributes: {},
      }));

      return {
        elements,
        text: extractedText,
        description: analysisResult.description,
        suggestedActions: analysisResult.suggestedActions,
      };
    } catch (error) {
      console.error('Failed to analyze screen:', error);

      // Return basic analysis on error
      return {
        elements: [],
        text: html ? this.extractTextFromHTML(html) : '',
        description: 'Failed to analyze screen',
        suggestedActions: [],
      };
    }
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(html?: string): string {
    let prompt = `Analyze this screenshot and provide detailed information about the user interface.

Please identify:
1. All interactive elements (buttons, links, input fields, dropdowns, etc.)
2. The overall purpose and context of the page
3. Suggested actions a user might want to take

For each interactive element, provide:
- Type (button, link, input, dropdown, checkbox, etc.)
- Visible text or label
- Approximate location (top-left, center, bottom-right, etc.)

Format your response as JSON with this structure:
{
  "description": "Brief description of what's on the screen",
  "elements": [
    {
      "type": "button",
      "text": "Submit",
      "location": "bottom-right"
    }
  ],
  "suggestedActions": ["Click the submit button", "Fill in the form"]
}`;

    if (html) {
      prompt += `\n\nHTML context (for reference):\n${html.substring(0, 2000)}`;
    }

    return prompt;
  }

  /**
   * Parse analysis response from Claude
   */
  private parseAnalysisResponse(response: string): VisionAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          description: parsed.description || 'No description provided',
          elements: parsed.elements || [],
          suggestedActions: parsed.suggestedActions || [],
        };
      }

      // Fallback: parse as plain text
      return {
        description: response,
        elements: [],
        suggestedActions: [],
      };
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      return {
        description: response,
        elements: [],
        suggestedActions: [],
      };
    }
  }

  /**
   * Extract text from HTML
   */
  private extractTextFromHTML(html: string): string {
    try {
      // Remove script and style tags
      let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

      // Remove HTML tags
      text = text.replace(/<[^>]+>/g, ' ');

      // Decode HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');

      // Normalize whitespace
      text = text.replace(/\s+/g, ' ').trim();

      // Limit length
      return text.substring(0, 5000);
    } catch (error) {
      console.error('Failed to extract text from HTML:', error);
      return '';
    }
  }

  /**
   * Map element type from vision analysis to DetectedElement type
   */
  private mapElementType(type: string): DetectedElement['type'] {
    const typeLower = type.toLowerCase();

    if (typeLower.includes('button')) return 'button';
    if (typeLower.includes('link')) return 'link';
    if (typeLower.includes('input') || typeLower.includes('field')) return 'input';
    if (typeLower.includes('image') || typeLower.includes('img')) return 'image';
    if (typeLower.includes('dropdown') || typeLower.includes('select')) return 'dropdown';
    if (typeLower.includes('checkbox')) return 'checkbox';

    return 'text';
  }

  /**
   * Check if element type is interactable
   */
  private isInteractable(type: string): boolean {
    const interactableTypes = ['button', 'link', 'input', 'dropdown', 'checkbox'];
    return interactableTypes.some((t) => type.toLowerCase().includes(t));
  }

  /**
   * Analyze specific region of screen
   */
  async analyzeRegion(
    screenshot: string,
    bounds: { x: number; y: number; width: number; height: number }
  ): Promise<ScreenAnalysis> {
    // For now, analyze the full screen
    // In a more advanced implementation, we would crop the image first
    return this.analyze(screenshot);
  }

  /**
   * Detect form fields
   */
  async detectFormFields(screenshot: string, html?: string): Promise<DetectedElement[]> {
    try {
      const base64Image = screenshot.startsWith('data:')
        ? screenshot.split(',')[1]
        : screenshot;

      const prompt = `Analyze this screenshot and identify all form input fields.

For each form field, provide:
- Type (text input, email input, password, textarea, dropdown, checkbox, radio button)
- Label or placeholder text
- Whether it's required
- Current value (if visible)

Format as JSON:
{
  "fields": [
    {
      "type": "text",
      "label": "Email",
      "required": true,
      "value": ""
    }
  ]
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
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
        return [];
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.fields || []).map((field: any, idx: number) => ({
          id: `field-${idx}`,
          type: 'input' as const,
          text: field.label || '',
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          interactable: true,
          attributes: {
            type: field.type,
            required: field.required?.toString() || 'false',
          },
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to detect form fields:', error);
      return [];
    }
  }

  /**
   * Find element by description
   */
  async findElementByDescription(
    screenshot: string,
    description: string
  ): Promise<DetectedElement | null> {
    try {
      const base64Image = screenshot.startsWith('data:')
        ? screenshot.split(',')[1]
        : screenshot;

      const prompt = `Find the element matching this description: "${description}"

Provide the element's:
- Type (button, link, input, etc.)
- Exact text content
- Approximate position (give x, y coordinates as percentage of screen width/height)

Format as JSON:
{
  "type": "button",
  "text": "Submit",
  "x": 50,
  "y": 80
}

If not found, respond with: {"found": false}`;

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
        return null;
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.found === false) {
          return null;
        }

        // Convert percentage to actual coordinates (assuming 1280x720 viewport)
        const x = (parsed.x / 100) * 1280;
        const y = (parsed.y / 100) * 720;

        return {
          id: 'found-element',
          type: this.mapElementType(parsed.type),
          text: parsed.text,
          bounds: { x, y, width: 100, height: 40 },
          interactable: true,
          attributes: {},
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to find element by description:', error);
      return null;
    }
  }

  /**
   * Generate accessibility description
   */
  async generateAccessibilityDescription(screenshot: string): Promise<string> {
    try {
      const base64Image = screenshot.startsWith('data:')
        ? screenshot.split(',')[1]
        : screenshot;

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
                text: 'Provide a detailed accessibility description of this screen for visually impaired users. Describe the layout, interactive elements, and content.',
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      return 'Unable to generate accessibility description';
    } catch (error) {
      console.error('Failed to generate accessibility description:', error);
      return 'Error generating accessibility description';
    }
  }

  /**
   * Compare two screenshots and detect changes
   */
  async detectChanges(
    beforeScreenshot: string,
    afterScreenshot: string
  ): Promise<string[]> {
    try {
      const beforeBase64 = beforeScreenshot.startsWith('data:')
        ? beforeScreenshot.split(',')[1]
        : beforeScreenshot;

      const afterBase64 = afterScreenshot.startsWith('data:')
        ? afterScreenshot.split(',')[1]
        : afterScreenshot;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Here is a screenshot BEFORE an action:',
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: beforeBase64,
                },
              },
              {
                type: 'text',
                text: 'Here is a screenshot AFTER an action:',
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: afterBase64,
                },
              },
              {
                type: 'text',
                text: 'List all visible changes between these two screenshots. Format as a JSON array of strings: ["change 1", "change 2", ...]',
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return [];
      }

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const changes = JSON.parse(jsonMatch[0]);
        return Array.isArray(changes) ? changes : [];
      }

      // Fallback: split by newlines
      return content.text
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^[-*]\s*/, '').trim());
    } catch (error) {
      console.error('Failed to detect changes:', error);
      return [];
    }
  }
}
