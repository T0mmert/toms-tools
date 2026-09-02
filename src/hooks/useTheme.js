import { useEffect } from 'react';
import { KEYS } from '../lib/schema';
import { useStore } from './useStore';

export function useTheme() {
  const [theme, setTheme] = useStore(KEYS.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    // Keep the browser UI (address bar, form controls) in step with the choice.
    root.style.colorScheme = theme === 'system' ? 'light dark' : theme;
  }, [theme]);

  return [theme, setTheme];
}
