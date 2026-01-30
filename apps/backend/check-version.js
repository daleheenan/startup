import db from './src/db/connection.js';

const result = db.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').get();
console.log('Current schema version:', result?.version || 0);

const allVersions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
console.log('Applied migrations:', allVersions.map(v => v.version).join(', '));

process.exit(0);
