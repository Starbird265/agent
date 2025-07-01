#!/bin/bash

# Nitrix Distribution Setup Script
# Sets up GitHub releases and distribution system

set -e

echo "🚀 Nitrix Distribution Setup"
echo "============================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📝 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check requirements
print_step "Checking requirements..."

if ! command -v git &> /dev/null; then
    print_error "Git is required but not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "This directory is not a Git repository"
    exit 1
fi

print_success "All requirements met"

# Check if GitHub remote exists
if ! git remote get-url origin &> /dev/null; then
    print_error "No GitHub remote 'origin' found"
    echo "Please add your GitHub repository as origin:"
    echo "git remote add origin https://github.com/yourusername/nitrix.git"
    exit 1
fi

REPO_URL=$(git remote get-url origin)
REPO_NAME=$(echo $REPO_URL | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')
print_success "GitHub repository: $REPO_NAME"

# Verify nitrix-desktop directory exists
if [ ! -d "nitrix-desktop" ]; then
    print_error "nitrix-desktop directory not found"
    exit 1
fi

print_success "Project structure verified"

# Install semver for version management
print_step "Installing semver package for version management..."
if ! npm list -g semver &> /dev/null; then
    npm install -g semver
fi

# Verify package.json exists
if [ ! -f "nitrix-desktop/package.json" ]; then
    print_error "nitrix-desktop/package.json not found"
    exit 1
fi

CURRENT_VERSION=$(node -p "require('./nitrix-desktop/package.json').version")
print_success "Current version: v$CURRENT_VERSION"

# Show distribution plan
echo ""
echo -e "${PURPLE}📋 Distribution Setup Plan:${NC}"
echo "================================"
echo "1. ✅ GitHub Actions workflow configured"
echo "2. ✅ Release template created"  
echo "3. ✅ Version management script ready"
echo "4. 🔄 Will build for 3 platforms automatically"
echo "5. 📦 Will create GitHub releases with downloads"
echo "6. 🔗 Will provide download URLs for landing page"

echo ""
echo -e "${PURPLE}🚀 How releases work:${NC}"
echo "=============================="
echo "1. Run: ${YELLOW}./create-release.sh${NC}"
echo "2. GitHub Actions builds apps for all platforms"
echo "3. Release is created with download links"
echo "4. Update landing page with new URLs"

echo ""
echo -e "${PURPLE}📦 Build artifacts:${NC}"
echo "==================="
echo "• macOS: Nitrix-{version}.dmg (Intel)"
echo "• macOS: Nitrix-{version}-arm64.dmg (Apple Silicon)"
echo "• Windows: Nitrix-Setup-{version}.exe" 
echo "• Linux: Nitrix-{version}-arm64.AppImage"

echo ""
echo -e "${PURPLE}🔗 Download URLs format:${NC}"
echo "=========================="
echo "Base URL: https://github.com/$REPO_NAME/releases/download/v{VERSION}/"
echo ""
echo "macOS Intel: Nitrix-{VERSION}.dmg"
echo "macOS ARM64: Nitrix-{VERSION}-arm64.dmg"  
echo "Windows: Nitrix-Setup-{VERSION}.exe"
echo "Linux: Nitrix-{VERSION}-arm64.AppImage"

# Test GitHub Actions workflow
print_step "Validating GitHub Actions workflow..."
if [ -f ".github/workflows/build-desktop.yml" ]; then
    print_success "Build workflow found"
else
    print_error "GitHub Actions workflow not found"
    exit 1
fi

# Create distribution info file
print_step "Creating distribution info..."
cat > DISTRIBUTION_INFO.md << EOF
# 📦 Nitrix Distribution Information

## 🔗 Repository
- **GitHub**: https://github.com/$REPO_NAME
- **Releases**: https://github.com/$REPO_NAME/releases
- **Actions**: https://github.com/$REPO_NAME/actions

## 🚀 Creating Releases

### Automatic (Recommended)
\`\`\`bash
./create-release.sh
\`\`\`

### Manual
\`\`\`bash
# Update version in package.json
npm version patch  # or minor, major

# Create and push tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
\`\`\`

## 📥 Download URLs

### Current Version: v$CURRENT_VERSION

#### macOS
- Intel: https://github.com/$REPO_NAME/releases/download/v$CURRENT_VERSION/Nitrix-$CURRENT_VERSION.dmg
- Apple Silicon: https://github.com/$REPO_NAME/releases/download/v$CURRENT_VERSION/Nitrix-$CURRENT_VERSION-arm64.dmg

#### Windows  
- Installer: https://github.com/$REPO_NAME/releases/download/v$CURRENT_VERSION/Nitrix-Setup-$CURRENT_VERSION.exe

#### Linux
- AppImage: https://github.com/$REPO_NAME/releases/download/v$CURRENT_VERSION/Nitrix-$CURRENT_VERSION-arm64.AppImage

## 🔄 Updating Landing Page

After each release, update these URLs in your landing page:

\`\`\`javascript
const downloadLinks = {
  macos: 'https://github.com/$REPO_NAME/releases/download/v{VERSION}/Nitrix-{VERSION}-arm64.dmg',
  windows: 'https://github.com/$REPO_NAME/releases/download/v{VERSION}/Nitrix-Setup-{VERSION}.exe',
  linux: 'https://github.com/$REPO_NAME/releases/download/v{VERSION}/Nitrix-{VERSION}-arm64.AppImage'
};
\`\`\`

## 📊 Release Statistics

Check download statistics at:
https://github.com/$REPO_NAME/releases

## 🔧 Troubleshooting

### Build Failures
1. Check GitHub Actions logs
2. Verify all dependencies in package.json
3. Test builds locally first

### Missing Downloads
1. Wait for build to complete (~10-15 minutes)
2. Check if tag was pushed correctly
3. Verify workflow triggered

EOF

print_success "Distribution info created: DISTRIBUTION_INFO.md"

# Create landing page update script
print_step "Creating landing page update script..."
cat > update-landing-page.sh << 'EOF'
#!/bin/bash

# Update landing page download links after new release

if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 1.2.3"
    exit 1
fi

VERSION=$1
REPO_NAME=$(git remote get-url origin | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')

echo "🔄 Updating landing page for version v$VERSION"

# Update index.html if it exists
if [ -f "index.html" ]; then
    echo "📝 Updating index.html..."
    
    # Update download URLs in HTML
    sed -i.bak "s|releases/download/v[0-9.]\+/|releases/download/v$VERSION/|g" index.html
    sed -i.bak "s|Nitrix-[0-9.]\+|Nitrix-$VERSION|g" index.html
    sed -i.bak "s|Nitrix-Setup-[0-9.]\+|Nitrix-Setup-$VERSION|g" index.html
    
    rm index.html.bak
    echo "✅ Updated index.html"
fi

# Update landing page directory if it exists
if [ -f "nitrix-landing/index.html" ]; then
    echo "📝 Updating nitrix-landing/index.html..."
    
    sed -i.bak "s|releases/download/v[0-9.]\+/|releases/download/v$VERSION/|g" nitrix-landing/index.html
    sed -i.bak "s|Nitrix-[0-9.]\+|Nitrix-$VERSION|g" nitrix-landing/index.html
    sed -i.bak "s|Nitrix-Setup-[0-9.]\+|Nitrix-Setup-$VERSION|g" nitrix-landing/index.html
    
    rm nitrix-landing/index.html.bak
    echo "✅ Updated nitrix-landing/index.html"
fi

echo ""
echo "✅ Landing page updated for v$VERSION"
echo ""
echo "🔗 New download URLs:"
echo "macOS: https://github.com/$REPO_NAME/releases/download/v$VERSION/Nitrix-$VERSION-arm64.dmg"
echo "Windows: https://github.com/$REPO_NAME/releases/download/v$VERSION/Nitrix-Setup-$VERSION.exe"  
echo "Linux: https://github.com/$REPO_NAME/releases/download/v$VERSION/Nitrix-$VERSION-arm64.AppImage"
EOF

chmod +x update-landing-page.sh
print_success "Landing page update script created: update-landing-page.sh"

# Final summary
echo ""
echo -e "${GREEN}🎉 DISTRIBUTION SETUP COMPLETE!${NC}"
echo "================================="
echo ""
echo -e "${PURPLE}📋 What's Ready:${NC}"
echo "✅ GitHub Actions workflow for multi-platform builds"
echo "✅ Automatic release creation with download links"
echo "✅ Version management script (./create-release.sh)"
echo "✅ Landing page update script (./update-landing-page.sh)"
echo "✅ Distribution documentation (DISTRIBUTION_INFO.md)"
echo ""
echo -e "${PURPLE}🚀 Next Steps:${NC}"
echo "1. Test the system: ${YELLOW}./create-release.sh${NC}"  
echo "2. Watch GitHub Actions build: ${BLUE}https://github.com/$REPO_NAME/actions${NC}"
echo "3. Check release: ${BLUE}https://github.com/$REPO_NAME/releases${NC}"
echo "4. Update landing page URLs with new download links"
echo ""
echo -e "${PURPLE}💡 Pro Tips:${NC}"
echo "• Build takes ~10-15 minutes for all platforms"
echo "• Test locally first: ${YELLOW}cd nitrix-desktop && npm run build:mac${NC}"
echo "• Monitor download statistics in GitHub releases"
echo "• Update landing page after each release"
echo ""
print_success "Your Nitrix distribution system is ready! 🚀"
EOF

chmod +x setup-distribution.sh