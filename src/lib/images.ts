import { API_IMAGE } from './config'

// Resolve a stored image path (e.g. "uploads/banner/uuid.webp") to a full URL
// served from the Laravel public storage disk. Absolute URLs pass through.
const STORAGE_BASE = API_IMAGE

export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/+/, '')}`
}
