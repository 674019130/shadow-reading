export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type MaterialSource = 'local' | 'youtube' | 'builtin' | 'text'
export type MediaType = 'audio' | 'video'

export interface SubtitleCue {
  index: number
  startTime: number  // seconds (float)
  endTime: number
  text: string
  translation?: string
}

export interface Material {
  id: string
  title: string
  description?: string
  difficulty: DifficultyLevel
  source: MaterialSource
  mediaType?: MediaType
  audioPath: string
  duration: number
  subtitles: SubtitleCue[]
  youtubeUrl?: string
  tags: string[]
  createdAt: string
  lastPracticedAt?: string
  practiceCount: number
}

export type PracticePhase = 'blind-listen' | 'detailed-read' | 'shadow-practice' | 'record-compare' | 'retelling'

export const PHASE_CONFIG: Record<PracticePhase, {
  label: string
  labelEn: string
  duration: number
  description: string
  descriptionEn: string
  subtitleVisible: boolean
  color: string
}> = {
  'blind-listen': {
    label: '盲听',
    labelEn: 'Listen',
    duration: 180,
    description: '不看文本，听 1~2 遍，估计理解百分比',
    descriptionEn: 'Listen without text. Estimate how much you understand.',
    subtitleVisible: false,
    color: 'var(--phase-listen)',
  },
  'detailed-read': {
    label: '精读',
    labelEn: 'Read',
    duration: 180,
    description: '看文本再听一遍，查生词，理解全文',
    descriptionEn: 'Read the script, check key words, and understand the full passage.',
    subtitleVisible: true,
    color: 'var(--phase-read)',
  },
  'shadow-practice': {
    label: '跟读',
    labelEn: 'Shadow',
    duration: 600,
    description: '不看文本，跟读 3~5 遍，模仿语气重音连读',
    descriptionEn: 'Shadow 3-5 times. Copy rhythm, stress, linking, and intonation.',
    subtitleVisible: false,
    color: 'var(--phase-shadow)',
  },
  'record-compare': {
    label: '录音',
    labelEn: 'Record',
    duration: 180,
    description: '录一遍跟读，和原音对比找偏差',
    descriptionEn: 'Record yourself once and compare it with the original voice.',
    subtitleVisible: true,
    color: 'var(--phase-record)',
  },
  'retelling': {
    label: '复述',
    labelEn: 'Retell',
    duration: 60,
    description: '用英语简要复述材料内容',
    descriptionEn: 'Retell the material briefly in your own English.',
    subtitleVisible: false,
    color: 'var(--phase-retell)',
  },
}

export const PHASES: PracticePhase[] = [
  'blind-listen',
  'detailed-read',
  'shadow-practice',
  'record-compare',
  'retelling',
]

export interface PhaseRecord {
  phase: PracticePhase
  duration: number
  completedAt?: string
}

export interface SessionAssessment {
  comprehensionPercent: number
  syncLossCount: number
  speed: number
  notes: string
  selfRating: 1 | 2 | 3 | 4 | 5
}

export interface PracticeSession {
  id: string
  materialId: string
  date: string
  startedAt: string
  completedAt?: string
  phases: PhaseRecord[]
  assessment?: SessionAssessment
}

export interface Recording {
  id: string
  materialId: string
  sessionId?: string
  filePath: string
  duration: number
  createdAt: string
}

export interface DailyProgress {
  date: string
  sessionsCompleted: number
  totalMinutes: number
  materialsCount: number
  avgComprehension: number
  avgSyncLoss: number
}

export const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5] as const
