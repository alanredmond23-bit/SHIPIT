#!/usr/bin/env node
/**
 * Copy Next.js static export to Electron renderer directory
 *
 * This script copies the built Next.js static files from ui-extensions/out
 * to desktop-app/renderer for packaging with Electron.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'ui-extensions', 'out');
const DEST_DIR = path.join(__dirname, '..', 'renderer');

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItem => {
      copyRecursive(path.join(src, childItem), path.join(dest, childItem));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  console.log('Copying Next.js static export to Electron renderer...\n');
  console.log('Source:', SOURCE_DIR);
  console.log('Destination:', DEST_DIR);

  // Check if source exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('\nError: Source directory does not exist!');
    console.error('Run "npm run build:next" first to build the Next.js app.');
    process.exit(1);
  }

  // Remove existing renderer directory
  if (fs.existsSync(DEST_DIR)) {
    console.log('\nRemoving existing renderer directory...');
    fs.rmSync(DEST_DIR, { recursive: true });
  }

  // Copy files
  console.log('\nCopying files...');
  copyRecursive(SOURCE_DIR, DEST_DIR);

  // Count files copied
  function countFiles(dir) {
    let count = 0;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        count += countFiles(fullPath);
      } else {
        count++;
      }
    }
    return count;
  }

  const fileCount = countFiles(DEST_DIR);
  console.log(`\nCopied ${fileCount} files successfully!`);

  // Calculate total size
  function getSize(dir) {
    let size = 0;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        size += getSize(fullPath);
      } else {
        size += stat.size;
      }
    }
    return size;
  }

  const totalSize = getSize(DEST_DIR);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

main();
