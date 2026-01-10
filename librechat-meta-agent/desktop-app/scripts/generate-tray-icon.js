#!/usr/bin/env node
/**
 * Generate Tray Icon for macOS
 * 
 * This script creates a template tray icon from the main app icon.
 * For macOS, template icons should be:
 * - 16x16 or 22x22 pixels (or @2x versions for retina)
 * - Black with alpha transparency (macOS will adjust for dark/light mode)
 * - Named with "Template" suffix (e.g., trayTemplate.png)
 * 
 * Usage: node scripts/generate-tray-icon.js
 * 
 * Requires: sharp (npm install sharp)
 */

const fs = require('fs');
const path = require('path');

async function generateTrayIcon() {
  const resourcesDir = path.join(__dirname, '..', 'resources');
  const sourceIcon = path.join(resourcesDir, 'icon.png');
  const trayIcon = path.join(resourcesDir, 'trayTemplate.png');
  const trayIcon2x = path.join(resourcesDir, 'trayTemplate@2x.png');

  // Check if source icon exists
  if (!fs.existsSync(sourceIcon)) {
    console.error('Source icon not found:', sourceIcon);
    console.log('Please ensure icon.png exists in the resources directory.');
    process.exit(1);
  }

  try {
    // Try to use sharp for image processing
    const sharp = require('sharp');

    console.log('Generating tray icons from:', sourceIcon);

    // Create 22x22 tray icon (standard)
    await sharp(sourceIcon)
      .resize(22, 22, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      // Convert to grayscale for template icon
      .grayscale()
      // Normalize to black with alpha
      .negate({ alpha: false })
      .toFile(trayIcon);

    console.log('Created:', trayIcon);

    // Create 44x44 @2x version for retina
    await sharp(sourceIcon)
      .resize(44, 44, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .grayscale()
      .negate({ alpha: false })
      .toFile(trayIcon2x);

    console.log('Created:', trayIcon2x);
    console.log('Tray icons generated successfully!');

  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('Sharp module not found. Installing...');
      console.log('Run: npm install sharp');
      console.log('');
      console.log('Alternatively, create tray icons manually:');
      console.log('1. Open icon.png in an image editor');
      console.log('2. Resize to 22x22 pixels');
      console.log('3. Convert to grayscale/black with alpha');
      console.log('4. Save as trayTemplate.png');
      console.log('5. Create a 44x44 version as trayTemplate@2x.png');
      
      // Create a simple fallback - just copy the icon
      // The app will fall back to icon.png if templates don't exist
      console.log('');
      console.log('For now, the app will use the main icon.png as fallback.');
      process.exit(0);
    } else {
      throw err;
    }
  }
}

generateTrayIcon().catch(console.error);
