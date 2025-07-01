#!/bin/bash

echo "🚀 NITRIX DEPLOYMENT SCRIPT"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎯 Deploying Nitrix - Train Smarter AI${NC}"
echo ""

# Step 1: Check if we're in the right directory
if [ ! -d "nitrix-landing" ] || [ ! -d "nitrix-desktop" ]; then
    echo -e "${RED}❌ Error: Please run this script from the agent root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 STEP 1: Configure Supabase${NC}"
echo "1. Go to https://supabase.com and create a new project"
echo "2. Run the SQL from nitrix-landing/supabase-setup.sql in your SQL editor"
echo "3. Get your Project URL and anon public key"
echo ""
read -p "Enter your Supabase Project URL: " SUPABASE_URL
read -p "Enter your Supabase anon key: " SUPABASE_KEY

# Update the script.js file
echo -e "${BLUE}🔧 Updating Supabase configuration...${NC}"
sed -i.bak "s|https://your-project-id.supabase.co|$SUPABASE_URL|g" nitrix-landing/script.js
sed -i.bak "s|your-anon-public-key-here|$SUPABASE_KEY|g" nitrix-landing/script.js

echo -e "${GREEN}✅ Supabase configuration updated!${NC}"
echo ""

# Step 2: Deploy landing page
echo -e "${YELLOW}📋 STEP 2: Deploy Landing Page${NC}"
echo "Choose your deployment method:"
echo "1. Netlify Drop (Drag & Drop)"
echo "2. Vercel CLI"
echo "3. GitHub Pages"
read -p "Enter choice (1-3): " DEPLOY_CHOICE

case $DEPLOY_CHOICE in
    1)
        echo -e "${BLUE}🌐 Netlify Drop Deployment:${NC}"
        echo "1. Go to https://netlify.com/drop"
        echo "2. Drag the 'nitrix-landing' folder to the upload area"
        echo "3. Copy the provided URL"
        ;;
    2)
        echo -e "${BLUE}▲ Vercel Deployment:${NC}"
        if command -v vercel &> /dev/null; then
            cd nitrix-landing
            vercel --prod
            cd ..
        else
            echo "Installing Vercel CLI..."
            npm install -g vercel
            cd nitrix-landing
            vercel --prod
            cd ..
        fi
        ;;
    3)
        echo -e "${BLUE}📄 GitHub Pages Setup:${NC}"
        echo "1. Copy nitrix-landing/* to your repository root"
        echo "2. Go to repository Settings > Pages"
        echo "3. Enable GitHub Pages from main branch"
        cp -r nitrix-landing/* .
        git add .
        git commit -m "Deploy Nitrix landing page"
        git push
        ;;
esac

echo ""

# Step 3: Build desktop apps
echo -e "${YELLOW}📋 STEP 3: Build Desktop Apps${NC}"
read -p "Do you want to build desktop apps now? (y/n): " BUILD_APPS

if [ "$BUILD_APPS" = "y" ] || [ "$BUILD_APPS" = "Y" ]; then
    echo -e "${BLUE}🔨 Building desktop applications...${NC}"
    
    cd nitrix-desktop
    
    # Install dependencies
    echo "Installing dependencies..."
    npm install
    
    # Create icons
    echo "Creating application icons..."
    node create-icons.js
    
    # Build for all platforms
    echo "Building for all platforms..."
    npm run build:all
    
    cd ..
    
    echo -e "${GREEN}✅ Desktop apps built successfully!${NC}"
    echo -e "${BLUE}📦 Built files are in: nitrix-desktop/dist/${NC}"
else
    echo -e "${YELLOW}⏭️ Skipping desktop app build${NC}"
fi

echo ""

# Step 4: Create GitHub release
echo -e "${YELLOW}📋 STEP 4: Create GitHub Release${NC}"
read -p "Do you want to create a GitHub release? (y/n): " CREATE_RELEASE

if [ "$CREATE_RELEASE" = "y" ] || [ "$CREATE_RELEASE" = "Y" ]; then
    read -p "Enter version number (e.g., 1.0.0): " VERSION
    
    echo -e "${BLUE}🏷️ Creating GitHub release...${NC}"
    
    # Commit changes
    git add .
    git commit -m "🚀 Nitrix v$VERSION - Complete deployment setup"
    
    # Create and push tag
    git tag "v$VERSION"
    git push origin main
    git push origin "v$VERSION"
    
    echo -e "${GREEN}✅ GitHub release created!${NC}"
    echo -e "${BLUE}🤖 GitHub Actions will automatically build desktop apps${NC}"
else
    echo -e "${YELLOW}⏭️ Skipping GitHub release${NC}"
fi

echo ""
echo -e "${GREEN}🎉 NITRIX DEPLOYMENT COMPLETE!${NC}"
echo "=================================="
echo -e "${BLUE}📱 Landing Page:${NC} Deployed and configured"
echo -e "${BLUE}🔐 Invite Codes:${NC} Ready to use (check supabase-setup.sql)"
echo -e "${BLUE}💻 Desktop Apps:${NC} Built for Mac/Windows/Linux"
echo -e "${BLUE}🚀 GitHub Release:${NC} Automated builds configured"
echo ""
echo -e "${YELLOW}🎯 READY INVITE CODES:${NC}"
echo "NITRIX001234  NITRIX005678  NITRIX009876"
echo "NITRIX543210  NITRIX111222  NITRIX333444"
echo "NITRIXALPHA1  NITRIXBETA01  NITRIXVIP001"
echo ""
echo -e "${GREEN}✨ Your Nitrix platform is ready to launch!${NC}"
echo -e "${BLUE}Share invite codes with your beta users and let them experience the future of AI training!${NC}"