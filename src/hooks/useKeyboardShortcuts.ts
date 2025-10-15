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
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
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

// 常用快捷键定义
export const SHORTCUTS = {
  FOCUS_SEARCH: { key: '/', description: '聚焦到搜索框' },
  START_SEARCH: { key: 'Enter', description: '开始搜索' },
  STOP_SEARCH: { key: 'Escape', description: '停止搜索' },
  EXPORT: { key: 'e', ctrl: true, description: '导出结果 (Ctrl+E)' },
  CLEAR_RESULTS: { key: 'k', ctrl: true, description: '清除结果 (Ctrl+K)' },
  TOGGLE_ABOUT: { key: 'h', ctrl: true, description: '显示帮助 (Ctrl+H)' },
};

