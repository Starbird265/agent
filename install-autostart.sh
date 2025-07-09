#!/bin/bash

# 🚀 NITRIX SYSTEM AUTO-START INSTALLER
# Installs Nitrix to start automatically when the system boots

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}🎯 $1${NC}"
    echo -e "${PURPLE}=================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_status() {
    echo -e "${BLUE}🔹 $1${NC}"
}

# Get current directory
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to install on macOS
install_macos() {
    print_status "Installing macOS auto-start..."
    
    # Create Launch Agent
    PLIST_PATH="$HOME/Library/LaunchAgents/com.nitrix.autostart.plist"
    
    cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nitrix.autostart</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$CURRENT_DIR/NITRIX_AUTOSTART.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/nitrix-autostart.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/nitrix-autostart-error.log</string>
    <key>WorkingDirectory</key>
    <string>$CURRENT_DIR</string>
</dict>
</plist>
EOF
    
    # Load the launch agent
    launchctl load "$PLIST_PATH"
    
    print_success "macOS auto-start installed"
    print_status "Nitrix will start automatically on login"
    print_status "Logs: ~/Library/Logs/nitrix-autostart.log"
}

# Function to install on Linux
install_linux() {
    print_status "Installing Linux auto-start..."
    
    # Create systemd user service
    SERVICE_DIR="$HOME/.config/systemd/user"
    mkdir -p "$SERVICE_DIR"
    
    cat > "$SERVICE_DIR/nitrix-autostart.service" << EOF
[Unit]
Description=Nitrix AI Training Platform Auto-Start
After=network.target

[Service]
Type=simple
ExecStart=/bin/bash $CURRENT_DIR/NITRIX_AUTOSTART.sh
WorkingDirectory=$CURRENT_DIR
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF
    
    # Reload systemd and enable service
    systemctl --user daemon-reload
    systemctl --user enable nitrix-autostart.service
    
    print_success "Linux auto-start installed"
    print_status "Nitrix will start automatically on login"
    print_status "Control with: systemctl --user start/stop/status nitrix-autostart.service"
}

# Function to create Windows auto-start
install_windows() {
    print_status "Creating Windows auto-start script..."
    
    # Create batch file for Windows startup
    cat > "$CURRENT_DIR/nitrix-startup.bat" << 'EOF'
@echo off
cd /d "%~dp0"
call NITRIX_AUTOSTART.bat
EOF
    
    # Create VBS script to run silently
    cat > "$CURRENT_DIR/nitrix-startup-silent.vbs" << 'EOF'
Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd /c """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\nitrix-startup.bat""", 0, False
EOF
    
    print_success "Windows auto-start scripts created"
    print_status "To enable auto-start:"
    print_status "1. Press Win+R, type 'shell:startup', press Enter"
    print_status "2. Copy 'nitrix-startup-silent.vbs' to the startup folder"
    print_status "3. Or add to Task Scheduler for system-wide auto-start"
}

# Function to create desktop shortcuts
create_desktop_shortcuts() {
    print_status "Creating desktop shortcuts..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - Create app bundle
        APP_DIR="$HOME/Desktop/Nitrix.app"
        mkdir -p "$APP_DIR/Contents/MacOS"
        mkdir -p "$APP_DIR/Contents/Resources"
        
        cat > "$APP_DIR/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>nitrix</string>
    <key>CFBundleIdentifier</key>
    <string>com.nitrix.platform</string>
    <key>CFBundleName</key>
    <string>Nitrix</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
</dict>
</plist>
EOF
        
        cat > "$APP_DIR/Contents/MacOS/nitrix" << EOF
#!/bin/bash
cd "$CURRENT_DIR"
./NITRIX_AUTOSTART.sh
EOF
        
        chmod +x "$APP_DIR/Contents/MacOS/nitrix"
        
        print_success "macOS app created on Desktop"
        
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - Create desktop entry
        cat > "$HOME/Desktop/Nitrix.desktop" << EOF
[Desktop Entry]
Name=Nitrix AI Training Platform
Comment=Local AI Training Platform
Exec=bash -c "cd '$CURRENT_DIR' && ./NITRIX_AUTOSTART.sh"
Icon=$CURRENT_DIR/packages/frontend/public/favicon.ico
Terminal=true
Type=Application
Categories=Development;Science;Education;
EOF
        
        chmod +x "$HOME/Desktop/Nitrix.desktop"
        
        print_success "Linux desktop entry created"
    fi
}

# Function to uninstall auto-start
uninstall_autostart() {
    print_status "Uninstalling auto-start..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        PLIST_PATH="$HOME/Library/LaunchAgents/com.nitrix.autostart.plist"
        if [ -f "$PLIST_PATH" ]; then
            launchctl unload "$PLIST_PATH"
            rm "$PLIST_PATH"
            print_success "macOS auto-start uninstalled"
        fi
        
        # Remove desktop app
        if [ -d "$HOME/Desktop/Nitrix.app" ]; then
            rm -rf "$HOME/Desktop/Nitrix.app"
            print_success "Desktop app removed"
        fi
        
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        systemctl --user stop nitrix-autostart.service 2>/dev/null || true
        systemctl --user disable nitrix-autostart.service 2>/dev/null || true
        rm -f "$HOME/.config/systemd/user/nitrix-autostart.service"
        systemctl --user daemon-reload
        
        # Remove desktop entry
        rm -f "$HOME/Desktop/Nitrix.desktop"
        
        print_success "Linux auto-start uninstalled"
    fi
    
    print_success "Auto-start uninstalled successfully"
}

# Main function
main() {
    print_header "NITRIX SYSTEM AUTO-START INSTALLER"
    
    case "$1" in
        "install")
            if [[ "$OSTYPE" == "darwin"* ]]; then
                install_macos
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                install_linux
            else
                install_windows
            fi
            create_desktop_shortcuts
            ;;
        "uninstall")
            uninstall_autostart
            ;;
        *)
            echo "Usage: $0 {install|uninstall}"
            echo ""
            echo "Commands:"
            echo "  install   - Install system auto-start"
            echo "  uninstall - Remove system auto-start"
            echo ""
            echo "After installation, Nitrix will start automatically when you log in."
            echo "A desktop shortcut will also be created for manual launching."
            ;;
    esac
}

# Run main function
main "$@"