const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Detect development mode without external package
const isDev = !app.isPackaged;

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
app.whenReady().then(createWindow);

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
