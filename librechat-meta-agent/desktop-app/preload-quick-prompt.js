const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the quick prompt renderer process
contextBridge.exposeInMainWorld('quickPromptAPI', {
  /**
   * Submit the quick prompt text to the main window
   * @param {string} text - The prompt text to send
   */
  submit: (text) => ipcRenderer.send('quick-prompt-submit', text),

  /**
   * Close the quick prompt window
   */
  close: () => ipcRenderer.send('quick-prompt-close')
});

// Log when preload script runs
console.log('Quick Prompt preload script loaded');
