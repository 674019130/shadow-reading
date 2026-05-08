import type { DifficultyLevel, MaterialSource } from './types'

export interface BilingualLabel {
  zh: string
  en: string
}

export const DIFFICULTY_LABELS: Record<DifficultyLevel, BilingualLabel> = {
  beginner: { zh: '入门', en: 'Beginner' },
  intermediate: { zh: '进阶', en: 'Intermediate' },
  advanced: { zh: '高阶', en: 'Advanced' },
}

export const SOURCE_LABELS: Record<MaterialSource, BilingualLabel> = {
  local: { zh: '本地', en: 'Local' },
  youtube: { zh: 'YouTube', en: 'YouTube' },
  builtin: { zh: '内置', en: 'Builtin' },
  text: { zh: '文本', en: 'Text' },
}

export function bilingual(label: BilingualLabel, separator = ' / '): string {
  return `${label.zh}${separator}${label.en}`
}

export function lowerEn(label: BilingualLabel): string {
  return label.en.toLowerCase()
}
