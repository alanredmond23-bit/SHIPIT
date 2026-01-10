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
  // Quick Prompt (Global Shortcut)
  //===========================================================================

  /**
   * Listen for quick prompt messages from the global shortcut
   * @param {Function} callback - Callback with the prompt text
   * @returns {Function} Unsubscribe function
   */
  onQuickPromptMessage: (callback) => {
    ipcRenderer.on('quick-prompt-message', (event, text) => callback(text));
    return () => ipcRenderer.removeListener('quick-prompt-message', callback);
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
  isFullscreen: () => ipcRenderer.invoke('window-is-fullscreen'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),

  // Window focus management
  focus: () => ipcRenderer.send('window-focus'),
  center: () => ipcRenderer.send('window-center'),
  getBounds: () => ipcRenderer.invoke('window-get-bounds'),
  setBounds: (bounds) => ipcRenderer.send('window-set-bounds', bounds),

  // Window focus events
  onWindowFocus: (callback) => {
    ipcRenderer.on('window-focus', (event, isFocused) => callback(isFocused));
    return () => ipcRenderer.removeListener('window-focus', callback);
  },

  // Frameless window mode setting
  getFramelessMode: () => ipcRenderer.invoke('get-frameless-mode'),
  setFramelessMode: (enabled) => ipcRenderer.invoke('set-frameless-mode', enabled),

  //===========================================================================
  // System Tray
  //===========================================================================
  
  /**
   * Set the tray tooltip/status message
   * @param {string} status - Status message to display
   */
  setTrayTooltip: (status) => ipcRenderer.send('tray-set-tooltip', status),

  /**
   * Set the current model (updates tray menu)
   * @param {string} modelId - Model identifier
   */
  setTrayModel: (modelId) => ipcRenderer.send('tray-set-model', modelId),

  /**
   * Get the current model from tray settings
   * @returns {Promise<string>} Current model ID
   */
  getTrayModel: () => ipcRenderer.invoke('tray-get-model'),

  /**
   * Set tray badge/notification indicator
   * @param {boolean} hasBadge - Whether to show badge
   */
  setTrayBadge: (hasBadge) => ipcRenderer.send('tray-set-badge', hasBadge),

  /**
   * Listen for model changes from tray menu
   * @param {Function} callback - Callback with new model ID
   * @returns {Function} Unsubscribe function
   */
  onModelChanged: (callback) => {
    ipcRenderer.on('model-changed', (event, modelId) => callback(modelId));
    return () => ipcRenderer.removeListener('model-changed', callback);
  },

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
  },

  //===========================================================================
  // Auto-Updater
  //===========================================================================

  /**
   * Check for application updates
   * @returns {Promise<boolean>}
   */
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  /**
   * Download the available update
   * @returns {Promise<boolean>}
   */
  downloadUpdate: () => ipcRenderer.invoke('download-update'),

  /**
   * Install the downloaded update and restart
   * @returns {Promise<boolean>}
   */
  installUpdate: () => ipcRenderer.invoke('install-update'),

  /**
   * Get current update status
   * @returns {Promise<{updateAvailable, updateDownloaded, updateInfo, currentVersion, isDev}>}
   */
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),

  /**
   * Listen for update checking started
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onUpdateChecking: (callback) => {
    ipcRenderer.on('update-checking', callback);
    return () => ipcRenderer.removeListener('update-checking', callback);
  },

  /**
   * Listen for update available
   * @param {Function} callback - Receives {version, releaseDate, releaseNotes}
   * @returns {Function} Unsubscribe function
   */
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
    return () => ipcRenderer.removeListener('update-available', callback);
  },

  /**
   * Listen for no update available
   * @param {Function} callback - Receives {currentVersion, message?}
   * @returns {Function} Unsubscribe function
   */
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', (event, info) => callback(info));
    return () => ipcRenderer.removeListener('update-not-available', callback);
  },

  /**
   * Listen for update download progress
   * @param {Function} callback - Receives {bytesPerSecond, percent, transferred, total}
   * @returns {Function} Unsubscribe function
   */
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, progress) => callback(progress));
    return () => ipcRenderer.removeListener('update-download-progress', callback);
  },

  /**
   * Listen for update downloaded
   * @param {Function} callback - Receives {version, releaseDate, releaseNotes}
   * @returns {Function} Unsubscribe function
   */
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
    return () => ipcRenderer.removeListener('update-downloaded', callback);
  },

  /**
   * Listen for update errors
   * @param {Function} callback - Receives {message}
   * @returns {Function} Unsubscribe function
   */
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, error) => callback(error));
    return () => ipcRenderer.removeListener('update-error', callback);
  }
});

// Utility for detecting Electron environment in renderer
contextBridge.exposeInMainWorld('isElectronApp', true);

// Log when preload script runs
console.log('Meta Agent preload script loaded');
console.log('Platform:', process.platform);
