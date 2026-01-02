import express, { Router, Request, Response } from 'express';
import { MetaOrchestrator } from '../orchestrator/MetaOrchestrator';

const router: Router = express.Router();

// Initialize orchestrator (should be imported from main app)
// This is a placeholder - in production, inject the orchestrator instance
let orchestrator: MetaOrchestrator;

export function initializeIdeRouter(orch: MetaOrchestrator): Router {
    orchestrator = orch;
    return router;
}

// Middleware to validate requests
const validateCodeRequest = (req: Request, res: Response, next: Function) => {
    const { code, language } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Code is required' });
    }

    if (!language || typeof language !== 'string') {
        return res.status(400).json({ error: 'Language is required' });
    }

    next();
};

/**
 * POST /api/ide/chat
 * General chat with IDE context
 */
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message, conversationId, context, mode } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Build enhanced prompt with IDE context
        let enhancedMessage = message;

        if (context?.currentFile) {
            enhancedMessage += `\n\n**Current File Context:**\n`;
            enhancedMessage += `- File: ${context.currentFile.path}\n`;
            enhancedMessage += `- Language: ${context.currentFile.language}\n`;

            if (context.currentFile.selection) {
                enhancedMessage += `\n**Selected Code:**\n\`\`\`${context.currentFile.language}\n${context.currentFile.selection}\n\`\`\`\n`;
            }
        }

        if (context?.workspaceRoot) {
            enhancedMessage += `\n**Workspace:** ${context.workspaceRoot}\n`;
        }

        // Route to appropriate mode
        let response;
        switch (mode) {
            case 'extended-thinking':
                response = await orchestrator.handleExtendedThinking(enhancedMessage, conversationId);
                break;
            case 'deep-research':
                response = await orchestrator.handleDeepResearch(enhancedMessage, conversationId);
                break;
            default:
                response = await orchestrator.handleChat(enhancedMessage, conversationId);
                break;
        }

        res.json({
            content: response.content,
            conversationId: response.conversationId,
            thinking: response.thinking,
            sources: response.sources
        });
    } catch (error: any) {
        console.error('IDE chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/ide/explain
 * Explain code snippet
 */
router.post('/explain', validateCodeRequest, async (req: Request, res: Response) => {
    try {
        const { code, language, filePath, context } = req.body;

        let prompt = `Please explain the following ${language} code in detail:\n\n`;
        prompt += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
        prompt += `Provide:\n`;
        prompt += `1. What the code does (high-level overview)\n`;
        prompt += `2. How it works (step-by-step explanation)\n`;
        prompt += `3. Key concepts and patterns used\n`;
        prompt += `4. Potential improvements or concerns\n`;

        if (context?.focusWord) {
            prompt += `\nFocus particularly on explaining: **${context.focusWord}**\n`;
        }

        const response = await orchestrator.handleChat(prompt);

        res.json({
            content: response.content,
            conversationId: response.conversationId
        });
    } catch (error: any) {
        console.error('IDE explain error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/ide/refactor
 * Suggest code refactoring
 */
router.post('/refactor', validateCodeRequest, async (req: Request, res: Response) => {
    try {
        const { code, language, filePath, context } = req.body;

        let prompt = `Please refactor the following ${language} code:\n\n`;
        prompt += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;

        if (context?.goal) {
            prompt += `**Goal:** ${context.goal}\n\n`;
        }

        prompt += `Provide:\n`;
        prompt += `1. Refactored code with improvements\n`;
        prompt += `2. Explanation of changes made\n`;
        prompt += `3. Benefits of the refactoring\n`;
        prompt += `\nFocus on: code readability, maintainability, performance, and best practices for ${language}.\n`;

        const response = await orchestrator.handleChat(prompt);

        res.json({
            content: response.content,
            conversationId: response.conversationId
        });
    } catch (error: any) {
        console.error('IDE refactor error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/ide/tests
 * Generate unit tests
 */
router.post('/tests', validateCodeRequest, async (req: Request, res: Response) => {
    try {
        const { code, language, filePath, context } = req.body;

        let prompt = `Generate comprehensive unit tests for the following ${language} code:\n\n`;
        prompt += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;

        if (context?.framework) {
            prompt += `**Test Framework:** ${context.framework}\n\n`;
        } else {
            prompt += `Use the most common testing framework for ${language}.\n\n`;
        }

        prompt += `The tests should:\n`;
        prompt += `1. Cover all main functionality\n`;
        prompt += `2. Include edge cases and error scenarios\n`;
        prompt += `3. Follow testing best practices\n`;
        prompt += `4. Be well-organized and documented\n`;
        prompt += `5. Include setup/teardown if needed\n`;

        const response = await orchestrator.handleChat(prompt);

        res.json({
            content: response.content,
            conversationId: response.conversationId
        });
    } catch (error: any) {
        console.error('IDE tests error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/ide/fix
 * Fix bug in code
 */
router.post('/fix', validateCodeRequest, async (req: Request, res: Response) => {
    try {
        const { code, language, filePath, bugDescription } = req.body;

        if (!bugDescription) {
            return res.status(400).json({ error: 'Bug description is required' });
        }

        let prompt = `Fix the following bug in this ${language} code:\n\n`;
        prompt += `**Bug Description:** ${bugDescription}\n\n`;
        prompt += `**Code:**\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
        prompt += `Please:\n`;
        prompt += `1. Identify the root cause of the bug\n`;
        prompt += `2. Provide the fixed code\n`;
        prompt += `3. Explain what was wrong and how the fix works\n`;
        prompt += `4. Suggest any additional improvements to prevent similar bugs\n`;

        const response = await orchestrator.handleChat(prompt);

        res.json({
            content: response.content,
            conversationId: response.conversationId
        });
    } catch (error: any) {
        console.error('IDE fix error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/ide/comments
 * Add documentation comments
 */
router.post('/comments', validateCodeRequest, async (req: Request, res: Response) => {
    try {
        const { code, language, filePath, context } = req.body;

        let prompt = `Add comprehensive documentation comments to the following ${language} code:\n\n`;
        prompt += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;

        if (context?.style) {
            prompt += `**Documentation Style:** ${context.style}\n\n`;
        }

        prompt += `The documentation should:\n`;
        prompt += `1. Include function/method descriptions\n`;
        prompt += `2. Document all parameters and return values\n`;
        prompt += `3. Add inline comments for complex logic\n`;
        prompt += `4. Follow ${language} documentation conventions\n`;
        prompt += `5. Be clear and helpful for other developers\n`;

        const response = await orchestrator.handleChat(prompt);

        res.json({
            content: response.content,
            conversationId: response.conversationId
        });
    } catch (error: any) {
        console.error('IDE comments error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/ide/generate
 * Generate code from description
 */
router.post('/generate', async (req: Request, res: Response) => {
    try {
        const { description, language, context } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        let prompt = `Generate ${language || 'code'} based on this description:\n\n`;
        prompt += `**Description:** ${description}\n\n`;

        if (context?.surroundingCode) {
            prompt += `**Context (surrounding code):**\n\`\`\`${language}\n${context.surroundingCode}\n\`\`\`\n\n`;
        }

        prompt += `Requirements:\n`;
        prompt += `1. Generate clean, production-ready code\n`;
        prompt += `2. Follow best practices and conventions for ${language || 'the language'}\n`;
        prompt += `3. Include helpful comments\n`;
        prompt += `4. Handle edge cases and errors appropriately\n`;
        prompt += `5. Make the code maintainable and testable\n`;

        const response = await orchestrator.handleChat(prompt);

        res.json({
            content: response.content,
            conversationId: response.conversationId
        });
    } catch (error: any) {
        console.error('IDE generate error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/ide/review
 * Code review
 */
router.post('/review', validateCodeRequest, async (req: Request, res: Response) => {
    try {
        const { code, language, filePath, context } = req.body;

        let prompt = `Perform a comprehensive code review of the following ${language} code:\n\n`;
        prompt += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;

        if (context?.focusAreas && context.focusAreas.length > 0) {
            prompt += `**Focus Areas:** ${context.focusAreas.join(', ')}\n\n`;
        }

        prompt += `Please review for:\n`;
        prompt += `1. **Bugs and Logic Errors**: Identify potential bugs\n`;
        prompt += `2. **Security**: Check for security vulnerabilities\n`;
        prompt += `3. **Performance**: Identify performance issues\n`;
        prompt += `4. **Code Quality**: Assess readability, maintainability\n`;
        prompt += `5. **Best Practices**: Check adherence to ${language} conventions\n`;
        prompt += `6. **Architecture**: Evaluate design patterns and structure\n\n`;
        prompt += `Format your response with:\n`;
        prompt += `- Severity levels: [ERROR], [WARNING], [INFO]\n`;
        prompt += `- Line references: "Line X:" or "Line X-Y:"\n`;
        prompt += `- Specific, actionable feedback\n`;

        const response = await orchestrator.handleChat(prompt);

        res.json({
            content: response.content,
            conversationId: response.conversationId
        });
    } catch (error: any) {
        console.error('IDE review error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/ide/complete
 * Auto-complete suggestions
 */
router.post('/complete', async (req: Request, res: Response) => {
    try {
        const { code, language, position } = req.body;

        if (!code || !language) {
            return res.status(400).json({ error: 'Code and language are required' });
        }

        // For completion, use a lightweight approach
        let prompt = `Given this ${language} code, suggest the next 1-2 lines that should be written:\n\n`;
        prompt += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
        prompt += `Provide only the code suggestions, one per line. No explanations.\n`;

        const response = await orchestrator.handleChat(prompt);

        // Parse suggestions from response
        const suggestions: string[] = [];
        const lines = response.content.split('\n').filter(line => line.trim());

        for (const line of lines) {
            // Extract code from markdown if present
            const codeMatch = line.match(/```[\w]*\n([\s\S]*?)\n```/);
            if (codeMatch) {
                suggestions.push(codeMatch[1].trim());
            } else if (!line.startsWith('**') && !line.startsWith('#')) {
                // Add non-markdown formatted lines
                suggestions.push(line.trim());
            }
        }

        res.json({
            suggestions: suggestions.slice(0, 3) // Limit to top 3 suggestions
        });
    } catch (error: any) {
        console.error('IDE complete error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;
