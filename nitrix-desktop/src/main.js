const { app, BrowserWindow, Menu, ipcMain, dialog, shell, session } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

function sanitizeUrl(url) {
  const parsedUrl = new URL(url);
  if (['https:', 'http:'].includes(parsedUrl.protocol)) {
    return url;
  }
  return '';
}

// Keep a global reference of the window object
let mainWindow;
let splashWindow;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splashWindow.loadFile('src/splash.html');
    
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

function createMainWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        show: false, // Don't show until ready
        icon: path.join(__dirname, '../assets/icon.png'),
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        }
    });

    // Load the main app
    mainWindow.loadFile('src/index.html');

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        splashWindow.destroy();
        mainWindow.show();
        
        // Focus on macOS
        if (process.platform === 'darwin') {
            mainWindow.focus();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const sanitized = sanitizeUrl(url);
        if (sanitized) {
            shell.openExternal(sanitized);
        }
        return { action: 'deny' };
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["script-src 'self'"]
            }
        })
    })

    createSplashWindow();
    createMainWindow();

    // Create application menu
    createMenu();

    app.on('activate', () => {
        // On macOS re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        const sanitized = sanitizeUrl(navigationUrl);
        if (sanitized) {
            shell.openExternal(sanitized);
        }
    });
});

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'new-project');
                    }
                },
                {
                    label: 'Open Project',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openDirectory'],
                            title: 'Select Project Folder'
                        });
                        
                        if (!result.canceled) {
                            mainWindow.webContents.send('menu-action', 'open-project', result.filePaths[0]);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export Model',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'export-model');
                    }
                },
                { type: 'separator' },
                {
                    role: process.platform === 'darwin' ? 'close' : 'quit'
                }
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
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'AI',
            submenu: [
                {
                    label: 'Train Model',
                    accelerator: 'CmdOrCtrl+T',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'train-model');
                    }
                },
                {
                    label: 'Test Model',
                    accelerator: 'CmdOrCtrl+Shift+T',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'test-model');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Model Settings',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'model-settings');
                    }
                }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'About Nitrix',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Nitrix',
                            message: 'Nitrix v1.0.0',
                            detail: 'Train Smarter AI—No Cloud, No Code, Just Power\n\nBuilt with Electron and TensorFlow.js'
                        });
                    }
                },
                {
                    label: 'Documentation',
                    click: () => {
                        const sanitized = sanitizeUrl('https://docs.nitrix.ai');
                        if (sanitized) {
                            shell.openExternal(sanitized);
                        }
                    }
                },
                {
                    label: 'Report Issue',
                    click: () => {
                        const sanitized = sanitizeUrl('https://github.com/nitrix/issues');
                        if (sanitized) {
                            shell.openExternal(sanitized);
                        }
                    }
                }
            ]
        }
    ];

    // macOS menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });

        // Window menu
        template[5].submenu = [
            { role: 'close' },
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' }
        ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('get-platform', () => {
    return process.platform;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
        await fs.writeFile(filePath, data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Handle app protocol for deep linking
app.setAsDefaultProtocolClient('nitrix');

// Handle protocol for Windows/Linux
app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// macOS protocol handler
app.on('open-url', (event, url) => {
    event.preventDefault();
    // Handle nitrix:// protocol
    console.log('Protocol URL:', url);
});