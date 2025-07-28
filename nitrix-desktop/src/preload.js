const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform: () => ipcRenderer.invoke('get-platform'),
    
    // File operations
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    // Menu actions
    onMenuAction: (callback) => {
        const listener = (event, ...args) => callback(...args);
        ipcRenderer.on('menu-action', listener);
        return () => {
            ipcRenderer.removeListener('menu-action', listener);
        };
    },
});

// Security: Remove Node.js access from renderer
delete window.require;
delete window.exports;
delete window.module;