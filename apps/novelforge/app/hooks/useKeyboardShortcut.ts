'use client';

import { useCallback, useEffect } from 'react';

/**
 * Configuration for a keyboard shortcut binding.
 *
 * Supports both Ctrl (Windows/Linux) and Cmd/Meta (macOS) for
 * cross-platform compatibility. When neither ctrlKey nor metaKey is
 * specified, the shortcut fires on the bare key alone.
 */
export interface ShortcutConfig {
  /** The key to match (e.g. 's', 'Enter', 'Escape'). */
  key: string;
  /** Whether Ctrl must be held. */
  ctrlKey?: boolean;
  /** Whether Cmd (Meta) must be held. */
  metaKey?: boolean;
  /** Whether Shift must be held. */
  shiftKey?: boolean;
  /** Whether Alt/Option must be held. */
  altKey?: boolean;
  /** Whether to call event.preventDefault() when the shortcut fires. */
  preventDefault?: boolean;
}

/**
 * Custom hook that registers a keyboard shortcut listener on the document.
 *
 * Handles cross-platform modifier matching: if either ctrlKey or metaKey is
 * requested in the config, the handler treats them as interchangeable so that
 * a single shortcut definition works on both Windows/Linux (Ctrl) and macOS (Cmd).
 *
 * @param config  - The shortcut key and modifier configuration.
 * @param callback - The function to invoke when the shortcut is triggered.
 * @param enabled  - Whether the listener is active. Defaults to `true`.
 *
 * @example
 * useKeyboardShortcut(
 *   { key: 's', ctrlKey: true, preventDefault: true },
 *   () => handleSave(),
 * );
 */
export function useKeyboardShortcut(
  config: ShortcutConfig,
  callback: () => void,
  enabled: boolean = true,
): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey, altKey, preventDefault } = config;

      // Normalised key comparison (case-insensitive for letter keys)
      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return;
      }

      // Cross-platform Ctrl/Cmd matching: if the config requests either
      // modifier, accept whichever is actually pressed on this platform.
      const wantsCtrlOrMeta = ctrlKey || metaKey;
      const hasCtrlOrMeta = event.ctrlKey || event.metaKey;

      if (wantsCtrlOrMeta && !hasCtrlOrMeta) {
        return;
      }

      // If neither Ctrl nor Cmd is requested, ensure neither is pressed
      // so we don't accidentally fire on e.g. Ctrl+S when only S is expected.
      if (!wantsCtrlOrMeta && hasCtrlOrMeta) {
        return;
      }

      if (shiftKey && !event.shiftKey) {
        return;
      }

      if (altKey && !event.altKey) {
        return;
      }

      if (preventDefault) {
        event.preventDefault();
      }

      callback();
    },
    [config, callback],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}
