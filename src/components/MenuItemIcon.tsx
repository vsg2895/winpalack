/**
 * The leading mark on a menu child: the category's own icon, or the quiet dot
 * the menus used before icons existed.
 *
 * ONE component for the header dropdown, the footer disclosure and the phone
 * menu, so the three cannot drift apart — and so they match the category chips,
 * which show the very same icons.
 *
 * `icon` arrives ALREADY RESOLVED to a full URL. The layout resolves it on the
 * server, which keeps storage configuration out of these client components.
 *
 * A plain <img>, not next/image, for the same reason as the chips: the
 * optimizer refuses SVG unless `dangerouslyAllowSVG` is enabled, and an SVG
 * gains nothing from resizing. alt="" because the label beside it already names
 * the category; announcing it twice is noise.
 *
 * NO filter or opacity on the image. The icons are gradient tiles that carry
 * their own background, so they read on white and on the emerald hover alike.
 */
export default function MenuItemIcon({
  icon,
  dotClassName = 'h-1.5 w-1.5 opacity-40',
}: {
  icon?: string | null
  /** Size and opacity of the fallback dot — each menu had its own. */
  dotClassName?: string
}) {
  if (icon) {
    return <img src={icon} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0" aria-hidden />
  }

  // bg-current, so the dot follows the label's colour on hover without a
  // group variant — those have repeatedly failed to generate on this project.
  return <span aria-hidden className={`shrink-0 rounded-full bg-current ${dotClassName}`} />
}
