const { app, BrowserWindow, Menu, Tray, shell, ipcMain, nativeTheme, dialog, screen, Notification, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

// Detect development mode without external package
const isDev = !app.isPackaged;

//=============================================================================
// AUTO-UPDATER CONFIGURATION
//=============================================================================

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, let user decide
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;

// Update check interval: 4 hours in milliseconds
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;
let updateCheckTimer = null;
let updateDownloaded = false;
let updateInfo = null;

// Project root (2 levels up from desktop-app)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const META_AGENT_ROOT = path.resolve(__dirname, '..');

//=============================================================================
// SETUP VALIDATION - Runs automatically on launch
//=============================================================================

function checkSetup() {
  const issues = [];

  // Check 1: ui-extensions node_modules
  const uiNodeModules = path.join(META_AGENT_ROOT, 'ui-extensions', 'node_modules');
  if (!fs.existsSync(uiNodeModules)) {
    issues.push('ui-extensions dependencies not installed');
  }

  // Check 2: desktop-app node_modules (should exist if we're running)
  const desktopNodeModules = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(desktopNodeModules)) {
    issues.push('desktop-app dependencies not installed');
  }

  // Check 3: .env file exists
  const envFile = path.join(META_AGENT_ROOT, '.env');
  if (!fs.existsSync(envFile)) {
    issues.push('.env file missing');
  } else {
    // Check if .env has placeholder values
    const envContent = fs.readFileSync(envFile, 'utf8');
    if (envContent.includes('your-project-url-here') ||
        envContent.includes('your-anon-key-here')) {
      issues.push('.env has placeholder values (needs Supabase credentials)');
    }
  }

  return issues;
}

async function runSetupScript() {
  return new Promise((resolve, reject) => {
    const setupScript = path.join(PROJECT_ROOT, 'setup.sh');

    if (!fs.existsSync(setupScript)) {
      reject(new Error('setup.sh not found'));
      return;
    }

    // Open terminal and run setup
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS: Open Terminal and run setup
      const script = `
        tell application "Terminal"
          activate
          do script "cd '${PROJECT_ROOT}' && ./setup.sh && echo '\\n\\nSetup complete! You can close this window and restart the app.'"
        end tell
      `;
      const child = spawn('osascript', ['-e', script]);
      child.on('close', (code) => resolve(code === 0));
    } else if (platform === 'linux') {
      // Linux: Try common terminal emulators
      const terminals = ['gnome-terminal', 'konsole', 'xterm'];
      for (const term of terminals) {
        try {
          execSync(`which ${term}`);
          spawn(term, ['--', 'bash', '-c', `cd "${PROJECT_ROOT}" && ./setup.sh; read -p "Press Enter to close..."`]);
          resolve(true);
          return;
        } catch (e) {
          continue;
        }
      }
      reject(new Error('No terminal emulator found'));
    } else {
      // Windows: Not supported yet
      reject(new Error('Windows setup not yet implemented'));
    }
  });
}

async function handleSetupIssues(issues) {
  const setupScript = path.join(PROJECT_ROOT, 'setup.sh');
  const hasSetupScript = fs.existsSync(setupScript);

  const message = `Meta Agent needs setup before it can run.\n\nIssues found:\n• ${issues.join('\n• ')}`;

  const buttons = hasSetupScript
    ? ['Run Setup Script', 'Open Project Folder', 'Quit']
    : ['Open Project Folder', 'Quit'];

  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Setup Required',
    message: 'Setup Required',
    detail: message + '\n\n' + (hasSetupScript
      ? 'Click "Run Setup Script" to automatically fix these issues.'
      : 'Run ./setup.sh from the project root to fix these issues.'),
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1
  });

  if (hasSetupScript && result.response === 0) {
    // Run setup script
    try {
      await runSetupScript();
      await dialog.showMessageBox({
        type: 'info',
        title: 'Setup Started',
        message: 'Setup script is running in Terminal',
        detail: 'After setup completes, restart Meta Agent.\n\nDon\'t forget to edit the .env file with your Supabase credentials!'
      });
    } catch (err) {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Setup Failed',
        message: 'Could not run setup script',
        detail: `Error: ${err.message}\n\nPlease run manually:\ncd ${PROJECT_ROOT}\n./setup.sh`
      });
    }
    app.quit();
  } else if ((hasSetupScript && result.response === 1) || (!hasSetupScript && result.response === 0)) {
    // Open project folder
    shell.openPath(PROJECT_ROOT);
    app.quit();
  } else {
    // Quit
    app.quit();
  }
}

// Initialize electron store for settings
const store = new Store({
  defaults: {
    windowBounds: { width: 1400, height: 900, x: undefined, y: undefined },
    windowState: { isMaximized: false, isFullScreen: false },
    theme: 'system',
    apiEndpoint: 'http://localhost:3100',
    useFramelessWindow: false,
    currentModel: 'claude-3-5-sonnet', // Track current model for tray menu
    recentChats: [], // Track last 5 opened chats
    sidebarVisible: true // Track sidebar visibility state
  }
});

//=============================================================================
// RECENT CHATS MANAGEMENT
//=============================================================================

function addToRecentChats(chatInfo) {
  const recentChats = store.get('recentChats') || [];
  // Remove if already exists (to move to top)
  const filtered = recentChats.filter(c => c.id !== chatInfo.id);
  // Add to beginning and limit to 5
  filtered.unshift(chatInfo);
  store.set('recentChats', filtered.slice(0, 5));
  // Rebuild menu to update recent chats
  if (mainWindow) createMenu();
}

function clearRecentChats() {
  store.set('recentChats', []);
  if (mainWindow) createMenu();
}

function getRecentChatsSubmenu() {
  const recentChats = store.get('recentChats') || [];

  if (recentChats.length === 0) {
    return [
      { label: 'No Recent Chats', enabled: false }
    ];
  }

  const chatItems = recentChats.map((chat) => ({
    label: chat.title || `Chat ${chat.id}`,
    click: () => {
      if (mainWindow) {
        mainWindow.webContents.send('open-recent-chat', chat.id);
      }
    }
  }));

  return [
    ...chatItems,
    { type: 'separator' },
    {
      label: 'Clear Recent',
      click: clearRecentChats
    }
  ];
}

//=============================================================================
// THEME MANAGEMENT FOR MENU
//=============================================================================

function setAppTheme(theme) {
  store.set('theme', theme);

  if (theme === 'system') {
    nativeTheme.themeSource = 'system';
  } else if (theme === 'dark') {
    nativeTheme.themeSource = 'dark';
  } else {
    nativeTheme.themeSource = 'light';
  }

  if (mainWindow) {
    mainWindow.webContents.send('theme-changed', theme);
    createMenu(); // Update menu checkmarks
  }
}

function getAppearanceSubmenu() {
  const currentTheme = store.get('theme');

  return [
    {
      label: 'Light',
      type: 'radio',
      checked: currentTheme === 'light',
      click: () => setAppTheme('light')
    },
    {
      label: 'Dark',
      type: 'radio',
      checked: currentTheme === 'dark',
      click: () => setAppTheme('dark')
    },
    {
      label: 'System',
      type: 'radio',
      checked: currentTheme === 'system',
      click: () => setAppTheme('system')
    }
  ];
}

//=============================================================================
// SIDEBAR MANAGEMENT
//=============================================================================

function toggleSidebar() {
  const current = store.get('sidebarVisible');
  store.set('sidebarVisible', !current);
  if (mainWindow) {
    mainWindow.webContents.send('toggle-sidebar', !current);
  }
}

//=============================================================================
// WINDOW STATE MANAGEMENT UTILITIES
//=============================================================================

/**
 * Validates that window position is visible on at least one display
 * Handles multi-monitor scenarios where saved position may be off-screen
 */
function validateWindowPosition(x, y, width, height) {
  if (x === undefined || y === undefined) {
    return null; // Let Electron center the window
  }

  const displays = screen.getAllDisplays();

  // Check if at least part of the window (100px minimum) is visible on any display
  const minVisibleArea = 100;

  for (const display of displays) {
    const { x: dx, y: dy, width: dw, height: dh } = display.bounds;

    // Check if window overlaps with this display
    const overlapX = Math.max(0, Math.min(x + width, dx + dw) - Math.max(x, dx));
    const overlapY = Math.max(0, Math.min(y + height, dy + dh) - Math.max(y, dy));

    if (overlapX >= minVisibleArea && overlapY >= minVisibleArea) {
      return { x, y }; // Position is valid
    }
  }

  // Position is off-screen, return null to center on primary display
  return null;
}

/**
 * Saves the current window state (bounds, maximized, fullscreen)
 */
function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const isMaximized = mainWindow.isMaximized();
  const isFullScreen = mainWindow.isFullScreen();

  // Only save bounds if window is in normal state (not maximized/fullscreen)
  if (!isMaximized && !isFullScreen) {
    const { x, y, width, height } = mainWindow.getBounds();
    store.set('windowBounds', { x, y, width, height });
  }

  store.set('windowState', { isMaximized, isFullScreen });
}

let mainWindow;
let quickPromptWindow = null;
let tray = null;
let forceQuit = false; // Track if we should really quit on macOS

//=============================================================================
// GLOBAL KEYBOARD SHORTCUTS
//=============================================================================

/**
 * Creates the quick prompt floating window
 * A small input window for rapid prompts that works even when app is not focused
 */
function createQuickPromptWindow() {
  if (quickPromptWindow && !quickPromptWindow.isDestroyed()) {
    quickPromptWindow.show();
    quickPromptWindow.focus();
    return;
  }

  // Get cursor position to show window near it
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = display.bounds;

  // Calculate position (center on current display, slightly above center)
  const windowWidth = 420;
  const windowHeight = 160;
  const windowX = displayX + Math.round((displayWidth - windowWidth) / 2);
  const windowY = displayY + Math.round((displayHeight - windowHeight) / 2) - 100;

  quickPromptWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-quick-prompt.js')
    }
  });

  quickPromptWindow.loadFile(path.join(__dirname, 'quick-prompt.html'));

  quickPromptWindow.once('ready-to-show', () => {
    quickPromptWindow.show();
    quickPromptWindow.focus();
  });

  // Close on blur (clicking outside)
  quickPromptWindow.on('blur', () => {
    if (quickPromptWindow && !quickPromptWindow.isDestroyed()) {
      quickPromptWindow.hide();
    }
  });

  quickPromptWindow.on('closed', () => {
    quickPromptWindow = null;
  });
}

/**
 * Closes the quick prompt window
 */
function closeQuickPromptWindow() {
  if (quickPromptWindow && !quickPromptWindow.isDestroyed()) {
    quickPromptWindow.hide();
  }
}

/**
 * Registers all global keyboard shortcuts
 * These work even when the app is not focused
 */
function registerGlobalShortcuts() {
  const isMac = process.platform === 'darwin';
  const modKey = isMac ? 'Cmd' : 'Ctrl';

  // Quick Prompt: Cmd/Ctrl+Shift+Space
  const quickPromptShortcut = `${modKey}+Shift+Space`;
  const quickPromptRegistered = globalShortcut.register(quickPromptShortcut, () => {
    console.log('Quick prompt shortcut triggered');
    createQuickPromptWindow();
  });
  if (!quickPromptRegistered) {
    console.warn(`Failed to register global shortcut: ${quickPromptShortcut}`);
  } else {
    console.log(`Registered global shortcut: ${quickPromptShortcut} (Quick Prompt)`);
  }

  // Toggle Window: Cmd/Ctrl+Shift+M
  const toggleWindowShortcut = `${modKey}+Shift+M`;
  const toggleRegistered = globalShortcut.register(toggleWindowShortcut, () => {
    console.log('Toggle window shortcut triggered');
    toggleWindow();
  });
  if (!toggleRegistered) {
    console.warn(`Failed to register global shortcut: ${toggleWindowShortcut}`);
  } else {
    console.log(`Registered global shortcut: ${toggleWindowShortcut} (Toggle Window)`);
  }

  // New Chat: Cmd/Ctrl+Shift+N
  const newChatShortcut = `${modKey}+Shift+N`;
  const newChatRegistered = globalShortcut.register(newChatShortcut, () => {
    console.log('New chat shortcut triggered');
    showWindow();
    if (mainWindow) {
      mainWindow.webContents.send('new-chat');
    }
  });
  if (!newChatRegistered) {
    console.warn(`Failed to register global shortcut: ${newChatShortcut}`);
  } else {
    console.log(`Registered global shortcut: ${newChatShortcut} (New Chat)`);
  }

  console.log('Global shortcuts registered');
}

/**
 * Unregisters all global shortcuts
 * Important: Must be called before app quits
 */
function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
  console.log('Global shortcuts unregistered');
}

// IPC handler for quick prompt submission
ipcMain.on('quick-prompt-submit', (event, promptText) => {
  console.log('Quick prompt received:', promptText);

  // Close the quick prompt window
  closeQuickPromptWindow();

  // Show main window and send the prompt
  showWindow();

  if (mainWindow && !mainWindow.isDestroyed()) {
    // Wait a bit for window to be ready, then send the prompt
    setTimeout(() => {
      mainWindow.webContents.send('quick-prompt-message', promptText);
    }, 100);
  }
});

// IPC handler for closing quick prompt
ipcMain.on('quick-prompt-close', () => {
  closeQuickPromptWindow();
});

//=============================================================================
// SYSTEM TRAY INTEGRATION
//=============================================================================

/**
 * Available models for the tray menu
 */
const AVAILABLE_MODELS = [
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gemini-pro', name: 'Gemini Pro' }
];

/**
 * Get the appropriate tray icon path based on platform
 * macOS uses template images for proper dark/light mode support
 */
function getTrayIconPath() {
  const isMac = process.platform === 'darwin';
  
  if (isMac) {
    // Check for template icon first (for macOS menu bar)
    const templateIcon = path.join(__dirname, 'resources', 'trayTemplate.png');
    const templateIcon2x = path.join(__dirname, 'resources', 'trayTemplate@2x.png');
    
    if (fs.existsSync(templateIcon)) {
      return templateIcon;
    }
    if (fs.existsSync(templateIcon2x)) {
      return templateIcon2x;
    }
  }
  
  // Fall back to regular icon
  return path.join(__dirname, 'resources', 'icon.png');
}

/**
 * Creates the system tray with context menu
 */
function createTray() {
  const iconPath = getTrayIconPath();
  
  try {
    tray = new Tray(iconPath);
    
    // Set tooltip
    tray.setToolTip('Meta Agent');
    
    // Build and set context menu
    updateTrayMenu();
    
    // Handle click events
    tray.on('click', () => {
      toggleWindow();
    });
    
    // On macOS, double-click also shows the window
    tray.on('double-click', () => {
      showWindow();
    });
    
    console.log('System tray created successfully');
  } catch (err) {
    console.error('Failed to create system tray:', err);
  }
}

/**
 * Updates the tray context menu (call when model changes, etc.)
 */
function updateTrayMenu() {
  if (!tray) return;
  
  const currentModel = store.get('currentModel') || 'claude-3-5-sonnet';
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Meta Agent',
      click: () => showWindow()
    },
    {
      label: 'New Chat',
      click: () => {
        showWindow();
        if (mainWindow) {
          mainWindow.webContents.send('new-chat');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quick Actions',
      submenu: [
        {
          label: 'Voice Mode',
          click: () => {
            showWindow();
            if (mainWindow) {
              mainWindow.loadURL(isDev ? 'http://localhost:3000/voice' : 'file://' + path.join(__dirname, 'renderer', 'voice.html'));
            }
          }
        },
        {
          label: 'Research Mode',
          click: () => {
            showWindow();
            if (mainWindow) {
              mainWindow.loadURL(isDev ? 'http://localhost:3000/research' : 'file://' + path.join(__dirname, 'renderer', 'research.html'));
            }
          }
        },
        {
          label: 'Computer Use',
          click: () => {
            showWindow();
            if (mainWindow) {
              mainWindow.loadURL(isDev ? 'http://localhost:3000/computer' : 'file://' + path.join(__dirname, 'renderer', 'computer.html'));
            }
          }
        },
        {
          label: 'Thinking Mode',
          click: () => {
            showWindow();
            if (mainWindow) {
              mainWindow.loadURL(isDev ? 'http://localhost:3000/thinking' : 'file://' + path.join(__dirname, 'renderer', 'thinking.html'));
            }
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Model',
      submenu: AVAILABLE_MODELS.map(model => ({
        label: model.name,
        type: 'radio',
        checked: currentModel === model.id,
        click: () => {
          store.set('currentModel', model.id);
          updateTrayMenu(); // Refresh menu to show new selection
          updateTrayTooltip();
          // Notify renderer of model change
          if (mainWindow) {
            mainWindow.webContents.send('model-changed', model.id);
          }
        }
      }))
    },
    { type: 'separator' },
    {
      label: 'Preferences...',
      click: () => {
        showWindow();
        if (mainWindow) {
          mainWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Meta Agent',
      click: () => {
        forceQuit = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

/**
 * Updates the tray tooltip to show current status
 */
function updateTrayTooltip(status) {
  if (!tray) return;
  
  const currentModel = store.get('currentModel') || 'claude-3-5-sonnet';
  const modelName = AVAILABLE_MODELS.find(m => m.id === currentModel)?.name || currentModel;
  
  let tooltip = `Meta Agent - ${modelName}`;
  if (status) {
    tooltip += `\n${status}`;
  }
  
  tray.setToolTip(tooltip);
}

/**
 * Shows the main window and brings it to front
 */
function showWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  
  mainWindow.show();
  mainWindow.focus();
  
  // On macOS, also bring to front
  if (process.platform === 'darwin') {
    app.dock.show();
  }
}

/**
 * Hides the main window
 */
function hideWindow() {
  if (mainWindow) {
    mainWindow.hide();
    
    // On macOS, hide dock icon when window is hidden
    if (process.platform === 'darwin') {
      app.dock.hide();
    }
  }
}

/**
 * Toggles window visibility
 */
function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    hideWindow();
  } else {
    showWindow();
  }
}

/**
 * Destroys the tray icon on app quit
 */
function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

//=============================================================================
// TRAY IPC HANDLERS
//=============================================================================

// Update tray tooltip from renderer
ipcMain.on('tray-set-tooltip', (event, status) => {
  updateTrayTooltip(status);
});

// Update current model from renderer
ipcMain.on('tray-set-model', (event, modelId) => {
  store.set('currentModel', modelId);
  updateTrayMenu();
  updateTrayTooltip();
});

// Get current model
ipcMain.handle('tray-get-model', () => {
  return store.get('currentModel') || 'claude-3-5-sonnet';
});

// Set tray badge/notification indicator (optional feature)
ipcMain.on('tray-set-badge', (event, hasBadge) => {
  // This could be implemented with custom tray icons
  // For now, we update the tooltip to indicate notifications
  if (hasBadge) {
    updateTrayTooltip('New notifications');
  } else {
    updateTrayTooltip();
  }
});

//=============================================================================
// WINDOW CREATION
//=============================================================================

function createWindow() {
  const { width, height, x, y } = store.get('windowBounds');
  const { isMaximized, isFullScreen } = store.get('windowState');
  const useFramelessWindow = store.get('useFramelessWindow');

  // Validate saved position for multi-monitor support
  const validPosition = validateWindowPosition(x, y, width, height);

  // Build window options
  const windowOptions = {
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    title: 'Meta Agent',
    icon: path.join(__dirname, 'resources', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    backgroundColor: '#0f172a',
    show: false
  };

  // Apply validated position if available
  if (validPosition) {
    windowOptions.x = validPosition.x;
    windowOptions.y = validPosition.y;
  }

  // Configure titlebar style based on frameless setting
  if (useFramelessWindow) {
    windowOptions.frame = false;
    windowOptions.titleBarStyle = 'hidden';
  } else {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 15, y: 15 };
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'renderer', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready and restore maximized/fullscreen state
  mainWindow.once('ready-to-show', () => {
    // Restore window state
    if (isMaximized) {
      mainWindow.maximize();
    } else if (isFullScreen) {
      mainWindow.setFullScreen(true);
    }

    mainWindow.show();

    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Save window state on resize/move (debounced to avoid excessive writes)
  let saveStateTimeout;
  const debouncedSaveState = () => {
    if (saveStateTimeout) clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(saveWindowState, 500);
  };

  mainWindow.on('resize', debouncedSaveState);
  mainWindow.on('move', debouncedSaveState);
  mainWindow.on('maximize', () => store.set('windowState.isMaximized', true));
  mainWindow.on('unmaximize', () => store.set('windowState.isMaximized', false));
  mainWindow.on('enter-full-screen', () => store.set('windowState.isFullScreen', true));
  mainWindow.on('leave-full-screen', () => store.set('windowState.isFullScreen', false));

  // Notify renderer of focus changes
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus', true);
  });

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-focus', false);
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // macOS: Hide window instead of closing (unless forceQuit is true)
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !forceQuit) {
      event.preventDefault();
      mainWindow.hide();
      // Hide dock icon when window is hidden
      app.dock.hide();
      return false;
    }
    // Save state before closing
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow && mainWindow.webContents.send('open-settings')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),

    // Enhanced File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow && mainWindow.webContents.send('new-chat')
        },
        { type: 'separator' },
        {
          label: 'Export Chat...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow && mainWindow.webContents.send('export-chat')
        },
        {
          label: 'Import Chat...',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Import Chat',
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ],
              properties: ['openFile']
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow && mainWindow.webContents.send('import-chat', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Open Recent',
          submenu: getRecentChatsSubmenu()
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Enhanced Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow && mainWindow.webContents.send('open-find')
        },
        {
          label: 'Find Next',
          accelerator: 'CmdOrCtrl+G',
          click: () => mainWindow && mainWindow.webContents.send('find-next')
        },
        {
          label: 'Find Previous',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => mainWindow && mainWindow.webContents.send('find-previous')
        }
      ]
    },

    // Enhanced View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: toggleSidebar
        },
        { type: 'separator' },
        {
          label: 'Appearance',
          submenu: getAppearanceSubmenu()
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow && mainWindow.webContents.setZoomLevel(0)
        },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },

    // New Go Menu (navigation with Cmd+Shift shortcuts)
    {
      label: 'Go',
      submenu: [
        {
          label: 'Chat',
          accelerator: 'CmdOrCtrl+Shift+1',
          click: () => mainWindow && mainWindow.webContents.send('navigate', 'chat')
        },
        {
          label: 'Research',
          accelerator: 'CmdOrCtrl+Shift+2',
          click: () => mainWindow && mainWindow.webContents.send('navigate', 'research')
        },
        {
          label: 'Thinking',
          accelerator: 'CmdOrCtrl+Shift+3',
          click: () => mainWindow && mainWindow.webContents.send('navigate', 'thinking')
        },
        {
          label: 'Voice',
          accelerator: 'CmdOrCtrl+Shift+4',
          click: () => mainWindow && mainWindow.webContents.send('navigate', 'voice')
        },
        {
          label: 'Computer Use',
          accelerator: 'CmdOrCtrl+Shift+5',
          click: () => mainWindow && mainWindow.webContents.send('navigate', 'computer')
        },
        { type: 'separator' },
        {
          label: 'Memory',
          accelerator: 'CmdOrCtrl+Shift+6',
          click: () => mainWindow && mainWindow.webContents.send('navigate', 'memory')
        },
        {
          label: 'Tasks',
          accelerator: 'CmdOrCtrl+Shift+7',
          click: () => mainWindow && mainWindow.webContents.send('navigate', 'tasks')
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+Shift+8',
          click: () => mainWindow && mainWindow.webContents.send('navigate', 'settings')
        },
        { type: 'separator' },
        {
          label: 'Back',
          accelerator: 'CmdOrCtrl+[',
          click: () => mainWindow && mainWindow.webContents.goBack()
        },
        {
          label: 'Forward',
          accelerator: 'CmdOrCtrl+]',
          click: () => mainWindow && mainWindow.webContents.goForward()
        }
      ]
    },

    // Keep original Navigate menu with Cmd+1-5 shortcuts for modes
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Chat',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow && mainWindow.loadURL(isDev ? 'http://localhost:3000/chat' : 'file://' + path.join(__dirname, 'renderer', 'chat.html'))
        },
        {
          label: 'Research',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow && mainWindow.loadURL(isDev ? 'http://localhost:3000/research' : 'file://' + path.join(__dirname, 'renderer', 'research.html'))
        },
        {
          label: 'Thinking',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow && mainWindow.loadURL(isDev ? 'http://localhost:3000/thinking' : 'file://' + path.join(__dirname, 'renderer', 'thinking.html'))
        },
        {
          label: 'Voice',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow && mainWindow.loadURL(isDev ? 'http://localhost:3000/voice' : 'file://' + path.join(__dirname, 'renderer', 'voice.html'))
        },
        {
          label: 'Computer Use',
          accelerator: 'CmdOrCtrl+5',
          click: () => mainWindow && mainWindow.loadURL(isDev ? 'http://localhost:3000/computer' : 'file://' + path.join(__dirname, 'renderer', 'computer.html'))
        }
      ]
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' }
        ] : [
          { role: 'close' }
        ])
      ]
    },

    // Help Menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/alanredmond23-bit/SHIPIT')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/alanredmond23-bit/SHIPIT/issues')
        },
        { type: 'separator' },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => mainWindow && mainWindow.webContents.send('show-shortcuts')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for settings
ipcMain.handle('get-setting', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-setting', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('get-theme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

//=============================================================================
// WINDOW CONTROL IPC HANDLERS
//=============================================================================

// Window controls for custom titlebar (if needed)
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Get window state for UI updates
ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('window-is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// Bring window to front and focus
ipcMain.on('window-focus', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
});

// Get window bounds
ipcMain.handle('window-get-bounds', () => {
  return mainWindow ? mainWindow.getBounds() : null;
});

// Set window bounds
ipcMain.on('window-set-bounds', (event, bounds) => {
  if (mainWindow && bounds) {
    const { x, y, width, height } = bounds;
    mainWindow.setBounds({ x, y, width, height });
  }
});

// Center window on screen
ipcMain.on('window-center', () => {
  if (mainWindow) {
    mainWindow.center();
  }
});

// Toggle fullscreen
ipcMain.on('window-toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// Get/Set frameless window setting
ipcMain.handle('get-frameless-mode', () => {
  return store.get('useFramelessWindow');
});

ipcMain.handle('set-frameless-mode', (event, enabled) => {
  store.set('useFramelessWindow', enabled);
  // Note: Requires app restart to take effect
  return true;
});

//=============================================================================
// FILE DIALOG IPC HANDLERS
//=============================================================================

// Supported file types for document uploads
const FILE_FILTERS = {
  documents: [
    { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'] },
    { name: 'Spreadsheets', extensions: ['xls', 'xlsx', 'csv'] },
    { name: 'Presentations', extensions: ['ppt', 'pptx'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  images: [
    { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  code: [
    { name: 'Code Files', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  all: [
    { name: 'All Files', extensions: ['*'] }
  ]
};

// Open file dialog
ipcMain.handle('show-open-dialog', async (event, options = {}) => {
  const {
    title = 'Open File',
    filterType = 'documents',
    multiSelections = false,
    defaultPath
  } = options;

  const dialogOptions = {
    title,
    defaultPath: defaultPath || app.getPath('documents'),
    filters: FILE_FILTERS[filterType] || FILE_FILTERS.all,
    properties: ['openFile']
  };

  if (multiSelections) {
    dialogOptions.properties.push('multiSelections');
  }

  const result = await dialog.showOpenDialog(mainWindow, dialogOptions);

  if (result.canceled) {
    return { canceled: true, filePaths: [] };
  }

  // Read file metadata for each selected file
  const files = await Promise.all(result.filePaths.map(async (filePath) => {
    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
      extension: path.extname(filePath).toLowerCase().slice(1),
      modifiedAt: stats.mtime.toISOString()
    };
  }));

  return { canceled: false, files };
});

// Save file dialog
ipcMain.handle('show-save-dialog', async (event, options = {}) => {
  const {
    title = 'Save File',
    defaultPath,
    defaultName = 'untitled',
    filterType = 'documents'
  } = options;

  const dialogOptions = {
    title,
    defaultPath: defaultPath || path.join(app.getPath('documents'), defaultName),
    filters: FILE_FILTERS[filterType] || FILE_FILTERS.all
  };

  const result = await dialog.showSaveDialog(mainWindow, dialogOptions);

  if (result.canceled) {
    return { canceled: true, filePath: null };
  }

  return { canceled: false, filePath: result.filePath };
});

// Select directory dialog
ipcMain.handle('show-directory-dialog', async (event, options = {}) => {
  const {
    title = 'Select Folder',
    defaultPath
  } = options;

  const result = await dialog.showOpenDialog(mainWindow, {
    title,
    defaultPath: defaultPath || app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled) {
    return { canceled: true, path: null };
  }

  return { canceled: false, path: result.filePaths[0] };
});

// Read file content (for uploaded files)
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);

    // Limit file size to 50MB for safety
    if (stats.size > 50 * 1024 * 1024) {
      return { error: 'File too large (max 50MB)' };
    }

    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Return base64 for binary files, string for text
    const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css', '.csv', '.xml'];
    const isText = textExtensions.includes(ext);

    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      content: isText ? content.toString('utf8') : content.toString('base64'),
      encoding: isText ? 'utf8' : 'base64',
      mimeType: getMimeType(ext)
    };
  } catch (err) {
    return { error: err.message };
  }
});

// Write file content
ipcMain.handle('write-file', async (event, { filePath, content, encoding = 'utf8' }) => {
  try {
    const data = encoding === 'base64' ? Buffer.from(content, 'base64') : content;
    fs.writeFileSync(filePath, data);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

// Helper: Get MIME type from extension
function getMimeType(ext) {
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

//=============================================================================
// APP INFO AND UTILITIES
//=============================================================================

// Get app info
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome
  };
});

// Open external URL
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return true;
});

// Show item in folder
ipcMain.handle('show-in-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

//=============================================================================
// AUTO-UPDATER FUNCTIONS
//=============================================================================

function setupAutoUpdater() {
  // Skip auto-updater in development mode
  if (isDev) {
    console.log('Auto-updater disabled in development mode');
    return;
  }

  // Auto-updater event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    updateInfo = info;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }

    // Show notification
    showUpdateNotification('Update Available', `Version ${info.version} is available. Click to download.`);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('No updates available. Current version:', app.getVersion());
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available', {
        currentVersion: app.getVersion()
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', {
        message: err.message || 'Unknown error occurred'
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `Download speed: ${Math.round(progressObj.bytesPerSecond / 1024)} KB/s - Downloaded ${Math.round(progressObj.percent)}%`;
    console.log(logMessage);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', {
        bytesPerSecond: progressObj.bytesPerSecond,
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    updateDownloaded = true;
    updateInfo = info;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }

    // Show dialog to restart
    showUpdateReadyDialog(info.version);
  });

  // Initial check for updates (wait a bit after app starts)
  setTimeout(() => {
    checkForUpdates(true);
  }, 10000); // Check 10 seconds after app starts

  // Schedule periodic update checks (every 4 hours)
  updateCheckTimer = setInterval(() => {
    checkForUpdates(true);
  }, UPDATE_CHECK_INTERVAL);
}

function checkForUpdates(silent = false) {
  if (isDev) {
    console.log('Update check skipped in development mode');
    if (!silent && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available', {
        currentVersion: app.getVersion(),
        message: 'Update checks are disabled in development mode'
      });
    }
    return;
  }

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Failed to check for updates:', err);
    if (!silent && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', {
        message: err.message || 'Failed to check for updates'
      });
    }
  });
}

function downloadUpdate() {
  if (isDev) {
    console.log('Update download skipped in development mode');
    return;
  }

  autoUpdater.downloadUpdate().catch((err) => {
    console.error('Failed to download update:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', {
        message: err.message || 'Failed to download update'
      });
    }
  });
}

function installUpdate() {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall(false, true);
  }
}

function showUpdateNotification(title, body) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, 'resources', 'icon.png')
    });

    notification.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notification.show();
  }
}

async function showUpdateReadyDialog(version) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: `Version ${version} has been downloaded`,
    detail: 'The update will be installed when you restart the app. Would you like to restart now?',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    installUpdate();
  }
}

//=============================================================================
// AUTO-UPDATER IPC HANDLERS
//=============================================================================

// Check for updates (manual trigger)
ipcMain.handle('check-for-updates', () => {
  checkForUpdates(false);
  return true;
});

// Download the available update
ipcMain.handle('download-update', () => {
  downloadUpdate();
  return true;
});

// Quit and install the downloaded update
ipcMain.handle('install-update', () => {
  installUpdate();
  return true;
});

// Get current update status
ipcMain.handle('get-update-status', () => {
  return {
    updateAvailable: updateInfo !== null && !updateDownloaded,
    updateDownloaded,
    updateInfo: updateInfo ? {
      version: updateInfo.version,
      releaseDate: updateInfo.releaseDate,
      releaseNotes: updateInfo.releaseNotes
    } : null,
    currentVersion: app.getVersion(),
    isDev
  };
});

//=============================================================================
// MENU ENHANCEMENT IPC HANDLERS
//=============================================================================

// Add to recent chats from renderer
ipcMain.on('add-recent-chat', (event, chatInfo) => {
  addToRecentChats(chatInfo);
});

// Get sidebar visibility state
ipcMain.handle('get-sidebar-visible', () => {
  return store.get('sidebarVisible');
});

// Set sidebar visibility
ipcMain.on('set-sidebar-visible', (event, visible) => {
  store.set('sidebarVisible', visible);
});

// Search in page
ipcMain.on('find-in-page', (event, text, options = {}) => {
  if (mainWindow && text) {
    mainWindow.webContents.findInPage(text, options);
  }
});

// Stop find in page
ipcMain.on('stop-find-in-page', (event, action = 'clearSelection') => {
  if (mainWindow) {
    mainWindow.webContents.stopFindInPage(action);
  }
});

// Handle context menu for text selection
ipcMain.on('show-context-menu', (event, params) => {
  const { selectionText } = params;

  const menuItems = [];

  if (selectionText) {
    menuItems.push(
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        click: () => mainWindow && mainWindow.webContents.copy()
      },
      { type: 'separator' },
      {
        label: `Search Google for "${selectionText.substring(0, 30)}${selectionText.length > 30 ? '...' : ''}"`,
        click: () => {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectionText)}`;
          shell.openExternal(searchUrl);
        }
      }
    );
  } else {
    menuItems.push(
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { role: 'selectAll' }
    );
  }

  const contextMenu = Menu.buildFromTemplate(menuItems);
  contextMenu.popup({ window: mainWindow });
});

//=============================================================================
// APP LIFECYCLE
//=============================================================================

// App events
app.whenReady().then(async () => {
  // Check setup before launching
  const issues = checkSetup();

  if (issues.length > 0) {
    console.log('Setup issues detected:', issues);
    await handleSetupIssues(issues);
    return; // Don't proceed - handleSetupIssues will quit the app
  }

  // All good - create the window, tray, register shortcuts, and setup auto-updater
  createWindow();
  createTray();
  registerGlobalShortcuts();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  // On macOS, keep app running in tray when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, show window when dock icon is clicked
  if (mainWindow) {
    showWindow();
  } else {
    createWindow();
  }
});

// Handle before-quit to set forceQuit flag
app.on('before-quit', () => {
  forceQuit = true;
});

// Cleanup tray, shortcuts, and update timer on quit
app.on('will-quit', () => {
  unregisterGlobalShortcuts();
  destroyTray();
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
});

// Handle certificate errors in development
if (isDev) {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('http://localhost')) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });
}

console.log('Meta Agent Desktop starting...');
console.log('Development mode:', isDev);
