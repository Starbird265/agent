#!/bin/bash

# Nitrix Desktop Release Creator
# This script creates GitHub releases with proper versioning

set -e

echo "🚀 Nitrix Desktop Release Creator"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "nitrix-desktop/package.json" ]; then
    echo "❌ Please run this script from the root of the Nitrix repository"
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./nitrix-desktop/package.json').version")
echo "📦 Current version: v${CURRENT_VERSION}"

# Ask for new version
echo ""
echo "🔢 Version options:"
echo "1. Patch (${CURRENT_VERSION} → $(node -p "require('semver').inc('${CURRENT_VERSION}', 'patch')"))"
echo "2. Minor (${CURRENT_VERSION} → $(node -p "require('semver').inc('${CURRENT_VERSION}', 'minor')"))"  
echo "3. Major (${CURRENT_VERSION} → $(node -p "require('semver').inc('${CURRENT_VERSION}', 'major')"))"
echo "4. Custom version"

read -p "Choose version type (1-4): " version_choice

case $version_choice in
    1)
        NEW_VERSION=$(node -p "require('semver').inc('${CURRENT_VERSION}', 'patch')")
        ;;
    2)
        NEW_VERSION=$(node -p "require('semver').inc('${CURRENT_VERSION}', 'minor')")
        ;;
    3)
        NEW_VERSION=$(node -p "require('semver').inc('${CURRENT_VERSION}', 'major')")
        ;;
    4)
        read -p "Enter custom version (e.g., 2.1.0): " NEW_VERSION
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo "📝 New version will be: v${NEW_VERSION}"
read -p "Continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Release cancelled"
    exit 1
fi

# Update package.json version
echo "📝 Updating package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./nitrix-desktop/package.json', 'utf8'));
pkg.version = '${NEW_VERSION}';
fs.writeFileSync('./nitrix-desktop/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing version bump..."
    git add nitrix-desktop/package.json
    git commit -m "chore: bump version to v${NEW_VERSION}"
else
    echo "✅ Git is clean"
fi

# Create and push tag
echo "🏷️  Creating tag v${NEW_VERSION}..."
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}

🚀 Nitrix Desktop v${NEW_VERSION}

Train Smarter AI—No Cloud, No Code, Just Power

### 🎯 Core Features:
- 🧠 AI Model Manager: Upload/download pre-trained TensorFlow.js models  
- 🤗 Hugging Face Integration: Browse and download 100,000+ AI models
- 🚀 Local AI Training: Train custom models with your own data
- 🔒 Complete Privacy: Everything runs locally on your device
- ⚡ No Code Required: Point-and-click interface for AI training

### 🤖 AI Capabilities:
- Text Classification (sentiment, spam detection)
- Regression Models (price prediction, ratings)
- Model Import/Export capabilities
- Real-time Training with TensorFlow.js
- Popular Models: MobileNet, BERT, GPT-2, CLIP, and more

### 📦 Downloads:
- macOS: .dmg file (Apple Silicon & Intel)
- Windows: .exe installer (64-bit) 
- Linux: .AppImage portable app

### 🔐 Access:
This is a private beta. You need an invite code to download."

echo "📤 Pushing tag to GitHub..."
git push origin "v${NEW_VERSION}"

echo ""
echo "✅ Release v${NEW_VERSION} created successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. GitHub Actions will automatically build the desktop apps"
echo "2. A release will be created with download links"
echo "3. Update your landing page download URLs"
echo ""
echo "🔗 Check the build progress at:"
echo "   https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')/actions"
echo ""
echo "📝 After build completes, update landing page URLs to:"
echo "   macOS: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')/releases/download/v${NEW_VERSION}/Nitrix-${NEW_VERSION}-arm64.dmg"
echo "   Windows: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')/releases/download/v${NEW_VERSION}/Nitrix-Setup-${NEW_VERSION}.exe"
echo "   Linux: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')/releases/download/v${NEW_VERSION}/Nitrix-${NEW_VERSION}-arm64.AppImage"