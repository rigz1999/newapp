// ============================================
// Keyboard Shortcuts Hook
// Path: src/hooks/useKeyboardShortcuts.ts
// ============================================

import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !shortcut.ctrlKey || event.ctrlKey;
        const shiftMatches = !shortcut.shiftKey || event.shiftKey;
        const metaMatches = !shortcut.metaKey || event.metaKey;
        const altMatches = !shortcut.altKey || event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && metaMatches && altMatches) {
          event.preventDefault();
          shortcut.callback();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Helper to check if user is on Mac
export const isMac = () => {
  return typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

// Format shortcut key for display
export const formatShortcutKey = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];

  if (shortcut.metaKey) parts.push(isMac() ? '⌘' : 'Ctrl');
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
};
