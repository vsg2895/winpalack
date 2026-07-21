'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { subscribeToasts, dismissToast, type ToastItem } from '@/lib/toast'

const AUTO_DISMISS_MS = 5000

/**
 * Fixed toast stack — top-right on desktop, top-center on mobile — that any form
 * can trigger via showToast(). Each toast auto-dismisses after 5s, has a close
 * button, and never touches the page layout (so the subscribe form stays put).
 */
export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return subscribeToasts(setToasts)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  )
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Enter animation on next frame.
    const raf = requestAnimationFrame(() => setShow(true))
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismiss(): void {
    setShow(false)
    window.setTimeout(() => dismissToast(toast.id), 200) // let it fade out first
  }

  const isSuccess = toast.type === 'success'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur transition-all duration-200 ${
        show ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      } ${isSuccess ? 'border-emerald-200' : 'border-red-200'}`}
    >
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white ${
          isSuccess ? 'bg-emerald-500' : 'bg-red-500'
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          {isSuccess ? (
            <path d="M5 10.5l3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
          )}
        </svg>
      </span>

      <p className="flex-1 text-sm leading-snug text-slate-700">{toast.message}</p>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
