'use client'

import { createContext, useCallback, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error'
interface Toast { id: number; message: string; type: ToastType }

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {})

/** Call `const toast = useToast(); toast('message', 'success' | 'error')`. */
export function useToast() {
  return useContext(ToastContext)
}

let seq = 1

/**
 * App-wide toast host. State lives in React context (guaranteed shared across
 * every form/modal in the tree) and the stack is portaled to <body> and styled
 * INLINE — so it renders reliably regardless of CSS/Tailwind. Small card pinned
 * top-right on all devices; auto-dismisses after 5s; has a close button.
 */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = seq++
    setToasts((list) => [...list, { id, message, type }])
    window.setTimeout(() => remove(id), 5000)
  }, [remove])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {mounted && createPortal(
        <div style={STACK}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

const STACK: CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  zIndex: 2147483647,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'flex-end',
  pointerEvents: 'none',
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const success = toast.type === 'success'
  const card: CSSProperties = {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    width: 'min(20rem, calc(100vw - 24px))',
    boxSizing: 'border-box',
    background: '#ffffff',
    border: `1px solid ${success ? '#a7f3d0' : '#fecaca'}`,
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.45,
    color: '#334155',
  }
  const badge: CSSProperties = {
    marginTop: 1,
    flexShrink: 0,
    width: 18,
    height: 18,
    borderRadius: 9999,
    background: success ? '#10b981' : '#ef4444',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontSize: 12,
    fontWeight: 700,
  }
  return (
    <div role="status" aria-live="polite" style={card}>
      <span style={badge} aria-hidden>{success ? '✓' : '!'}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        style={{ flexShrink: 0, marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 15, lineHeight: 1, padding: 0 }}
      >
        ✕
      </button>
    </div>
  )
}
