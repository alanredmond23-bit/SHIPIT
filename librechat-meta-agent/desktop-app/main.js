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
