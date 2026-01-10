const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const Store = require('electron-store');

// Detect development mode without external package
const isDev = !app.isPackaged;

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
    windowBounds: { width: 1400, height: 900 },
    theme: 'system',
    apiEndpoint: 'http://localhost:3100'
  }
});

let mainWindow;

function createWindow() {
  const { width, height } = store.get('windowBounds');

  mainWindow = new BrowserWindow({
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
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#0f172a',
    show: false
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'renderer', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Save window size on resize
  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds();
    store.set('windowBounds', { width, height });
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
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
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('open-settings')
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
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('new-chat')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Chat',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow.loadURL(isDev ? 'http://localhost:3000/chat' : 'file://' + path.join(__dirname, 'renderer', 'chat.html'))
        },
        {
          label: 'Research',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.loadURL(isDev ? 'http://localhost:3000/research' : 'file://' + path.join(__dirname, 'renderer', 'research.html'))
        },
        {
          label: 'Thinking',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.loadURL(isDev ? 'http://localhost:3000/thinking' : 'file://' + path.join(__dirname, 'renderer', 'thinking.html'))
        },
        {
          label: 'Voice',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow.loadURL(isDev ? 'http://localhost:3000/voice' : 'file://' + path.join(__dirname, 'renderer', 'voice.html'))
        },
        {
          label: 'Computer Use',
          accelerator: 'CmdOrCtrl+5',
          click: () => mainWindow.loadURL(isDev ? 'http://localhost:3000/computer' : 'file://' + path.join(__dirname, 'renderer', 'computer.html'))
        }
      ]
    },
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

// App events
app.whenReady().then(async () => {
  // Check setup before launching
  const issues = checkSetup();

  if (issues.length > 0) {
    console.log('Setup issues detected:', issues);
    await handleSetupIssues(issues);
    return; // Don't proceed - handleSetupIssues will quit the app
  }

  // All good - create the window
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
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
