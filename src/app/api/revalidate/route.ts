import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const SITE_SLUG = process.env.NEXT_PUBLIC_SITE_SLUG ?? ''

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-revalidate-secret')

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let tags: string[] = []
  try {
    const body = (await req.json()) as { tags?: unknown }
    if (Array.isArray(body.tags) && body.tags.every((t) => typeof t === 'string')) {
      tags = body.tags as string[]
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  // Always refresh this site's own tag — every public fetch carries `site:<slug>`,
  // so this revalidates the whole site's data regardless of which tags were sent.
  const allTags = Array.from(new Set([...tags, `site:${SITE_SLUG}`]))
  allTags.forEach((tag) => revalidateTag(tag, 'max'))

  return NextResponse.json({ ok: true, revalidated: allTags })
}
