# 🚀 Nitrix Auto-Start Guide

## One-Click Auto-Start Solutions

Nitrix now provides multiple ways to automatically start with zero configuration required!

### 🎯 Quick Start (Recommended)

**For macOS/Linux:**
```bash
./NITRIX_AUTOSTART.sh
```

**For Windows:**
```batch
NITRIX_AUTOSTART.bat
```

That's it! The script will:
- ✅ Check system requirements
- ✅ Set up Python virtual environment
- ✅ Install all dependencies automatically
- ✅ Start backend and frontend services
- ✅ Open your browser to the app
- ✅ Handle all error cases gracefully

---

## 🖥️ Desktop App (True Auto-Start)

### Install Desktop App
```bash
cd desktop-app
npm install
npm start
```

### Build Desktop App
```bash
# For your current platform
npm run build

# For specific platforms
npm run build:mac     # macOS
npm run build:win     # Windows
npm run build:linux   # Linux
```

The desktop app provides:
- 🚀 **One-click launch** - Just double-click the app icon
- 🔄 **Auto-start services** - Backend and frontend start automatically
- 📱 **System integration** - Native desktop experience
- 🎨 **Splash screen** - Beautiful loading experience
- 📊 **Status updates** - Real-time startup progress
- 🛠️ **Built-in tools** - Service restart, logs, API docs

---

## 🛠️ Manual Setup (If Needed)

### 1. Run Auto-Setup
```bash
chmod +x auto-setup.sh
./auto-setup.sh
```

### 2. Start Services
```bash
# Option A: Use the auto-start script
./NITRIX_AUTOSTART.sh

# Option B: Use npm
npm start

# Option C: Start manually
cd backend && source ../venv/bin/activate && python simple_main.py &
cd packages/frontend && npm run dev
```

---

## 📋 System Requirements

### Minimum Requirements
- **Node.js**: 18.0.0 or higher
- **Python**: 3.8 or higher
- **npm**: 9.0.0 or higher
- **RAM**: 4GB available
- **Storage**: 2GB free space

### Supported Platforms
- ✅ **macOS** (Intel & Apple Silicon)
- ✅ **Windows** (10/11)
- ✅ **Linux** (Ubuntu, Debian, CentOS, etc.)

---

## 🔧 Features Fixed

### ✅ Dependency Issues Resolved
- **Python Dependencies**: Simplified requirements.txt with fallbacks
- **Build Issues**: Removed problematic packages (pydantic-core, grpcio)
- **Virtual Environment**: Automatic creation and activation
- **Cross-platform**: Works on macOS, Windows, and Linux

### ✅ Auto-Start Improvements
- **Background Services**: Backend and frontend start automatically
- **Process Management**: Clean startup and shutdown
- **Error Handling**: Graceful fallbacks for missing dependencies
- **Browser Integration**: Automatically opens the app in your browser

### ✅ Enhanced User Experience
- **One-Command Setup**: `./NITRIX_AUTOSTART.sh` does everything
- **Progress Feedback**: Real-time status updates during startup
- **Service Health**: Automatic health checks and restart capabilities
- **Clean Shutdown**: Proper cleanup of all processes

---

## 🌐 URLs When Running

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Main application interface |
| **Backend** | http://localhost:8000 | API server |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation |
| **Health Check** | http://localhost:8000/health | Service health status |

---

## 🚨 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Kill existing processes
pkill -f "uvicorn"
pkill -f "vite"
# Then restart
./NITRIX_AUTOSTART.sh
```

**2. Python Virtual Environment Issues**
```bash
# Remove and recreate
rm -rf venv
./auto-setup.sh
```

**3. Node.js Dependencies Issues**
```bash
# Clean install
cd packages/frontend
rm -rf node_modules package-lock.json
npm install
```

**4. Permission Denied (macOS/Linux)**
```bash
chmod +x NITRIX_AUTOSTART.sh
chmod +x auto-setup.sh
```

### Advanced Troubleshooting

**Check Service Status:**
```bash
# Check if services are running
curl http://localhost:8000/health
curl http://localhost:5173
```

**View Logs:**
```bash
# Backend logs
tail -f backend/logs/app.log

# Frontend logs (check browser console)
# Desktop app logs (check terminal)
```

---

## 🔥 Quick Test

After starting, test the platform:

1. **Upload Sample Data**: Use `sample_iris_dataset.csv`
2. **Start Training**: Select "Random Forest" algorithm
3. **Expected Results**: 90-95% accuracy in 1-2 minutes
4. **Make Predictions**: Test with sample data

---

## 🎯 Production Deployment

### Option 1: Auto-Start Script
```bash
# Make executable
chmod +x NITRIX_AUTOSTART.sh

# Run on server
./NITRIX_AUTOSTART.sh
```

### Option 2: Docker (Coming Soon)
```bash
docker build -t nitrix .
docker run -p 5173:5173 -p 8000:8000 nitrix
```

### Option 3: Desktop App Distribution
```bash
# Build for all platforms
npm run build:mac
npm run build:win
npm run build:linux
```

---

## 📝 License

MIT License - Feel free to use, modify, and distribute!

---

## 🆘 Support

- **Issues**: Report on GitHub
- **Documentation**: Check `/docs` folder
- **Community**: Join our Discord (link in main README)

---

## 🎉 Success!

If you see this message, you're all set:

```
🎉 NITRIX IS NOW RUNNING!
=======================================
🌐 Frontend:  http://localhost:5173
🔧 Backend:   http://localhost:8000
📚 API Docs:  http://localhost:8000/docs
=======================================
```

**Happy AI Training!** 🚀