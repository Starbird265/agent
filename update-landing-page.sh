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
