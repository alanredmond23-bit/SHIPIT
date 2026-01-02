const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

  // Theme
  getTheme: () => ipcRenderer.invoke('get-theme'),

  // Navigation events from main process
  onNewChat: (callback) => ipcRenderer.on('new-chat', callback),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),

  // App info
  platform: process.platform,
  isElectron: true,

  // Window controls (for custom titlebar if needed)
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // File operations
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  // Notifications
  showNotification: (title, body) => {
    new Notification(title, { body });
  }
});

// Log when preload script runs
console.log('Meta Agent preload script loaded');
console.log('Platform:', process.platform);
