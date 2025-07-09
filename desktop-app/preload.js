const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Services
  restartServices: () => ipcRenderer.invoke('restart-services'),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Menu events
  onMenuNewProject: (callback) => ipcRenderer.on('menu-new-project', callback),
  onMenuOpenProject: (callback) => ipcRenderer.on('menu-open-project', callback),
  onMenuAbout: (callback) => ipcRenderer.on('menu-about', callback),
  
  // Status updates
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});