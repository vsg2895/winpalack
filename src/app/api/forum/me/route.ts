import { NextResponse } from 'next/server'
import { getForumMember } from '@/lib/forumSession'

/**
 * Who is signed in, for the header's account control.
 *
 * The header used to decide this on the server by reading the session cookie
 * in the root layout, and reading a cookie there made EVERY page dynamic: the
 * whole site was rendered per request, `cache-control: private, no-store`,
 * nothing cached at the edge (SEO audit O1). The control now asks here after
 * hydration, so the pages around it can be static/ISR again.
 *
 * Only what the menu shows leaves the server — never the token, which stays in
 * its httpOnly cookie. `no-store` + `private`: this is one visitor's state and
 * must never be cached for the next one.
 */
export async function GET() {
  const member = await getForumMember()

  return NextResponse.json(
    {
      data: member === null
        ? null
        : { display_name: member.display_name, verified: member.verified, role: member.role },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
