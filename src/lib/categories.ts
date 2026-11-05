/**
 * "<name> Casinos", unless the name already says it.
 *
 * Category names are admin data, and some already end in the word — "Online
 * Casinos", "New Casinos" — which came out as "Online Casinos Casinos" in the
 * <title>, the <h1>, the meta description and the JSON-LD alike.
 */
export function casinosHeading(name: string): string {
  return /\bcasinos?$/i.test(name.trim()) ? name.trim() : `${name.trim()} Casinos`
}
