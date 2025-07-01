// Simple icon creator - run with: node create-icons.js
const fs = require('fs');
const path = require('path');

// Create assets directory
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

// Create SVG icon template
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#gradient)"/>
  
  <!-- Brain icon -->
  <g transform="translate(128, 128)">
    <path d="M128 64C128 46.33 142.33 32 160 32C177.67 32 192 46.33 192 64C192 69.31 190.69 74.3 188.41 78.66C220.2 88.09 244 116.06 244 149.33C244 160.97 240.97 171.81 235.88 181.12C248.39 195.63 256 214.69 256 235.33C256 288.15 213.15 331 160.33 331C107.52 331 64.67 288.15 64.67 235.33C64.67 214.69 72.28 195.63 84.79 181.12C79.7 171.81 76.67 160.97 76.67 149.33C76.67 116.06 100.47 88.09 132.26 78.66C129.98 74.3 128.67 69.31 128.67 64Z" 
          fill="white" fill-opacity="0.9"/>
    
    <!-- Neural connections -->
    <circle cx="120" cy="140" r="8" fill="white" fill-opacity="0.7"/>
    <circle cx="200" cy="160" r="6" fill="white" fill-opacity="0.7"/>
    <circle cx="160" cy="200" r="7" fill="white" fill-opacity="0.7"/>
    <circle cx="140" cy="240" r="5" fill="white" fill-opacity="0.7"/>
    <circle cx="180" cy="220" r="6" fill="white" fill-opacity="0.7"/>
    
    <!-- Connection lines -->
    <line x1="120" y1="140" x2="160" y2="200" stroke="white" stroke-width="2" stroke-opacity="0.5"/>
    <line x1="200" y1="160" x2="180" y2="220" stroke="white" stroke-width="2" stroke-opacity="0.5"/>
    <line x1="160" y1="200" x2="140" y2="240" stroke="white" stroke-width="2" stroke-opacity="0.5"/>
  </g>
  
  <!-- Nitrix text -->
  <text x="256" y="420" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
        text-anchor="middle" fill="white" fill-opacity="0.9">NITRIX</text>
</svg>
`.trim();

// Save SVG icon
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgIcon);

console.log('✅ Created icon.svg');
console.log('📝 To create platform-specific icons:');
console.log('   1. macOS: Convert SVG to .icns using online converter');
console.log('   2. Windows: Convert SVG to .ico using online converter');
console.log('   3. Linux: Convert SVG to .png (512x512) and rename to icon.png');
console.log('');
console.log('🌐 Recommended converter: https://convertio.co/svg-icns/');
console.log('💡 Or use: https://cloudconvert.com/svg-to-icns');