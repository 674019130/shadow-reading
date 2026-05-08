'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { THEME_STORAGE_KEY } from '@/lib/theme'

type ThemePreference = 'dark' | 'light' | 'system'
type Theme = 'dark' | 'light'

const OPTIONS: ThemePreference[] = ['dark', 'light', 'system']

export default function ThemeToggle() {
  const preference = useSyncExternalStore(subscribeToThemePreference, readPreference, getServerPreference)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const handleChange = () => {
      if (readPreference() === 'system') applyTheme('system')
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const cycleTheme = () => {
    const next = OPTIONS[(OPTIONS.indexOf(preference) + 1) % OPTIONS.length]
    applyTheme(next)
  }

  const Icon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor

  return (
    <button
      onClick={cycleTheme}
      className="p-1 rounded text-text-muted hover:text-text-secondary transition-colors"
      title={`主题 / Theme: ${preference}`}
      aria-label={`主题 / Theme: ${preference}`}
    >
      <Icon size={13} />
    </button>
  )
}

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system'
}

function getServerPreference(): ThemePreference {
  return 'system'
}

function subscribeToThemePreference(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleChange = () => callback()
  window.addEventListener('storage', handleChange)
  window.addEventListener('shadow-reading-theme-change', handleChange)

  return () => {
    window.removeEventListener('storage', handleChange)
    window.removeEventListener('shadow-reading-theme-change', handleChange)
  }
}

function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference)
  window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.themePreference = preference
  window.dispatchEvent(new Event('shadow-reading-theme-change'))
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return preference
}
