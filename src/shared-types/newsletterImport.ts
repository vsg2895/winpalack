// Progress of a queued subscriber-list import.
// Fields match the payload of POST /admin/newsletters/import (202) and
// GET /admin/newsletters/imports/{id}.

export type NewsletterImportStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface NewsletterImportProgress {
  import_id: number
  status: NewsletterImportStatus
  // True once the job ended, either way — the signal to stop polling.
  finished: boolean
  // Running counters while status is 'processing'; final once finished.
  imported: number
  skipped: number
  total: number
  // Populated only when status is 'failed'.
  error: string | null
  // Ready-to-display sentence for the current state.
  message: string
}
