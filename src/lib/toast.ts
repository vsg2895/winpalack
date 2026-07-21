// Tiny global toast store (no login/context needed) — any component can call
// showToast() and the single mounted <Toaster/> renders it. Mirrors the module
// pub/sub pattern used elsewhere in the app.

export type ToastType = 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

type Listener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
let nextId = 1
const listeners = new Set<Listener>()

function emit(): void {
  for (const l of listeners) l(toasts)
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  listener(toasts)
  return () => {
    listeners.delete(listener)
  }
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function showToast(message: string, type: ToastType = 'success'): number {
  const id = nextId++
  toasts = [...toasts, { id, message, type }]
  emit()
  return id
}
