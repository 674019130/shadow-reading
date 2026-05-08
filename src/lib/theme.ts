export const THEME_STORAGE_KEY = 'shadow-reading:theme'

export function themeInitScript(): string {
  return `
    (function () {
      try {
        var preference = localStorage.getItem('${THEME_STORAGE_KEY}') || 'system';
        var theme = preference === 'system'
          ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
          : preference;
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.themePreference = preference;
      } catch (_) {
        document.documentElement.dataset.theme = 'dark';
        document.documentElement.dataset.themePreference = 'dark';
      }
    })();
  `
}
