#!/bin/bash

# 🧪 NITRIX AUTO-START TEST SCRIPT
# Tests all auto-start functionality

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}🧪 TEST: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️ INFO: $1${NC}"
}

# Function to test URL
test_url() {
    local url=$1
    local name=$2
    
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        print_pass "$name is accessible"
        return 0
    else
        print_fail "$name is not accessible"
        return 1
    fi
}

# Function to test auto-start script
test_autostart() {
    print_test "Testing auto-start functionality..."
    
    # Kill any existing processes
    pkill -f "uvicorn.*simple_main" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    sleep 2
    
    # Test setup
    print_test "Testing setup script..."
    if [ -f "./auto-setup.sh" ]; then
        print_pass "Setup script exists"
    else
        print_fail "Setup script missing"
        return 1
    fi
    
    # Test auto-start script
    print_test "Testing auto-start script..."
    if [ -f "./NITRIX_AUTOSTART.sh" ]; then
        print_pass "Auto-start script exists"
    else
        print_fail "Auto-start script missing"
        return 1
    fi
    
    # Test Windows batch file
    print_test "Testing Windows batch file..."
    if [ -f "./NITRIX_AUTOSTART.bat" ]; then
        print_pass "Windows batch file exists"
    else
        print_fail "Windows batch file missing"
        return 1
    fi
    
    # Test desktop launcher
    print_test "Testing desktop launcher..."
    if [ -f "./LAUNCH_NITRIX.command" ]; then
        print_pass "Desktop launcher exists"
    else
        print_fail "Desktop launcher missing"
        return 1
    fi
    
    # Test system auto-start installer
    print_test "Testing system auto-start installer..."
    if [ -f "./install-autostart.sh" ]; then
        print_pass "System auto-start installer exists"
    else
        print_fail "System auto-start installer missing"
        return 1
    fi
    
    # Test desktop app
    print_test "Testing desktop app..."
    if [ -d "./desktop-app" ] && [ -f "./desktop-app/package.json" ]; then
        print_pass "Desktop app exists"
    else
        print_fail "Desktop app missing"
        return 1
    fi
    
    # Test package.json scripts
    print_test "Testing package.json scripts..."
    if npm run --silent | grep -q "start\|setup\|launch"; then
        print_pass "npm scripts configured"
    else
        print_fail "npm scripts missing"
        return 1
    fi
    
    print_pass "All auto-start components present"
}

# Function to test services
test_services() {
    print_test "Testing service startup..."
    
    # Start services in background
    ./NITRIX_AUTOSTART.sh &
    AUTOSTART_PID=$!
    
    # Wait for services to start
    print_info "Waiting for services to start..."
    sleep 10
    
    # Test backend
    if test_url "http://localhost:8000/health" "Backend"; then
        BACKEND_OK=1
    else
        BACKEND_OK=0
    fi
    
    # Test frontend (just check if port is open)
    if nc -z localhost 5173 2>/dev/null; then
        print_pass "Frontend port is open"
        FRONTEND_OK=1
    else
        print_fail "Frontend port is not open"
        FRONTEND_OK=0
    fi
    
    # Test API endpoints
    if test_url "http://localhost:8000/api/status" "API Status"; then
        API_OK=1
    else
        API_OK=0
    fi
    
    # Cleanup
    kill $AUTOSTART_PID 2>/dev/null || true
    pkill -f "uvicorn.*simple_main" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    sleep 2
    
    # Return results
    if [ $BACKEND_OK -eq 1 ] && [ $FRONTEND_OK -eq 1 ] && [ $API_OK -eq 1 ]; then
        print_pass "All services started successfully"
        return 0
    else
        print_fail "Some services failed to start"
        return 1
    fi
}

# Function to test dependencies
test_dependencies() {
    print_test "Testing system dependencies..."
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_pass "Node.js found: $NODE_VERSION"
    else
        print_fail "Node.js not found"
        return 1
    fi
    
    # Check Python
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_VERSION=$(python3 --version)
        print_pass "Python found: $PYTHON_VERSION"
    else
        print_fail "Python not found"
        return 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        print_pass "npm found: $NPM_VERSION"
    else
        print_fail "npm not found"
        return 1
    fi
    
    # Check virtual environment
    if [ -d "venv" ]; then
        print_pass "Python virtual environment exists"
    else
        print_fail "Python virtual environment missing"
        return 1
    fi
    
    # Check frontend dependencies
    if [ -d "packages/frontend/node_modules" ]; then
        print_pass "Frontend dependencies installed"
    else
        print_fail "Frontend dependencies missing"
        return 1
    fi
    
    print_pass "All dependencies present"
}

# Main test function
main() {
    echo -e "${BLUE}🎯 NITRIX AUTO-START COMPREHENSIVE TEST${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
    
    # Get current directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"
    
    # Test results
    DEPS_RESULT=0
    AUTOSTART_RESULT=0
    SERVICES_RESULT=0
    
    # Run tests
    if test_dependencies; then
        DEPS_RESULT=1
    fi
    
    echo ""
    
    if test_autostart; then
        AUTOSTART_RESULT=1
    fi
    
    echo ""
    
    if test_services; then
        SERVICES_RESULT=1
    fi
    
    echo ""
    echo -e "${BLUE}🏆 TEST RESULTS${NC}"
    echo -e "${BLUE}===============${NC}"
    
    if [ $DEPS_RESULT -eq 1 ]; then
        print_pass "Dependencies Test"
    else
        print_fail "Dependencies Test"
    fi
    
    if [ $AUTOSTART_RESULT -eq 1 ]; then
        print_pass "Auto-Start Components Test"
    else
        print_fail "Auto-Start Components Test"
    fi
    
    if [ $SERVICES_RESULT -eq 1 ]; then
        print_pass "Services Startup Test"
    else
        print_fail "Services Startup Test"
    fi
    
    echo ""
    
    # Overall result
    if [ $DEPS_RESULT -eq 1 ] && [ $AUTOSTART_RESULT -eq 1 ] && [ $SERVICES_RESULT -eq 1 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
        echo -e "${GREEN}✅ Nitrix auto-start is working perfectly!${NC}"
        echo ""
        echo -e "${YELLOW}🚀 Ready to use:${NC}"
        echo -e "${YELLOW}   • ./NITRIX_AUTOSTART.sh (macOS/Linux)${NC}"
        echo -e "${YELLOW}   • NITRIX_AUTOSTART.bat (Windows)${NC}"
        echo -e "${YELLOW}   • npm start (Any platform)${NC}"
        echo -e "${YELLOW}   • ./LAUNCH_NITRIX.command (macOS double-click)${NC}"
        echo -e "${YELLOW}   • Desktop app: npm run desktop-app${NC}"
        return 0
    else
        echo -e "${RED}❌ SOME TESTS FAILED!${NC}"
        echo -e "${RED}Please check the errors above and run auto-setup.sh${NC}"
        return 1
    fi
}

# Run main function
main "$@"