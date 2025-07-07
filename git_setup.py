#!/usr/bin/env python3
"""
AI TrainEasy MVP - Git Setup and Push Script
Automated Git initialization and repository setup
"""
import os
import subprocess
import sys
from pathlib import Path

class GitSetup:
    def __init__(self):
        self.repo_path = Path.cwd()
        
    def print_header(self):
        print("🚀 AI TrainEasy MVP - Git Setup")
        print("=" * 50)
        print("Preparing your repository for GitHub...")
        print()
        
    def check_git_installed(self):
        """Check if Git is installed"""
        try:
            result = subprocess.run(["git", "--version"], capture_output=True, check=True)
            print("✅ Git is installed:", result.stdout.decode().strip())
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Git is not installed or not in PATH")
            print("💡 Please install Git from: https://git-scm.com/downloads")
            return False
    
    def initialize_repo(self):
        """Initialize Git repository"""
        try:
            if (self.repo_path / '.git').exists():
                print("✅ Git repository already initialized")
                return True
            
            subprocess.run(["git", "init"], check=True, cwd=self.repo_path)
            print("✅ Git repository initialized")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to initialize Git repository: {e}")
            return False
    
    def create_gitignore(self):
        """Ensure .gitignore exists, or create a sensible default for Python/Node projects"""
        gitignore_path = self.repo_path / '.gitignore'
        if gitignore_path.exists():
            print("✅ .gitignore already exists")
            return True

        print("⚠️  .gitignore not found. Creating a recommended .gitignore for Python, Node, and common tools...")
        default_gitignore = '''# Python\n# Byte-compiled / optimized / DLL files\n__pycache__/\n*.py[cod]\n*.pyo\n*.pyd\n*.so\n.Python\n\n# Virtual environments\nenv/\nvenv/\nENV/\n.env/\n.venv/\nenv.bak/\nvenv.bak/\n\n# Python environment variables and settings\n.env\n.env.*\n*.env\n*.env.*\n\n# Python test and coverage\n.mypy_cache/\n.pytest_cache/\n.coverage\ncoverage.xml\n*.cover\n.hypothesis/\n.tox/\n.nox/\n\n# Jupyter Notebook\n.ipynb_checkpoints/\n*.ipynb\n\n# PyInstaller\nbuild/\ndist/\n*.spec\n\n# Node\nnode_modules/\ndist/\nbuild/\n.nyc_output/\ncoverage/\n*.log\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\npnpm-debug.log*\n.parcel-cache/\n.next/\n.vercel/\n.turbo/\n\n# Environment files\n.env.local\n.env.development.local\n.env.test.local\n.env.production.local\n\n# macOS\n.DS_Store\n.AppleDouble\n.LSOverride\n\n# Windows\nThumbs.db\nehthumbs.db\nDesktop.ini\n$RECYCLE.BIN/\n\n# Linux\n*~\n.nfs*\n\n# VSCode\n.vscode/\n.history/\n\n# JetBrains IDEs\n.idea/\n*.iml\n\n# Sublime\n*.sublime-workspace\n*.sublime-project\n\n# Vim\n*.swp\n*.swo\n*.swn\n\n# Miscellaneous\n*.bak\n*.tmp\n*.orig\n*.rej\n*.log\n*.pid\n*.seed\n*.pid.lock\n\n# Lock files\npackage-lock.json\nyarn.lock\npnpm-lock.yaml\n\n# Others\n*.orig\n*.rej\n\n# Project-specific\n# Add any additional project-specific ignores below\n'''
        try:
            with open(gitignore_path, 'w') as f:
                f.write(default_gitignore)
            print("✅ .gitignore created with recommended ignores")
            return True
        except Exception as e:
            print(f"❌ Failed to create .gitignore: {e}")
            return False
    
    def stage_files(self):
        """Stage files for commit"""
        try:
            subprocess.run(["git", "add", "."], check=True, cwd=self.repo_path)
            print("✅ Files staged for commit")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to stage files: {e}")
            return False
    
    def create_initial_commit(self):
        """Create initial commit"""
        try:
            # Check if there are any commits
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"], 
                capture_output=True, 
                cwd=self.repo_path
            )
            
            if result.returncode == 0:
                print("✅ Repository already has commits")
                return True
            
            # Set up git config if not already set
            self.setup_git_config()
            
            subprocess.run([
                "git", "commit", "-m", 
                "🎉 Initial commit: AI TrainEasy MVP Beta\n\n" +
                "- Modern AutoML platform with React + FastAPI\n" +
                "- Secure file upload and validation\n" +
                "- Real-time training monitoring\n" +
                "- System resource tracking\n" +
                "- Comprehensive testing suite\n" +
                "- Production-ready deployment guides"
            ], check=True, cwd=self.repo_path)
            
            print("✅ Initial commit created")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to create commit: {e}")
            return False
    
    def setup_git_config(self):
        """Setup basic git configuration if needed"""
        try:
            # Check if user.name is set
            result = subprocess.run(
                ["git", "config", "user.name"], 
                capture_output=True, 
                cwd=self.repo_path
            )
            
            if result.returncode != 0:
                print("⚙️  Setting up Git configuration...")
                name = input("Enter your name for Git commits: ").strip()
                email = input("Enter your email for Git commits: ").strip()
                
                subprocess.run(["git", "config", "user.name", name], check=True, cwd=self.repo_path)
                subprocess.run(["git", "config", "user.email", email], check=True, cwd=self.repo_path)
                print("✅ Git configuration set")
            else:
                print("✅ Git configuration already set")
                
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Git configuration warning: {e}")
    
    def check_status(self):
        """Check repository status"""
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"], 
                capture_output=True, 
                check=True, 
                cwd=self.repo_path
            )
            
            if result.stdout:
                print("📋 Uncommitted changes detected:")
                print(result.stdout.decode())
                return False
            else:
                print("✅ Working directory clean")
                return True
                
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to check status: {e}")
            return False
    
    def show_push_instructions(self):
        """Show instructions for pushing to GitHub"""
        print("\n🎯 Next Steps - Push to GitHub:")
        print("=" * 50)
        print()
        print("1. Create a new repository on GitHub:")
        print("   • Go to https://github.com/new")
        print("   • Repository name: ai-traineasy-mvp")
        print("   • Description: 'Automated Machine Learning Platform - Beta'")
        print("   • Make it Public (recommended for open source)")
        print("   • Don't initialize with README (we already have one)")
        print()
        print("2. Copy your repository URL and run these commands:")
        print()
        print("   # Add your GitHub repository as origin")
        print("   git remote add origin https://github.com/YOUR_USERNAME/ai-traineasy-mvp.git")
        print()
        print("   # Push to GitHub")
        print("   git branch -M main")
        print("   git push -u origin main")
        print()
        print("3. Alternative - if you have GitHub CLI installed:")
        print("   gh repo create ai-traineasy-mvp --public --push")
        print()
        print("4. After pushing, your repository will be available at:")
        print("   https://github.com/YOUR_USERNAME/ai-traineasy-mvp")
        print()
        print("🌟 Repository Features:")
        print("   ✅ Modern AutoML platform")
        print("   ✅ Secure and production-ready")
        print("   ✅ Comprehensive documentation")
        print("   ✅ One-command setup")
        print("   ✅ Automated testing")
        print("   ✅ Deployment guides")
        print()
        print("📢 Share your project:")
        print("   • Add topics: machine-learning, automl, python, react, fastapi")
        print("   • Enable GitHub Pages for documentation")
        print("   • Add a star if you like the project! ⭐")
    
    def create_github_templates(self):
        """Create GitHub issue and PR templates"""
        github_dir = self.repo_path / '.github'
        github_dir.mkdir(exist_ok=True)
        
        # Issue template
        issue_template = """---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS, Windows, Linux]
 - Python version: [e.g. 3.9]
 - Node.js version: [e.g. 18.0]
 - Browser: [e.g. Chrome, Firefox]

**Additional context**
Add any other context about the problem here.
"""
        
        templates_dir = github_dir / 'ISSUE_TEMPLATE'
        templates_dir.mkdir(exist_ok=True)
        
        with open(templates_dir / 'bug_report.md', 'w') as f:
            f.write(issue_template)
        
        # Pull request template
        pr_template = """## Description
Please include a summary of the change and which issue is fixed. Please also include relevant motivation and context.

Fixes # (issue)

## Type of change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

## How Has This Been Tested?
- [ ] I have run the test suite (`python test_beta.py`)
- [ ] I have tested the changes manually
- [ ] I have added new tests to cover my changes

## Checklist:
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] Any dependent changes have been merged and published
"""
        
        with open(github_dir / 'pull_request_template.md', 'w') as f:
            f.write(pr_template)
        
        print("✅ GitHub templates created")
    
    def run_setup(self):
        """Run the complete Git setup process"""
        self.print_header()
        
        if not self.check_git_installed():
            return False
        
        steps = [
            ("Initialize Repository", self.initialize_repo),
            ("Check .gitignore", self.create_gitignore),
            ("Create GitHub Templates", self.create_github_templates),
            ("Stage Files", self.stage_files),
            ("Create Initial Commit", self.create_initial_commit),
            ("Check Status", self.check_status),
        ]
        
        for step_name, step_function in steps:
            print(f"\n🔄 {step_name}...")
            if not step_function():
                print(f"\n❌ Setup failed at: {step_name}")
                return False
        
        print("\n🎉 Git setup completed successfully!")
        self.show_push_instructions()
        return True

def main():
    setup = GitSetup()
    success = setup.run_setup()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()