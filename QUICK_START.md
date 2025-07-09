# 🚀 Nitrix Quick Start Guide

## 🎯 One-Click Auto-Start (Recommended)

### Option 1: Ultimate Auto-Start Script
```bash
# macOS/Linux
./NITRIX_AUTOSTART.sh

# Windows
NITRIX_AUTOSTART.bat
```

### Option 2: Double-Click Desktop Launch
```bash
# macOS - Double-click this file
./LAUNCH_NITRIX.command

# Windows - Double-click this file
NITRIX_AUTOSTART.bat
```

### Option 3: npm Scripts
```bash
npm start           # Auto-start everything
npm run launch      # Desktop launcher
npm run setup       # One-time setup
```

---

## 🖥️ Desktop App (True Auto-Start)

### Quick Launch
```bash
npm run desktop-app
```

### Build Desktop App
```bash
npm run build-desktop
```

The desktop app provides:
- ✅ One-click launch from desktop
- ✅ Auto-start services in background
- ✅ System integration
- ✅ Splash screen with progress
- ✅ Menu bar controls

---

## 🔧 System Auto-Start (Boot with System)

### Install System Auto-Start
```bash
./install-autostart.sh install
```

### Uninstall System Auto-Start
```bash
./install-autostart.sh uninstall
```

After installation:
- **macOS**: Uses LaunchAgent (starts on login)
- **Linux**: Uses systemd user service
- **Windows**: Creates startup scripts

---

## 🛠️ Manual Control

### Start Services
```bash
npm start
```

### Stop Services
```bash
npm run stop-services
```

### Health Check
```bash
npm run health-check
```

### Setup Dependencies
```bash
npm run setup
```

---

## 🎨 All Available Options

| Method | Platform | Auto-Start | User Action |
|--------|----------|-----------|-------------|
| **NITRIX_AUTOSTART.sh** | macOS/Linux | ✅ | Run script |
| **NITRIX_AUTOSTART.bat** | Windows | ✅ | Run batch file |
| **LAUNCH_NITRIX.command** | macOS | ✅ | Double-click |
| **Desktop App** | All | ✅ | Launch app |
| **System Auto-Start** | All | ✅ | Boot with system |
| **npm start** | All | ✅ | Terminal command |

---

## 🔥 Quick Test

1. **Start Nitrix**: `./NITRIX_AUTOSTART.sh`
2. **Wait for**: "🎉 NITRIX IS NOW RUNNING!"
3. **Open**: http://localhost:5173
4. **Test**: Upload sample data and train a model

---

## 🌐 URLs When Running

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 📱 Features Ready

- 🤖 **AI Training**: 8 advanced ML algorithms
- 📊 **Data Upload**: Drag & drop CSV/JSON files
- 🎯 **Real-time Progress**: Live training metrics
- 🔮 **Predictions**: Interactive model testing
- 🎨 **Modern UI**: Responsive glassmorphism design
- 🔒 **Privacy**: All processing happens locally

---

## 🚨 Troubleshooting

### Services Not Starting
```bash
npm run stop-services
npm run setup
npm start
```

### Permission Denied
```bash
chmod +x NITRIX_AUTOSTART.sh
chmod +x LAUNCH_NITRIX.command
chmod +x install-autostart.sh
```

### Port Already in Use
```bash
# Kill existing processes
pkill -f "uvicorn"
pkill -f "vite"
# Then restart
npm start
```

---

## 🎉 Success!

When you see this message, you're ready to go:

```
🎉 NITRIX IS NOW RUNNING!
=======================================
🌐 Frontend:  http://localhost:5173
🔧 Backend:   http://localhost:8000
📚 API Docs:  http://localhost:8000/docs
=======================================
```

**Happy AI Training!** 🚀