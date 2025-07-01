# 📦 Nitrix Distribution Information

## 🔗 Repository
- **GitHub**: https://github.com/Starbird265/agent
- **Releases**: https://github.com/Starbird265/agent/releases
- **Actions**: https://github.com/Starbird265/agent/actions

## 🚀 Creating Releases

### Automatic (Recommended)
```bash
./create-release.sh
```

### Manual
```bash
# Update version in package.json
npm version patch  # or minor, major

# Create and push tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

## 📥 Download URLs

### Current Version: v1.0.0

#### macOS
- Intel: https://github.com/Starbird265/agent/releases/download/v1.0.0/Nitrix-1.0.0.dmg
- Apple Silicon: https://github.com/Starbird265/agent/releases/download/v1.0.0/Nitrix-1.0.0-arm64.dmg

#### Windows  
- Installer: https://github.com/Starbird265/agent/releases/download/v1.0.0/Nitrix-Setup-1.0.0.exe

#### Linux
- AppImage: https://github.com/Starbird265/agent/releases/download/v1.0.0/Nitrix-1.0.0-arm64.AppImage

## 🔄 Updating Landing Page

After each release, update these URLs in your landing page:

```javascript
const downloadLinks = {
  macos: 'https://github.com/Starbird265/agent/releases/download/v{VERSION}/Nitrix-{VERSION}-arm64.dmg',
  windows: 'https://github.com/Starbird265/agent/releases/download/v{VERSION}/Nitrix-Setup-{VERSION}.exe',
  linux: 'https://github.com/Starbird265/agent/releases/download/v{VERSION}/Nitrix-{VERSION}-arm64.AppImage'
};
```

## 📊 Release Statistics

Check download statistics at:
https://github.com/Starbird265/agent/releases

## 🔧 Troubleshooting

### Build Failures
1. Check GitHub Actions logs
2. Verify all dependencies in package.json
3. Test builds locally first

### Missing Downloads
1. Wait for build to complete (~10-15 minutes)
2. Check if tag was pushed correctly
3. Verify workflow triggered

