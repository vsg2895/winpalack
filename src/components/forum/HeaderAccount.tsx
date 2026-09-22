import { getForumMember } from '@/lib/forumSession'
import AccountMenu from './AccountMenu'

/**
 * The account control in the header.
 *
 * A SERVER component that reads the session cookie and hands the right entries
 * to the client dropdown. Deciding here rather than in the browser is what stops
 * the header flashing "Sign in" at every signed-in member on every page load —
 * a client component would have to fetch /me after hydration to know.
 *
 * Renders nothing when the community forum is off for this site: accounts exist
 * for the forum, and a control leading nowhere is worse than no control.
 */
export default async function HeaderAccount({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  const member = await getForumMember()

  if (member === null) {
    return (
      <AccountMenu
        label="Account"
        entries={[
          { href: '/login', label: 'Sign in', primary: true },
          { href: '/register', label: 'Create an account' },
        ]}
      />
    )
  }

  return (
    <AccountMenu
      label={member.display_name}
      initial={member.display_name.slice(0, 1).toUpperCase()}
      // An unconfirmed account cannot post, so the menu says so rather than
      // letting them find out at the reply form.
      badge={
        !member.verified
          ? 'Confirm your email to post'
          : member.role !== 'user'
            ? member.role
            : null
      }
      entries={[
        { href: '/forum/account', label: 'My account', primary: true },
        { href: '/forum', label: 'Community forum' },
      ]}
      signOut
    />
  )
}
