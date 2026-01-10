#!/usr/bin/env node
/**
 * Icon Generator for Meta Agent Desktop App
 *
 * Generates platform-specific icons:
 * - icon.png (512x512) - Base icon for Linux
 * - icon.icns - macOS icon bundle
 * - icon.ico - Windows icon
 *
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const RESOURCES_DIR = path.join(__dirname, '..', 'resources');

// SVG icon design - "MA" text with modern gradient background
const createSvgIcon = () => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Main gradient - Deep purple to vibrant blue -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="50%" style="stop-color:#764ba2"/>
      <stop offset="100%" style="stop-color:#6B8DD6"/>
    </linearGradient>

    <!-- Subtle inner glow -->
    <radialGradient id="glowGradient" cx="30%" cy="30%" r="70%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.25)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>

  <!-- Background rounded square -->
  <rect x="16" y="16" width="480" height="480" rx="96" ry="96" fill="url(#bgGradient)"/>

  <!-- Inner glow overlay -->
  <rect x="16" y="16" width="480" height="480" rx="96" ry="96" fill="url(#glowGradient)"/>

  <!-- Border highlight -->
  <rect x="20" y="20" width="472" height="472" rx="92" ry="92"
        fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>

  <!-- MA Text - using path for better compatibility -->
  <g transform="translate(256, 290)">
    <!-- Letter M -->
    <path d="M-140,-100 L-140,100 L-105,100 L-105,-20 L-60,60 L-40,60 L5,-20 L5,100 L40,100 L40,-100 L0,-100 L-50,10 L-100,-100 Z"
          fill="white"/>
    <!-- Letter A -->
    <path d="M60,-100 L20,100 L55,100 L65,55 L135,55 L145,100 L180,100 L140,-100 Z M75,20 L100,-55 L125,20 Z"
          fill="white"/>
  </g>

  <!-- Decorative element - small dot accent -->
  <circle cx="415" cy="130" r="20" fill="rgba(255,255,255,0.35)"/>
</svg>`;

async function main() {
  console.log('Meta Agent Icon Generator\n');

  // Ensure resources directory exists
  if (!fs.existsSync(RESOURCES_DIR)) {
    fs.mkdirSync(RESOURCES_DIR, { recursive: true });
  }

  // Write SVG file
  const svgContent = createSvgIcon();
  const svgPath = path.join(RESOURCES_DIR, 'icon.svg');
  fs.writeFileSync(svgPath, svgContent);
  console.log('Created: icon.svg');

  // Generate PNG files using sharp
  const svgBuffer = Buffer.from(svgContent);

  try {
    // Main 512x512 PNG
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(RESOURCES_DIR, 'icon.png'));
    console.log('Created: icon.png (512x512)');

    // Generate Windows ICO (using png-to-ico - ESM module)
    const pngToIco = (await import('png-to-ico')).default;

    // Generate multiple size PNGs for ICO
    const icoSizes = [16, 24, 32, 48, 64, 128, 256];
    const pngBuffers = await Promise.all(
      icoSizes.map(size =>
        sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );

    const icoBuffer = await pngToIco(pngBuffers);
    fs.writeFileSync(path.join(RESOURCES_DIR, 'icon.ico'), icoBuffer);
    console.log('Created: icon.ico');

    // Generate macOS ICNS using iconutil (macOS only)
    if (process.platform === 'darwin') {
      const iconsetDir = path.join(RESOURCES_DIR, 'icon.iconset');

      // Create iconset directory
      if (fs.existsSync(iconsetDir)) {
        fs.rmSync(iconsetDir, { recursive: true });
      }
      fs.mkdirSync(iconsetDir);

      // Required sizes for macOS iconset
      const macSizes = [
        { size: 16, name: 'icon_16x16.png' },
        { size: 32, name: 'icon_16x16@2x.png' },
        { size: 32, name: 'icon_32x32.png' },
        { size: 64, name: 'icon_32x32@2x.png' },
        { size: 128, name: 'icon_128x128.png' },
        { size: 256, name: 'icon_128x128@2x.png' },
        { size: 256, name: 'icon_256x256.png' },
        { size: 512, name: 'icon_256x256@2x.png' },
        { size: 512, name: 'icon_512x512.png' },
        { size: 1024, name: 'icon_512x512@2x.png' },
      ];

      for (const { size, name } of macSizes) {
        await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toFile(path.join(iconsetDir, name));
      }

      // Convert iconset to icns
      const icnsPath = path.join(RESOURCES_DIR, 'icon.icns');
      execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'inherit' });
      console.log('Created: icon.icns');

      // Cleanup iconset directory
      fs.rmSync(iconsetDir, { recursive: true });
    } else {
      console.log('\nNote: Run on macOS to generate icon.icns');
    }

  } catch (err) {
    console.error('Error generating icons:', err.message);
    process.exit(1);
  }

  console.log('\n--- Icon Generation Complete ---');
  console.log('Resources directory:', RESOURCES_DIR);
  console.log('\nGenerated files:');
  fs.readdirSync(RESOURCES_DIR).forEach(file => {
    const stat = fs.statSync(path.join(RESOURCES_DIR, file));
    if (!stat.isDirectory()) {
      console.log(`  ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
    }
  });
}

main().catch(console.error);
