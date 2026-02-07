import { useEffect } from 'react';

export type KeyCombo = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export function useKeyboardShortcut(
  combo: KeyCombo,
  callback: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const matchesKey = e.key.toLowerCase() === combo.key.toLowerCase();
      const matchesCtrl = combo.ctrl ? e.ctrlKey : !e.ctrlKey;
      const matchesMeta = combo.meta ? e.metaKey : !e.metaKey;
      const matchesShift = combo.shift ? e.shiftKey : !e.shiftKey;
      const matchesAlt = combo.alt ? e.altKey : !e.altKey;

      if (matchesKey && matchesCtrl && matchesMeta && matchesShift && matchesAlt) {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [combo, callback, enabled]);
}
