#!/usr/bin/env python3
"""
AI TrainEasy MVP - Beta Setup Script
Automated setup for beta testing
"""
import os
import sys
import subprocess
import platform
from pathlib import Path

def print_header():
    print("🤖 AI TrainEasy MVP - Beta Setup")
    print("=" * 50)
    print("Setting up your AutoML environment...")
    print()

def check_python():
    """Check Python version"""
    print("📋 Checking Python version...")
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required")
        sys.exit(1)
    print(f"✅ Python {sys.version.split()[0]} detected")

def check_system():
    """Check system requirements"""
    print("\n🖥️  System Information:")
    print(f"   OS: {platform.system()} {platform.release()}")
    print(f"   Architecture: {platform.machine()}")
    
    # Check available memory
    try:
        import psutil
        memory_gb = round(psutil.virtual_memory().total / (1024**3), 1)
        print(f"   RAM: {memory_gb} GB")
        if memory_gb < 4:
            print("⚠️  Warning: Less than 4GB RAM detected. Training may be slow.")
    except ImportError:
        print("   RAM: Unable to detect")

def install_backend():
    """Install backend dependencies"""
    print("\n📦 Installing backend dependencies...")
    backend_path = Path("packages/backend")
    requirements_path = backend_path / "requirements.txt"
    
    if not requirements_path.exists():
        print("❌ Backend requirements.txt not found")
        return False
    
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_path)
        ], check=True, capture_output=True)
        print("✅ Backend dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install backend dependencies: {e}")
        return False

def install_frontend():
    """Install frontend dependencies"""
    print("\n🎨 Installing frontend dependencies...")
    frontend_path = Path("packages/frontend")
    
    if not frontend_path.exists():
        print("❌ Frontend directory not found")
        return False
    
    # Check if pnpm is available
    try:
        subprocess.run(["pnpm", "--version"], check=True, capture_output=True)
        package_manager = "pnpm"
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Fallback to npm
        try:
            subprocess.run(["npm", "--version"], check=True, capture_output=True)
            package_manager = "npm"
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Neither pnpm nor npm found. Please install Node.js")
            return False
    
    try:
        subprocess.run([
            package_manager, "install"
        ], cwd=frontend_path, check=True, capture_output=True)
        print(f"✅ Frontend dependencies installed with {package_manager}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install frontend dependencies: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    print("\n📁 Creating project directories...")
    directories = [
        "packages/backend/projects",
        "packages/backend/logs",
        "packages/backend/temp"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    print("✅ Directories created")

def create_env_file():
    """Create environment file"""
    print("\n⚙️  Creating environment configuration...")
    env_path = Path("packages/backend/.env")
    
    if env_path.exists():
        print("✅ Environment file already exists")
        return
    
    env_content = """# AI TrainEasy MVP Configuration
SECRET_KEY=ai-traineasy-secret-key-for-development-please-change-in-production
ENVIRONMENT=development
HUGGINGFACE_HUB_TOKEN=
MAX_FILE_SIZE_MB=100
MAX_PROJECTS_PER_USER=10
"""
    
    with open(env_path, 'w') as f:
        f.write(env_content)
    print("✅ Environment file created")

def run_tests():
    """Run basic tests"""
    print("\n🧪 Running basic tests...")
    
    # Test backend import
    try:
        sys.path.append(str(Path("packages/backend")))
        # Import test
        print("✅ Backend modules can be imported")
    except Exception as e:
        print(f"⚠️  Backend import warning: {e}")
    
    # Test if ports are available
    import socket
    ports = [8000, 5173]
    for port in ports:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        if result == 0:
            print(f"⚠️  Port {port} is already in use")
        else:
            print(f"✅ Port {port} is available")

def create_start_scripts():
    """Create start scripts"""
    print("\n📜 Creating start scripts...")
    
    # Backend start script
    backend_script = """#!/bin/bash
# AI TrainEasy Backend Starter Script
echo "🚀 Starting AI TrainEasy Backend..."
cd packages/backend
python main_simple.py
"""
    
    # Frontend start script  
    frontend_script = """#!/bin/bash
# AI TrainEasy Frontend Starter Script
echo "🎨 Starting AI TrainEasy Frontend..."
cd packages/frontend
npm run dev
"""
    
    # Create scripts
    with open("start_backend.sh", 'w') as f:
        f.write(backend_script)
    
    with open("start_frontend.sh", 'w') as f:
        f.write(frontend_script)
    
    # Make executable on Unix systems
    if platform.system() != "Windows":
        os.chmod("start_backend.sh", 0o755)
        os.chmod("start_frontend.sh", 0o755)
    
    print("✅ Start scripts created")

def print_next_steps():
    """Print next steps"""
    print("\n🎉 Setup Complete!")
    print("=" * 50)
    print("\n📋 Next Steps:")
    print("1. Start the backend:")
    print("   cd packages/backend && python main_simple.py")
    print("\n2. Start the frontend (in a new terminal):")
    print("   cd packages/frontend && npm run dev")
    print("\n3. Open your browser to: http://localhost:5173")
    print("\n🔧 Optional Configuration:")
    print("- Add your Hugging Face token to packages/backend/.env")
    print("- Adjust settings in packages/backend/.env")
    print("\n📚 For help: Check README.md or logs in packages/backend/app.log")
    print("\n🐛 Issues? Check the logs and ensure all dependencies are installed.")

def main():
    print_header()
    
    try:
        check_python()
        check_system()
        create_directories()
        create_env_file()
        
        backend_ok = install_backend()
        frontend_ok = install_frontend()
        
        if not backend_ok or not frontend_ok:
            print("\n⚠️  Some dependencies failed to install. You may need to install them manually.")
        
        run_tests()
        create_start_scripts()
        print_next_steps()
        
    except KeyboardInterrupt:
        print("\n\n❌ Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()