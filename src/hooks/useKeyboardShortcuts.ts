import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  callback: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

// Common shortcut definitions
export const SHORTCUTS = {
  FOCUS_SEARCH: { key: '/', description: 'Focus search input' },
  START_SEARCH: { key: 'Enter', description: 'Start search' },
  STOP_SEARCH: { key: 'Escape', description: 'Stop search' },
  EXPORT: { key: 'e', ctrl: true, description: 'Export results (Ctrl+E)' },
  CLEAR_RESULTS: {
    key: 'k',
    ctrl: true,
    description: 'Clear results (Ctrl+K)',
  },
  TOGGLE_ABOUT: { key: 'h', ctrl: true, description: 'Show help (Ctrl+H)' },
};
