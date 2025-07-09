#!/bin/bash

# macOS Double-Click Launcher
# This file can be double-clicked on macOS to start Nitrix

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Open Terminal and run the auto-start script
osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR' && ./NITRIX_AUTOSTART.sh\""

# Also try to open the app in browser after a delay
sleep 10
open "http://localhost:5173"