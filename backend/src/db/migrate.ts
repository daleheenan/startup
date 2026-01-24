import db from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function runMigrations() {
  console.log('Running database migrations...');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    db.exec('BEGIN TRANSACTION');

    for (const statement of statements) {
      db.exec(statement);
    }

    db.exec('COMMIT');

    console.log('Database migrations completed successfully.');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly via tsx
const scriptPath = process.argv[1]?.replace(/\\/g, '/');
const moduleUrl = import.meta.url;

// Check if this script was called directly
const isMainModule = scriptPath && (
  moduleUrl.includes(scriptPath) ||
  (scriptPath.includes('migrate') && moduleUrl.includes('migrate'))
);

if (isMainModule) {
  runMigrations();
  process.exit(0);
}
