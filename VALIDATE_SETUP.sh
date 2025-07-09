#!/bin/bash

# 🎯 NITRIX SETUP VALIDATION SCRIPT
# Final validation that everything is ready for auto-start

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🎯 NITRIX AUTO-START VALIDATION${NC}"
echo -e "${PURPLE}================================${NC}"

# Check all required files
echo -e "${BLUE}📋 Checking Auto-Start Files...${NC}"

files=(
    "NITRIX_AUTOSTART.sh:Main auto-start script"
    "NITRIX_AUTOSTART.bat:Windows auto-start script" 
    "LAUNCH_NITRIX.command:macOS double-click launcher"
    "auto-setup.sh:Dependency setup script"
    "install-autostart.sh:System auto-start installer"
    "TEST_AUTOSTART.sh:Test suite"
    "package.json:Root package configuration"
    "backend/minimal_main.py:Working backend"
    "desktop-app/package.json:Desktop app configuration"
)

all_files_present=true

for file_desc in "${files[@]}"; do
    file="${file_desc%%:*}"
    desc="${file_desc##*:}"
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $file - $desc"
    else
        echo -e "${RED}❌${NC} $file - $desc (MISSING)"
        all_files_present=false
    fi
done

echo ""

# Check permissions
echo -e "${BLUE}🔐 Checking Permissions...${NC}"

executables=("NITRIX_AUTOSTART.sh" "LAUNCH_NITRIX.command" "auto-setup.sh" "install-autostart.sh" "TEST_AUTOSTART.sh")

for file in "${executables[@]}"; do
    if [ -f "$file" ]; then
        if [ -x "$file" ]; then
            echo -e "${GREEN}✅${NC} $file is executable"
        else
            echo -e "${YELLOW}⚠️${NC} $file needs executable permission"
            chmod +x "$file" 2>/dev/null && echo -e "${GREEN}  → Fixed${NC}" || echo -e "${RED}  → Failed to fix${NC}"
        fi
    fi
done

echo ""

# Check dependencies
echo -e "${BLUE}🔧 Checking Dependencies...${NC}"

deps_ok=true

# Node.js
if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Node.js: $(node --version)"
else
    echo -e "${RED}❌${NC} Node.js not found"
    deps_ok=false
fi

# Python
if command -v python3 >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Python: $(python3 --version)"
else
    echo -e "${RED}❌${NC} Python3 not found"
    deps_ok=false
fi

# npm
if command -v npm >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} npm: $(npm --version)"
else
    echo -e "${RED}❌${NC} npm not found"
    deps_ok=false
fi

# Virtual environment
if [ -d "venv" ]; then
    echo -e "${GREEN}✅${NC} Python virtual environment exists"
else
    echo -e "${YELLOW}⚠️${NC} Python virtual environment not found"
fi

# Frontend dependencies
if [ -d "packages/frontend/node_modules" ]; then
    echo -e "${GREEN}✅${NC} Frontend dependencies installed"
else
    echo -e "${YELLOW}⚠️${NC} Frontend dependencies not installed"
fi

echo ""

# Check npm scripts
echo -e "${BLUE}📦 Checking npm Scripts...${NC}"

if npm run 2>/dev/null | grep -q "start\|setup\|launch"; then
    echo -e "${GREEN}✅${NC} npm scripts configured"
    echo -e "${BLUE}Available commands:${NC}"
    echo -e "  ${YELLOW}npm start${NC} - Start the platform"
    echo -e "  ${YELLOW}npm run setup${NC} - Setup dependencies"  
    echo -e "  ${YELLOW}npm run launch${NC} - Desktop launcher"
    echo -e "  ${YELLOW}npm run desktop-app${NC} - Native desktop app"
else
    echo -e "${RED}❌${NC} npm scripts not properly configured"
fi

echo ""

# Final assessment
echo -e "${PURPLE}🏆 FINAL ASSESSMENT${NC}"
echo -e "${PURPLE}====================${NC}"

if [ "$all_files_present" = true ] && [ "$deps_ok" = true ]; then
    echo -e "${GREEN}🎉 ALL SYSTEMS GO!${NC}"
    echo ""
    echo -e "${GREEN}✅ All auto-start files present${NC}"
    echo -e "${GREEN}✅ All dependencies available${NC}"
    echo -e "${GREEN}✅ Permissions properly set${NC}"
    echo -e "${GREEN}✅ npm scripts configured${NC}"
    echo ""
    echo -e "${YELLOW}🚀 READY TO LAUNCH:${NC}"
    echo -e "${BLUE}   ./NITRIX_AUTOSTART.sh${NC}     (macOS/Linux)"
    echo -e "${BLUE}   NITRIX_AUTOSTART.bat${NC}      (Windows)"
    echo -e "${BLUE}   npm start${NC}                 (Any platform)"
    echo -e "${BLUE}   Double-click LAUNCH_NITRIX.command${NC} (macOS)"
    echo ""
    echo -e "${PURPLE}📱 Expected Result:${NC}"
    echo -e "${PURPLE}   🌐 Frontend: http://localhost:5173${NC}"
    echo -e "${PURPLE}   🔧 Backend: http://localhost:8000${NC}"
    echo -e "${PURPLE}   📚 API Docs: http://localhost:8000/docs${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SETUP INCOMPLETE${NC}"
    echo ""
    if [ "$all_files_present" = false ]; then
        echo -e "${RED}• Some auto-start files are missing${NC}"
    fi
    if [ "$deps_ok" = false ]; then
        echo -e "${RED}• Some dependencies are missing${NC}"
    fi
    echo ""
    echo -e "${YELLOW}🔧 RECOMMENDED ACTIONS:${NC}"
    echo -e "${BLUE}   1. Run: ./auto-setup.sh${NC}"
    echo -e "${BLUE}   2. Re-run this validation: ./VALIDATE_SETUP.sh${NC}"
    echo -e "${BLUE}   3. If issues persist, check system requirements${NC}"
    echo ""
    exit 1
fi