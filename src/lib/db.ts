import Dexie, { type EntityTable } from 'dexie'
import type { Material, PracticeSession, Recording } from './types'

const db = new Dexie('ShadowReadingDB') as Dexie & {
  materials: EntityTable<Material, 'id'>
  sessions: EntityTable<PracticeSession, 'id'>
  recordings: EntityTable<Recording, 'id'>
}

db.version(1).stores({
  materials: 'id, difficulty, source, createdAt, lastPracticedAt',
  sessions: 'id, materialId, date, startedAt',
  recordings: 'id, materialId, sessionId, createdAt',
})

export { db }
