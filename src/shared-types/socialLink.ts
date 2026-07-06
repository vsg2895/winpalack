// Fields match SocialLinkResource.php.

// Supported platforms — keep in sync with App\Models\SocialLink::PLATFORMS
// and the icon map in each site's SocialIcon component.
export type SocialPlatform =
  | 'facebook'
  | 'twitter'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'telegram'
  | 'discord'
  | 'linkedin'
  | 'twitch'
  | 'reddit'

export interface SocialLink {
  id: number
  site_id: number
  platform: SocialPlatform
  label: string | null
  url: string
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}
