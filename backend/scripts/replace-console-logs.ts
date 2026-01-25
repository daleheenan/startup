#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

interface ReplacePattern {
  search: RegExp;
  replace: string | ((match: string, ...groups: string[]) => string);
}

const routesDir = path.join(__dirname, '../src/routes');
const servicesDir = path.join(__dirname, '../src/services');

// Pattern to add logger import
function addLoggerImport(content: string, filename: string): string {
  const routeName = path.basename(filename, '.ts');

  // Check if already has logger
  if (content.includes('createLogger')) {
    return content;
  }

  // Find last import statement
  const importRegex = /^import .* from .*;$/gm;
  const imports = content.match(importRegex);

  if (!imports) {
    console.warn(`No imports found in ${filename}`);
    return content;
  }

  const lastImport = imports[imports.length - 1];
  const loggerImport = `import { createLogger } from '../services/logger.service.js';`;

  // Add logger import after last import
  content = content.replace(lastImport, `${lastImport}\n${loggerImport}`);

  // Find router declaration and add logger constant
  const routerRegex = /(const router = .*Router\(\);)/;
  const match = content.match(routerRegex);

  if (match) {
    const contextName = filename.includes('/routes/')
      ? `routes:${routeName}`
      : `services:${routeName}`;
    const loggerDeclaration = `\nconst logger = createLogger('${contextName}');`;
    content = content.replace(match[1], `${match[1]}${loggerDeclaration}`);
  }

  return content;
}

// Replace console.error patterns
function replaceConsoleErrors(content: string): string {
  // Pattern 1: console.error('[Context] Message:', error);
  content = content.replace(
    /console\.error\('\[.*?\]\s*([^']+):', error\);/g,
    "logger.error({ error: error instanceof Error ? error.message : error }, '$1');"
  );

  // Pattern 2: console.error('Message:', error);
  content = content.replace(
    /console\.error\('([^']+):', error\);/g,
    "logger.error({ error: error instanceof Error ? error.message : error }, '$1');"
  );

  // Pattern 3: console.error with stack trace already
  content = content.replace(
    /console\.error\('\[.*?\]\s*([^']+):',\s*\{?\s*error:\s*error\.message,\s*stack:\s*error\.stack.*?\}\);/g,
    "logger.error({ error: error.message, stack: error.stack }, '$1');"
  );

  return content;
}

// Replace console.log patterns
function replaceConsoleLogs(content: string): string {
  // Pattern 1: console.log('[Context] Message');
  content = content.replace(
    /console\.log\('\[.*?\]\s*([^']+)'\);/g,
    "logger.info('$1');"
  );

  // Pattern 2: console.log with object
  content = content.replace(
    /console\.log\('\[.*?\]\s*([^']+):',\s*(\{[^}]+\})\);/g,
    "logger.info($2, '$1');"
  );

  return content;
}

// Replace console.warn patterns
function replaceConsoleWarns(content: string): string {
  content = content.replace(
    /console\.warn\('\[.*?\]\s*([^']+)'\);/g,
    "logger.warn('$1');"
  );

  content = content.replace(
    /console\.warn\('([^']+)'\);/g,
    "logger.warn('$1');"
  );

  return content;
}

// Process a single file
function processFile(filepath: string): boolean {
  try {
    let content = fs.readFileSync(filepath, 'utf-8');

    // Check if file has console statements
    if (!/console\.(log|error|warn|debug)/.test(content)) {
      return false;
    }

    console.log(`Processing: ${path.relative(process.cwd(), filepath)}`);

    // Add logger import
    content = addLoggerImport(content, filepath);

    // Replace console statements
    content = replaceConsoleErrors(content);
    content = replaceConsoleLogs(content);
    content = replaceConsoleWarns(content);

    // Write back
    fs.writeFileSync(filepath, content, 'utf-8');

    console.log(`  ✓ Updated ${path.relative(process.cwd(), filepath)}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error processing ${filepath}:`, error);
    return false;
  }
}

// Process all TypeScript files in a directory
function processDirectory(dir: string): number {
  let count = 0;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      const filepath = path.join(dir, file);
      if (processFile(filepath)) {
        count++;
      }
    }
  }

  return count;
}

// Main execution
console.log('=== Replacing console statements with structured logging ===\n');

console.log('Processing routes...');
const routesCount = processDirectory(routesDir);

console.log('\nProcessing services...');
const servicesCount = processDirectory(servicesDir);

console.log(`\n=== Complete ===`);
console.log(`Routes processed: ${routesCount}`);
console.log(`Services processed: ${servicesCount}`);
console.log(`Total files updated: ${routesCount + servicesCount}`);
console.log(`\nNOTE: Please review the changes and test thoroughly.`);
