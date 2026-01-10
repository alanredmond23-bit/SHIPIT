#!/usr/bin/env node
/**
 * Generate DMG background image for macOS installer
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RESOURCES_DIR = path.join(__dirname, '..', 'resources');

async function main() {
  console.log('Generating DMG background image...\n');

  // Create a simple gradient background with app name
  // DMG window size is 540x380, background should be 2x for retina
  const width = 540;
  const height = 380;

  // Create SVG background
  const svgBackground = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e1b4b"/>
          <stop offset="100%" style="stop-color:#0f172a"/>
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- Subtle grid pattern -->
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#grid)"/>

      <!-- App name -->
      <text x="270" y="50"
            font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
            font-size="24"
            font-weight="600"
            fill="white"
            text-anchor="middle"
            opacity="0.9">Meta Agent</text>

      <!-- Tagline -->
      <text x="270" y="75"
            font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
            font-size="12"
            fill="rgba(255,255,255,0.5)"
            text-anchor="middle">Multi-LLM AI Orchestration Platform</text>

      <!-- Arrow hint -->
      <text x="270" y="250"
            font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
            font-size="32"
            fill="rgba(255,255,255,0.4)"
            text-anchor="middle">→</text>

      <!-- Instructions -->
      <text x="270" y="340"
            font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
            font-size="11"
            fill="rgba(255,255,255,0.4)"
            text-anchor="middle">Drag to Applications to install</text>
    </svg>
  `;

  const outputPath = path.join(RESOURCES_DIR, 'dmg-background.png');

  await sharp(Buffer.from(svgBackground))
    .png()
    .toFile(outputPath);

  console.log('Created: dmg-background.png');

  const stats = fs.statSync(outputPath);
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
