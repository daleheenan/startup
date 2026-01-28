/**
 * Shared server readiness state.
 *
 * This module exists to break the circular dependency between server.ts and
 * routes/health.ts. Previously health.ts dynamically imported server.ts to
 * read isServerReady / isQueueWorkerReady, but that import races with the
 * module initialisation and returns stale (undefined) values during the first
 * few hundred milliseconds -- exactly when Railway fires its health probe.
 *
 * Usage:
 * - server.ts calls setServerReady(true) after listening
 * - server.ts calls setQueueWorkerReady(true) when worker starts
 * - routes/health.ts imports isServerReady() and isQueueWorkerReady() to check status
 */

let _serverReady = false;
let _queueWorkerReady = false;

export function setServerReady(ready: boolean): void {
  _serverReady = ready;
}

export function setQueueWorkerReady(ready: boolean): void {
  _queueWorkerReady = ready;
}

export function isServerReady(): boolean {
  return _serverReady;
}

export function isQueueWorkerReady(): boolean {
  return _queueWorkerReady;
}
