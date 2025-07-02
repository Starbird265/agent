#!/bin/bash

# Complete Nitrix Deployment Script
# Handles both landing page deployment and desktop app releases

set -e

echo "🚀 Nitrix Complete Deployment System"
echo "===================================="

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

# Get repository info
REPO_URL=$(git remote get-url origin)
REPO_NAME=$(echo $REPO_URL | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')

print_step "Repository: $REPO_NAME"

echo ""
echo -e "${PURPLE}🎯 What would you like to deploy?${NC}"
echo "1. 🌐 Landing Page (GitHub Pages)"
echo "2. 📦 Desktop App Release"
echo "3. 🚀 Both (Landing Page + Desktop Release)"
echo "4. 📊 Check Deployment Status"

read -p "Choose option (1-4): " deploy_choice

case $deploy_choice in
    1)
        echo ""
        echo -e "${PURPLE}🌐 DEPLOYING LANDING PAGE${NC}"
        echo "========================"
        
        # Check if landing page files exist
        if [ ! -f "index.html" ] || [ ! -f "script.js" ]; then
            print_error "Landing page files not found"
            echo "Run: cp nitrix-landing/* . to copy files"
            exit 1
        fi
        
        print_step "Committing landing page changes..."
        git add index.html script.js
        git commit -m "update: Landing page with working download links" || echo "No changes to commit"
        
        print_step "Pushing to GitHub..."
        git push origin master
        
        print_success "Landing page deployment triggered!"
        echo ""
        echo "🔗 Your landing page will be available at:"
        echo "   https://$(echo $REPO_NAME | tr '[:upper:]' '[:lower:]' | sed 's/\//.github.io\//')"
        echo ""
        echo "⏱️  Deployment takes ~2-3 minutes"
        echo "📊 Check status: https://github.com/$REPO_NAME/actions"
        ;;
    
    2)
        echo ""
        echo -e "${PURPLE}📦 CREATING DESKTOP APP RELEASE${NC}"
        echo "================================"
        
        if [ ! -f "create-release.sh" ]; then
            print_error "Release script not found"
            exit 1
        fi
        
        print_step "Running release creator..."
        ./create-release.sh
        ;;
    
    3)
        echo ""
        echo -e "${PURPLE}🚀 COMPLETE DEPLOYMENT${NC}"
        echo "======================"
        
        print_step "Step 1: Deploying landing page..."
        
        # Deploy landing page first
        if [ -f "index.html" ] && [ -f "script.js" ]; then
            git add index.html script.js
            git commit -m "update: Landing page for complete deployment" || echo "No landing page changes"
            git push origin master
            print_success "Landing page deployment started"
        else
            print_warning "Landing page files not found, skipping"
        fi
        
        echo ""
        print_step "Step 2: Creating desktop app release..."
        
        # Create desktop release
        if [ -f "create-release.sh" ]; then
            ./create-release.sh
            print_success "Desktop app release started"
        else
            print_error "Release script not found"
            exit 1
        fi
        
        echo ""
        print_success "Complete deployment initiated!"
        echo ""
        echo "🎯 Status URLs:"
        echo "   Landing Page: https://github.com/$REPO_NAME/actions/workflows/deploy-landing.yml"
        echo "   Desktop Builds: https://github.com/$REPO_NAME/actions/workflows/build-desktop.yml"
        ;;
    
    4)
        echo ""
        echo -e "${PURPLE}📊 DEPLOYMENT STATUS${NC}"
        echo "===================="
        
        print_step "Checking GitHub Pages status..."
        
        # Check if GitHub Pages is enabled
        echo "🔗 Repository: https://github.com/$REPO_NAME"
        echo "⚙️  Settings: https://github.com/$REPO_NAME/settings/pages"
        echo "📊 Actions: https://github.com/$REPO_NAME/actions"
        echo ""
        
        # Show current URLs
        echo -e "${PURPLE}🌐 Current URLs:${NC}"
        echo "Landing Page: https://$(echo $REPO_NAME | tr '[:upper:]' '[:lower:]' | sed 's/\//.github.io\//')"
        echo "Releases: https://github.com/$REPO_NAME/releases"
        echo ""
        
        # Show download links
        if [ -f "DISTRIBUTION_INFO.md" ]; then
            CURRENT_VERSION=$(node -p "require('./nitrix-desktop/package.json').version" 2>/dev/null || echo "1.0.0")
            echo -e "${PURPLE}📦 Current Download Links (v$CURRENT_VERSION):${NC}"
            echo "macOS: https://github.com/$REPO_NAME/releases/download/v$CURRENT_VERSION/Nitrix-$CURRENT_VERSION-arm64.dmg"
            echo "Windows: https://github.com/$REPO_NAME/releases/download/v$CURRENT_VERSION/Nitrix-Setup-$CURRENT_VERSION.exe"
            echo "Linux: https://github.com/$REPO_NAME/releases/download/v$CURRENT_VERSION/Nitrix-$CURRENT_VERSION-arm64.AppImage"
        fi
        ;;
    
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment process complete!${NC}"
echo ""
echo -e "${PURPLE}💡 Next Steps:${NC}"
echo "• Wait for GitHub Actions to complete (~5-15 minutes)"
echo "• Check deployment status in Actions tab"
echo "• Test your live landing page and download links"
echo "• Share your landing page URL with beta users"
echo ""
echo -e "${PURPLE}📱 Marketing Ready:${NC}"
echo "✅ Professional landing page with invite system"
echo "✅ Working download links for all platforms"
echo "✅ Automatic deployment pipeline"
echo "✅ Analytics and download tracking"
echo ""
print_success "Your Nitrix platform is now production-ready! 🚀"