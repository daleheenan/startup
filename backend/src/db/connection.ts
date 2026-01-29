import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('db:connection');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database path from environment or use default
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/novelforge.db');

// Ensure data directory exists
const dataDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db: Database.Database = new Database(DATABASE_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? ((message?: unknown) => logger.debug({ sql: message }, 'query')) : undefined,
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Configure for better performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// CRITICAL: Set busy timeout to prevent 503 errors during concurrent access
// When database is locked (migrations, background jobs), wait up to 30 seconds
// instead of failing immediately. This prevents intermittent 503 errors.
db.pragma('busy_timeout = 30000');

// Increase cache size for better read performance (negative = KB, so -64000 = 64MB)
db.pragma('cache_size = -64000');

logger.info({ path: DATABASE_PATH }, 'Database connected');

export default db;
