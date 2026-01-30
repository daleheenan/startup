#!/usr/bin/env node
import { runMigrations } from './db/migrate.js';
import { QueueWorker } from './queue/worker.js';
import { sessionTracker } from './services/session-tracker.js';
import { claudeService } from './services/claude.service.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  console.log('NovelForge CLI\n');

  switch (command) {
    case 'migrate':
      runMigrations();
      break;

    case 'queue:stats':
      showQueueStats();
      break;

    case 'queue:create':
      createTestJob(args[0], args[1]);
      break;

    case 'session:stats':
      showSessionStats();
      break;

    case 'session:clear':
      clearSession();
      break;

    case 'claude:test':
      await testClaude();
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

function showHelp() {
  console.log('Available commands:');
  console.log('  migrate              - Run database migrations');
  console.log('  queue:stats          - Show queue statistics');
  console.log('  queue:create <type> <targetId> - Create a test job');
  console.log('  session:stats        - Show session statistics');
  console.log('  session:clear        - Clear session tracking');
  console.log('  claude:test          - Test Claude API connection');
  console.log('  help                 - Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npm run cli migrate');
  console.log('  npm run cli queue:stats');
  console.log('  npm run cli queue:create generate_chapter chapter-123');
  console.log('  npm run cli session:stats');
  console.log('  npm run cli claude:test');
}

function showQueueStats() {
  const stats = QueueWorker.getQueueStats();

  console.log('Queue Statistics:');
  console.log(`  Pending:   ${stats.pending}`);
  console.log(`  Running:   ${stats.running}`);
  console.log(`  Completed: ${stats.completed}`);
  console.log(`  Paused:    ${stats.paused}`);
  console.log(`  Failed:    ${stats.failed}`);
  console.log(`  Total:     ${stats.total}`);
}

function createTestJob(type: string, targetId: string) {
  if (!type || !targetId) {
    console.error('Error: Missing type or targetId');
    console.log('Usage: npm run cli queue:create <type> <targetId>');
    return;
  }

  const jobId = QueueWorker.createJob(type as any, targetId);
  console.log(`Created job: ${jobId}`);
  console.log(`  Type: ${type}`);
  console.log(`  Target: ${targetId}`);
}

function showSessionStats() {
  const stats = sessionTracker.getSessionStats();

  console.log('Session Statistics:');
  console.log(`  Active:            ${stats.isActive ? 'Yes' : 'No'}`);
  console.log(`  Requests this session: ${stats.requestsThisSession}`);
  console.log(`  Time remaining:    ${stats.timeRemaining}`);
  console.log(`  Reset time:        ${stats.resetTime || 'N/A'}`);
}

function clearSession() {
  sessionTracker.clearSession();
  console.log('Session cleared');
}

async function testClaude() {
  console.log('Testing Claude API connection...');

  try {
    const isConnected = await claudeService.testConnection();

    if (isConnected) {
      console.log('✅ Claude API connection successful');

      const stats = claudeService.getSessionStats();
      console.log(`\nSession started. Requests: ${stats.requestsThisSession}`);
      console.log(`Time remaining: ${stats.timeRemaining}`);
    } else {
      console.log('❌ Claude API connection failed');
    }
  } catch (error: any) {
    console.error('❌ Error testing Claude API:', error.message);
  }
}

main().catch((error) => {
  console.error('CLI error:', error);
  process.exit(1);
});
