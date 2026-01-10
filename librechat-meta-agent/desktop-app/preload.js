const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  //===========================================================================
  // Settings
  //===========================================================================
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

  //===========================================================================
  // Theme
  //===========================================================================
  getTheme: () => ipcRenderer.invoke('get-theme'),

  //===========================================================================
  // Navigation events from main process
  //===========================================================================
  onNewChat: (callback) => {
    ipcRenderer.on('new-chat', callback);
    return () => ipcRenderer.removeListener('new-chat', callback);
  },
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', callback);
    return () => ipcRenderer.removeListener('open-settings', callback);
  },

  //===========================================================================
  // App info
  //===========================================================================
  platform: process.platform,
  isElectron: true,
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  //===========================================================================
  // Window controls (for custom titlebar if needed)
  //===========================================================================
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  //===========================================================================
  // File operations
  //===========================================================================

  /**
   * Show file open dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.filterType - 'documents' | 'images' | 'code' | 'all'
   * @param {boolean} options.multiSelections - Allow multiple file selection
   * @param {string} options.defaultPath - Starting directory
   * @returns {Promise<{canceled: boolean, files: Array}>}
   */
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  /**
   * Show file save dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.defaultPath - Starting directory
   * @param {string} options.defaultName - Default file name
   * @param {string} options.filterType - 'documents' | 'images' | 'code' | 'all'
   * @returns {Promise<{canceled: boolean, filePath: string|null}>}
   */
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  /**
   * Show directory picker dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.defaultPath - Starting directory
   * @returns {Promise<{canceled: boolean, path: string|null}>}
   */
  showDirectoryDialog: (options) => ipcRenderer.invoke('show-directory-dialog', options),

  /**
   * Read file content
   * @param {string} filePath - Path to file
   * @returns {Promise<{name, path, size, content, encoding, mimeType} | {error: string}>}
   */
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  /**
   * Write file content
   * @param {Object} options
   * @param {string} options.filePath - Path to write to
   * @param {string} options.content - Content to write
   * @param {string} options.encoding - 'utf8' or 'base64'
   * @returns {Promise<{success: boolean} | {error: string}>}
   */
  writeFile: (options) => ipcRenderer.invoke('write-file', options),

  //===========================================================================
  // External resources
  //===========================================================================

  /**
   * Open URL in default browser
   * @param {string} url - URL to open
   */
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  /**
   * Show file in OS file manager
   * @param {string} filePath - Path to file
   */
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),

  //===========================================================================
  // Notifications
  //===========================================================================
  showNotification: (title, body, options = {}) => {
    const notification = new Notification(title, {
      body,
      icon: options.icon,
      ...options
    });

    if (options.onClick) {
      notification.onclick = options.onClick;
    }

    return notification;
  }
});

// Utility for detecting Electron environment in renderer
contextBridge.exposeInMainWorld('isElectronApp', true);

// Log when preload script runs
console.log('Meta Agent preload script loaded');
console.log('Platform:', process.platform);
