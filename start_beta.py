#!/usr/bin/env python3
"""
AI TrainEasy MVP - Beta Startup Script
Easy one-command startup for beta testers
"""
import os
import sys
import subprocess
import time
import signal
import platform
from pathlib import Path
import threading
import webbrowser

class BetaStarter:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.running = False
        
    def print_header(self):
        print("🤖 AI TrainEasy MVP - Beta Launcher")
        print("=" * 50)
        print("Starting your AutoML environment...")
        print()
        
    def check_dependencies(self):
        """Check if dependencies are installed"""
        print("📋 Checking dependencies...")
        
        # Check Python packages
        try:
            import fastapi, uvicorn, pandas, sklearn
            print("✅ Python dependencies found")
        except ImportError as e:
            print(f"❌ Missing Python dependency: {e}")
            print("💡 Run: pip install -r packages/backend/requirements.txt")
            return False
        
        # Check Node.js
        try:
            result = subprocess.run(["npm", "--version"], capture_output=True, check=True)
            print("✅ Node.js found")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Node.js not found")
            print("💡 Install Node.js from: https://nodejs.org/")
            return False
        
        # Check frontend dependencies
        frontend_path = Path("packages/frontend/node_modules")
        if not frontend_path.exists():
            print("⚠️  Frontend dependencies not installed")
            print("💡 Run: cd packages/frontend && npm install")
            return False
        
        print("✅ All dependencies found")
        return True
    
    def setup_environment(self):
        """Setup environment if needed"""
        print("\n⚙️  Setting up environment...")
        
        # Create projects directory
        projects_dir = Path("packages/backend/projects")
        projects_dir.mkdir(parents=True, exist_ok=True)
        
        # Create .env if it doesn't exist
        env_file = Path("packages/backend/.env")
        if not env_file.exists():
            env_content = """# AI TrainEasy MVP Configuration
SECRET_KEY=ai-traineasy-secret-key-for-development
ENVIRONMENT=development
HUGGINGFACE_HUB_TOKEN=
MAX_FILE_SIZE_MB=100
"""
            with open(env_file, 'w') as f:
                f.write(env_content)
            print("✅ Environment file created")
        else:
            print("✅ Environment file exists")
    
    def start_backend(self):
        """Start the backend server"""
        print("\n🚀 Starting backend server...")
        
        backend_path = Path("packages/backend")
        
        try:
            # Use the simplified main file
            cmd = [sys.executable, "main_simple.py"]
            
            self.backend_process = subprocess.Popen(
                cmd,
                cwd=backend_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Wait a bit and check if it started
            time.sleep(2)
            if self.backend_process.poll() is None:
                print("✅ Backend server started on http://localhost:8000")
                return True
            else:
                print("❌ Backend failed to start")
                return False
                
        except Exception as e:
            print(f"❌ Backend startup error: {e}")
            return False
    
    def start_frontend(self):
        """Start the frontend development server"""
        print("\n🎨 Starting frontend server...")
        
        frontend_path = Path("packages/frontend")
        
        try:
            cmd = ["npm", "run", "dev"]
            
            self.frontend_process = subprocess.Popen(
                cmd,
                cwd=frontend_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Wait a bit and check if it started
            time.sleep(3)
            if self.frontend_process.poll() is None:
                print("✅ Frontend server started on http://localhost:5173")
                return True
            else:
                print("❌ Frontend failed to start")
                return False
                
        except Exception as e:
            print(f"❌ Frontend startup error: {e}")
            return False
    
    def monitor_processes(self):
        """Monitor backend and frontend processes"""
        def log_output(process, name):
            for line in iter(process.stdout.readline, ''):
                if line:
                    # Only show important lines to avoid spam
                    if any(keyword in line.lower() for keyword in ['error', 'warning', 'started', 'listening']):
                        print(f"[{name}] {line.strip()}")
        
        if self.backend_process:
            threading.Thread(target=log_output, args=(self.backend_process, "Backend"), daemon=True).start()
        
        if self.frontend_process:
            threading.Thread(target=log_output, args=(self.frontend_process, "Frontend"), daemon=True).start()
    
    def open_browser(self):
        """Open browser to the application"""
        print("\n🌐 Opening browser...")
        time.sleep(2)  # Give servers time to fully start
        try:
            webbrowser.open("http://localhost:5173")
            print("✅ Browser opened to http://localhost:5173")
        except Exception as e:
            print(f"⚠️  Could not open browser: {e}")
            print("📱 Manually open: http://localhost:5173")
    
    def wait_for_interrupt(self):
        """Wait for user to stop the servers"""
        print("\n🎯 AI TrainEasy Beta is running!")
        print("=" * 50)
        print("🌟 Frontend: http://localhost:5173")
        print("🔧 Backend API: http://localhost:8000")
        print("📖 API Docs: http://localhost:8000/docs")
        print()
        print("🔐 INVITATION SYSTEM ACTIVE")
        print("=" * 30)
        print("✨ Demo Invitation Codes:")
        print("   • BETA-2024-EARLY")
        print("   • AUTOML-PREVIEW") 
        print("   • AI-TRAIN-DEMO")
        print("   • ML-BETA-ACCESS")
        print("   • TRAINEASY-VIP")
        print()
        print("📋 Quick Start:")
        print("1. Open http://localhost:5173")
        print("2. Enter any invitation code above")
        print("3. Create a new project")
        print("4. Upload a CSV/JSON dataset")
        print("5. Start training your model!")
        print()
        print("🚀 Ready for Render deployment!")
        print("🛑 Press Ctrl+C to stop...")
        
        try:
            while self.running:
                time.sleep(1)
                
                # Check if processes are still running
                if self.backend_process and self.backend_process.poll() is not None:
                    print("❌ Backend process died unexpectedly")
                    self.cleanup()
                    break
                    
                if self.frontend_process and self.frontend_process.poll() is not None:
                    print("❌ Frontend process died unexpectedly")
                    self.cleanup()
                    break
                    
        except KeyboardInterrupt:
            print("\n🛑 Stopping servers...")
            self.cleanup()
    
    def cleanup(self):
        """Stop all processes"""
        self.running = False
        
        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=5)
                print("✅ Backend stopped")
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
                print("🔥 Backend force-stopped")
            except Exception as e:
                print(f"⚠️  Backend cleanup error: {e}")
        
        if self.frontend_process:
            try:
                if platform.system() == "Windows":
                    self.frontend_process.terminate()
                else:
                    # Send SIGINT to npm process
                    self.frontend_process.send_signal(signal.SIGINT)
                self.frontend_process.wait(timeout=10)
                print("✅ Frontend stopped")
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
                print("🔥 Frontend force-stopped")
            except Exception as e:
                print(f"⚠️  Frontend cleanup error: {e}")
    
    def run(self):
        """Main startup sequence"""
        self.print_header()
        
        # Check dependencies
        if not self.check_dependencies():
            print("\n❌ Dependency check failed. Please install missing dependencies.")
            return False
        
        # Setup environment
        self.setup_environment()
        
        # Start backend
        if not self.start_backend():
            print("\n❌ Failed to start backend. Check the logs above.")
            return False
        
        # Start frontend
        if not self.start_frontend():
            print("\n❌ Failed to start frontend. Check the logs above.")
            self.cleanup()
            return False
        
        # Setup monitoring
        self.monitor_processes()
        self.running = True
        
        # Open browser
        threading.Thread(target=self.open_browser, daemon=True).start()
        
        # Wait for user interrupt
        self.wait_for_interrupt()
        
        print("\n👋 AI TrainEasy stopped. Thanks for testing!")
        return True

def main():
    import argparse
    parser = argparse.ArgumentParser(description="AI TrainEasy Beta Launcher")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser automatically")
    parser.add_argument("--check-only", action="store_true", help="Only check dependencies")
    
    args = parser.parse_args()
    
    starter = BetaStarter()
    
    if args.check_only:
        starter.print_header()
        success = starter.check_dependencies()
        if success:
            print("\n✅ Ready for beta testing!")
        else:
            print("\n❌ Not ready. Please install missing dependencies.")
        return
    
    # Override browser opening if requested
    if args.no_browser:
        starter.open_browser = lambda: print("🌐 Browser opening disabled")
    
    success = starter.run()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()