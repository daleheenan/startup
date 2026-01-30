/**
 * Utility to generate bcrypt password hash for OWNER_PASSWORD_HASH environment variable
 *
 * Usage: tsx backend/scripts/hash-password.ts <password>
 */

import bcrypt from 'bcrypt';

const password = process.argv[2];

if (!password) {
  console.error('Usage: tsx backend/scripts/hash-password.ts <password>');
  process.exit(1);
}

async function hashPassword() {
  const hash = await bcrypt.hash(password, 10);
  console.log('\nPassword Hash:');
  console.log(hash);
  console.log('\nAdd this to your .env file:');
  console.log(`OWNER_PASSWORD_HASH=${hash}`);
  console.log('\nOr set it in Railway environment variables.');
}

hashPassword();
