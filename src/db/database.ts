import Dexie, { Table } from 'dexie'

export interface LocationPoint { latitude: number; longitude: number; timestamp: number }
export interface ExplorationSession {
  id?: number; startTime: number; endTime: number
  steps: number | null; distance: number; calories: number; activeMinutes: number
  route: LocationPoint[]
}
export interface Discovery {
  id?: number; speciesName: string; category: 'plant' | 'bird' | 'insect' | 'other'
  confidence: number; image?: string; latitude?: number; longitude?: number
  timestamp: number; method: 'vision' | 'audio' | 'manual'
}
export interface Mission {
  id?: number; type: string; title: string; description: string
  status: 'pending' | 'completed'; reward: number; createdAt: number; completedAt?: number
}
export interface UserProfile { id: number; weight?: number; totalXP: number; streak: number; settings: Record<string, unknown> }

class NatureLensDB extends Dexie {
  explorationSessions!: Table<ExplorationSession, number>
  discoveries!: Table<Discovery, number>
  missions!: Table<Mission, number>
  userProfile!: Table<UserProfile, number>
  constructor() {
    super('naturelens')
    this.version(1).stores({
      explorationSessions: '++id, startTime',
      discoveries: '++id, category, timestamp',
      missions: '++id, status, type',
      userProfile: 'id'
    })
  }
}
export const db = new NatureLensDB()

// CRUD helpers (UI never touches IndexedDB directly)
export const saveSession = (s: ExplorationSession) => db.explorationSessions.add(s)
export const deleteSession = (id: number) => db.explorationSessions.delete(id)
export const saveDiscovery = (d: Discovery) => db.discoveries.add(d)
export const deleteDiscovery = (id: number) => db.discoveries.delete(id)
