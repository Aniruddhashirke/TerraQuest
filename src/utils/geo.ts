import type { LocationPoint } from '../db/database'

export const DEFAULT_WEIGHT_KG = 70   // demo default, always shown as "default"
export const WALKING_MET = 3.5
const MAX_WALK_SPEED_MS = 10          // faster between fixes = GPS jump

export function haversineM(a: LocationPoint, b: LocationPoint): number {
  const R = 6371000, rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function isOutlier(a: LocationPoint, b: LocationPoint, distM: number): boolean {
  const dt = (b.timestamp - a.timestamp) / 1000
  return dt > 0 ? distM / dt > MAX_WALK_SPEED_MS : distM > 50
}

// Estimated kcal = MET x weight_kg x active_hours
export const estimateKcal = (activeHours: number, weightKg = DEFAULT_WEIGHT_KG, met = WALKING_MET) =>
  met * weightKg * activeHours
