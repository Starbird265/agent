const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
let isDev = false;
try {
  isDev = require('electron-is-dev');
} catch (e) {
  isDev = process.env.NODE_ENV === 'development';
}

let mainWindow;
let backendProcess;
let frontendProcess;

// Function to create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // icon: path.join(__dirname, 'assets', 'icon.png'), // Disabled until icon exists
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the splash screen first
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startServices();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    stopServices();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Set up menu
  createMenu();
  
  // Set up IPC handlers
  setupIPC();
}

// Function to create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          }
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open-project');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
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
      label: 'Tools',
      submenu: [
        {
          label: 'Restart Services',
          click: () => {
            restartServices();
          }
        },
        {
          label: 'Open Backend Logs',
          click: () => {
            // Open backend logs in system default app
            shell.openPath(path.join(__dirname, '..', 'backend', 'logs'));
          }
        },
        {
          label: 'Open API Documentation',
          click: () => {
            shell.openExternal('http://localhost:8000/docs');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Nitrix',
          click: () => {
            mainWindow.webContents.send('menu-about');
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/your-org/nitrix');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Function to set up IPC handlers
function setupIPC() {
  // Handle app version request
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
  
  // Handle restart services request
  ipcMain.handle('restart-services', () => {
    stopServices();
    setTimeout(() => {
      startServices();
    }, 2000);
  });
  
  // Handle external link opening
  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
  });
}

// Function to start backend and frontend services
function startServices() {
  const projectRoot = path.join(__dirname, '..');
  
  // Update splash screen
  mainWindow.webContents.send('update-status', 'Starting services...');

  // Start backend
  startBackend(projectRoot);
  
  // Start frontend after backend is ready
  setTimeout(() => {
    startFrontend(projectRoot);
    
    // Navigate to the actual app after services start
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:5173');
    }, 8000);
  }, 5000);
}

// Function to start backend
function startBackend(projectRoot) {
  mainWindow.webContents.send('update-status', 'Starting backend server...');
  
  const isWindows = process.platform === 'win32';
  const pythonCmd = isWindows ? 'python' : 'python3';
  const activateCmd = isWindows ? 
    path.join(projectRoot, 'venv', 'Scripts', 'activate.bat') : 
    path.join(projectRoot, 'venv', 'bin', 'activate');
  
  // Command to activate venv and run backend
  const backendCmd = isWindows ? 
    `call "${activateCmd}" && cd "${path.join(projectRoot, 'backend')}" && ${pythonCmd} simple_main.py` :
    `source "${activateCmd}" && cd "${path.join(projectRoot, 'backend')}" && ${pythonCmd} simple_main.py`;
  
  backendProcess = spawn(isWindows ? 'cmd' : 'bash', 
    isWindows ? ['/c', backendCmd] : ['-c', backendCmd], 
    {
      cwd: projectRoot,
      stdio: 'pipe'
    }
  );

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

// Function to start frontend
function startFrontend(projectRoot) {
  mainWindow.webContents.send('update-status', 'Starting frontend server...');
  
  const frontendPath = path.join(projectRoot, 'packages', 'frontend');
  
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: frontendPath,
    stdio: 'pipe'
  });

  frontendProcess.stdout.on('data', (data) => {
    console.log(`Frontend: ${data}`);
  });

  frontendProcess.stderr.on('data', (data) => {
    console.error(`Frontend Error: ${data}`);
  });

  frontendProcess.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
  });
}

// Function to stop services
function stopServices() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  
  if (frontendProcess) {
    frontendProcess.kill();
    frontendProcess = null;
  }
}

// Function to restart services
function restartServices() {
  stopServices();
  setTimeout(() => {
    startServices();
  }, 2000);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServices();
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('restart-services', () => {
  restartServices();
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});