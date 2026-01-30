import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'data', 'novelforge.db');
const db = new Database(dbPath);

console.log('Checking database indexes...\n');

const indexes = db.prepare(`
  SELECT name, tbl_name
  FROM sqlite_master
  WHERE type='index' AND name LIKE 'idx_%'
  ORDER BY tbl_name, name
`).all();

const groupedIndexes = indexes.reduce((acc, idx) => {
  if (!acc[idx.tbl_name]) {
    acc[idx.tbl_name] = [];
  }
  acc[idx.tbl_name].push(idx.name);
  return acc;
}, {});

for (const [table, indexNames] of Object.entries(groupedIndexes)) {
  console.log(`${table}:`);
  indexNames.forEach(name => {
    console.log(`  - ${name}`);
  });
  console.log();
}

console.log(`Total indexes: ${indexes.length}`);

db.close();
