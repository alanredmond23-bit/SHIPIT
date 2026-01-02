// Browser Engine - Playwright-based browser automation
import { chromium, Browser, BrowserContext, Page, ElementHandle } from 'playwright';
import { BrowserConfig, DetectedElement } from '../computer-use';
import * as path from 'path';
import * as fs from 'fs/promises';

interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  config: BrowserConfig;
  downloads: string[];
}

export class BrowserEngine {
  private sessions: Map<string, BrowserSession> = new Map();
  private downloadDir: string = '/tmp/computer-use-downloads';

  constructor() {
    // Ensure download directory exists
    this.initDownloadDir();
  }

  private async initDownloadDir(): Promise<void> {
    try {
      await fs.mkdir(this.downloadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create download directory:', error);
    }
  }

  /**
   * Launch browser
   */
  async launch(sessionId: string, config?: BrowserConfig): Promise<BrowserContext> {
    const defaultConfig: BrowserConfig = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      timeout: 30000,
      recordVideo: false,
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      // Launch browser
      const browser = await chromium.launch({
        headless: finalConfig.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      // Create context
      const context = await browser.newContext({
        viewport: finalConfig.viewport,
        userAgent: finalConfig.userAgent,
        recordVideo: finalConfig.recordVideo ? { dir: '/tmp/videos' } : undefined,
        acceptDownloads: true,
      });

      // Set default timeout
      context.setDefaultTimeout(finalConfig.timeout!);

      // Create page
      const page = await context.newPage();

      // Set up download handler
      const sessionDownloadDir = path.join(this.downloadDir, sessionId);
      await fs.mkdir(sessionDownloadDir, { recursive: true });

      const downloads: string[] = [];

      page.on('download', async (download) => {
        const fileName = download.suggestedFilename();
        const filePath = path.join(sessionDownloadDir, fileName);
        await download.saveAs(filePath);
        downloads.push(filePath);
      });

      // Handle dialogs (alerts, confirms, prompts)
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      // Store session
      this.sessions.set(sessionId, {
        browser,
        context,
        page,
        config: finalConfig,
        downloads,
      });

      return context;
    } catch (error) {
      throw new Error(`Failed to launch browser: ${error.message}`);
    }
  }

  /**
   * Navigate to URL
   */
  async navigate(sessionId: string, url: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      await session.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: session.config.timeout,
      });
    } catch (error) {
      throw new Error(`Failed to navigate to ${url}: ${error.message}`);
    }
  }

  /**
   * Wait for page to load
   */
  async waitForLoad(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await session.page.waitForLoadState('networkidle', {
        timeout: 10000,
      }).catch(() => {
        // Ignore timeout, continue anyway
      });
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(sessionId: string, fullPage: boolean = false): Promise<string> {
    const session = this.getSession(sessionId);

    try {
      const screenshot = await session.page.screenshot({
        type: 'png',
        fullPage,
      });

      // Convert to base64
      return `data:image/png;base64,${screenshot.toString('base64')}`;
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${error.message}`);
    }
  }

  /**
   * Click on element by selector
   */
  async clickSelector(sessionId: string, selector: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await session.page.click(selector, {
        timeout: 5000,
      });
    } catch (error) {
      throw new Error(`Failed to click selector ${selector}: ${error.message}`);
    }
  }

  /**
   * Click at coordinates
   */
  async clickCoordinates(sessionId: string, x: number, y: number): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await session.page.mouse.click(x, y);
    } catch (error) {
      throw new Error(`Failed to click at (${x}, ${y}): ${error.message}`);
    }
  }

  /**
   * Type text in selector
   */
  async typeInSelector(sessionId: string, selector: string, text: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      // Clear existing text first
      await session.page.fill(selector, '');
      // Type new text
      await session.page.type(selector, text, {
        delay: 50, // Realistic typing speed
      });
    } catch (error) {
      throw new Error(`Failed to type in selector ${selector}: ${error.message}`);
    }
  }

  /**
   * Type text (in currently focused element)
   */
  async typeText(sessionId: string, text: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await session.page.keyboard.type(text, {
        delay: 50,
      });
    } catch (error) {
      throw new Error(`Failed to type text: ${error.message}`);
    }
  }

  /**
   * Press key(s)
   */
  async pressKey(sessionId: string, keys: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await session.page.keyboard.press(keys);
    } catch (error) {
      throw new Error(`Failed to press key ${keys}: ${error.message}`);
    }
  }

  /**
   * Scroll
   */
  async scroll(
    sessionId: string,
    direction: 'up' | 'down' | 'left' | 'right',
    amount: number
  ): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      let deltaX = 0;
      let deltaY = 0;

      switch (direction) {
        case 'up':
          deltaY = -amount;
          break;
        case 'down':
          deltaY = amount;
          break;
        case 'left':
          deltaX = -amount;
          break;
        case 'right':
          deltaX = amount;
          break;
      }

      await session.page.evaluate(
        ({ deltaX, deltaY }) => {
          window.scrollBy(deltaX, deltaY);
        },
        { deltaX, deltaY }
      );
    } catch (error) {
      throw new Error(`Failed to scroll: ${error.message}`);
    }
  }

  /**
   * Wait for specified time
   */
  async wait(sessionId: string, ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get page HTML
   */
  async getHTML(sessionId: string): Promise<string> {
    const session = this.getSession(sessionId);

    try {
      return await session.page.content();
    } catch (error) {
      throw new Error(`Failed to get HTML: ${error.message}`);
    }
  }

  /**
   * Get element at position
   */
  async getElementAtPosition(
    sessionId: string,
    x: number,
    y: number
  ): Promise<DetectedElement | null> {
    const session = this.getSession(sessionId);

    try {
      const element = await session.page.evaluateHandle(
        ({ x, y }) => {
          return document.elementFromPoint(x, y);
        },
        { x, y }
      );

      if (!element) {
        return null;
      }

      const elementInfo = await session.page.evaluate((el: Element) => {
        if (!el) return null;

        const rect = el.getBoundingClientRect();
        const tagName = el.tagName.toLowerCase();
        const attributes: Record<string, string> = {};

        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          attributes[attr.name] = attr.value;
        }

        let type: string = 'text';
        if (tagName === 'button' || el.getAttribute('role') === 'button') {
          type = 'button';
        } else if (tagName === 'a') {
          type = 'link';
        } else if (tagName === 'input') {
          type = 'input';
        } else if (tagName === 'img') {
          type = 'image';
        } else if (tagName === 'select') {
          type = 'dropdown';
        } else if (el.getAttribute('type') === 'checkbox') {
          type = 'checkbox';
        }

        // Build a unique selector
        let selector = tagName;
        if (el.id) {
          selector = `#${el.id}`;
        } else if (el.className) {
          selector = `${tagName}.${el.className.split(' ').join('.')}`;
        }

        return {
          type,
          text: el.textContent?.trim() || '',
          bounds: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          interactable: true,
          attributes,
          selector,
        };
      }, element.asElement()!);

      if (!elementInfo) {
        return null;
      }

      return {
        id: Math.random().toString(36).substring(7),
        ...elementInfo,
      } as DetectedElement;
    } catch (error) {
      console.error('Failed to get element at position:', error);
      return null;
    }
  }

  /**
   * Execute JavaScript
   */
  async executeScript(sessionId: string, script: string): Promise<any> {
    const session = this.getSession(sessionId);

    try {
      return await session.page.evaluate(script);
    } catch (error) {
      throw new Error(`Failed to execute script: ${error.message}`);
    }
  }

  /**
   * Wait for selector
   */
  async waitForSelector(
    sessionId: string,
    selector: string,
    timeout: number = 5000
  ): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await session.page.waitForSelector(selector, { timeout });
    } catch (error) {
      throw new Error(`Selector ${selector} not found within ${timeout}ms`);
    }
  }

  /**
   * Download file
   */
  async downloadFile(sessionId: string, selector: string): Promise<string> {
    const session = this.getSession(sessionId);

    try {
      // Start waiting for download before clicking
      const downloadPromise = session.page.waitForEvent('download');

      // Click the download link/button
      await session.page.click(selector);

      // Wait for the download
      const download = await downloadPromise;

      // Save the file
      const fileName = download.suggestedFilename();
      const sessionDownloadDir = path.join(this.downloadDir, sessionId);
      const filePath = path.join(sessionDownloadDir, fileName);

      await download.saveAs(filePath);

      session.downloads.push(filePath);

      return filePath;
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Upload file
   */
  async uploadFile(sessionId: string, selector: string, filePath: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      const fileInput = await session.page.$(selector);
      if (!fileInput) {
        throw new Error(`File input not found: ${selector}`);
      }

      await fileInput.setInputFiles(filePath);
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Get all interactive elements
   */
  async getInteractiveElements(sessionId: string): Promise<DetectedElement[]> {
    const session = this.getSession(sessionId);

    try {
      const elements = await session.page.evaluate(() => {
        const selectors = [
          'button',
          'a',
          'input',
          'select',
          'textarea',
          '[role="button"]',
          '[onclick]',
        ];

        const allElements: any[] = [];

        selectors.forEach((selector) => {
          const els = document.querySelectorAll(selector);
          els.forEach((el) => {
            const rect = el.getBoundingClientRect();

            // Only include visible elements
            if (rect.width === 0 || rect.height === 0) return;

            const tagName = el.tagName.toLowerCase();
            const attributes: Record<string, string> = {};

            for (let i = 0; i < el.attributes.length; i++) {
              const attr = el.attributes[i];
              attributes[attr.name] = attr.value;
            }

            let type: string = 'text';
            if (tagName === 'button' || el.getAttribute('role') === 'button') {
              type = 'button';
            } else if (tagName === 'a') {
              type = 'link';
            } else if (tagName === 'input') {
              type = 'input';
            } else if (tagName === 'select') {
              type = 'dropdown';
            } else if (tagName === 'textarea') {
              type = 'input';
            }

            allElements.push({
              type,
              text: el.textContent?.trim().substring(0, 100) || '',
              bounds: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
              interactable: true,
              attributes,
            });
          });
        });

        return allElements;
      });

      return elements.map((el, idx) => ({
        id: `element-${idx}`,
        ...el,
      }));
    } catch (error) {
      console.error('Failed to get interactive elements:', error);
      return [];
    }
  }

  /**
   * Hover over element
   */
  async hover(sessionId: string, selector: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await session.page.hover(selector);
    } catch (error) {
      throw new Error(`Failed to hover over ${selector}: ${error.message}`);
    }
  }

  /**
   * Select option from dropdown
   */
  async selectOption(
    sessionId: string,
    selector: string,
    value: string
  ): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await session.page.selectOption(selector, value);
    } catch (error) {
      throw new Error(`Failed to select option: ${error.message}`);
    }
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(sessionId: string): Promise<string> {
    const session = this.getSession(sessionId);
    return session.page.url();
  }

  /**
   * Go back
   */
  async goBack(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    await session.page.goBack();
  }

  /**
   * Go forward
   */
  async goForward(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    await session.page.goForward();
  }

  /**
   * Reload page
   */
  async reload(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    await session.page.reload();
  }

  /**
   * Close browser session
   */
  async close(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await session.context.close();
      await session.browser.close();

      this.sessions.delete(sessionId);
    } catch (error) {
      console.error('Failed to close browser:', error);
      throw error;
    }
  }

  /**
   * Get session
   */
  private getSession(sessionId: string): BrowserSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Browser session not found: ${sessionId}`);
    }
    return session;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Map<string, BrowserSession> {
    return this.sessions;
  }
}
