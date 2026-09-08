// Casino-listing facets. Which are offered and in what order is admin-editable
// (facet_configs); the facet KEYS are code, because each needs a query behind it.
//
// A facet with no values is NEVER returned, regardless of configuration. That is
// what stops the site rendering a filter where every choice returns nothing —
// so licence, payment method and provider appear on their own as the operator
// profiles get populated, with no switch to flip later.

export type FacetKey = 'category' | 'country' | 'licence' | 'payment_method' | 'provider'

export interface FacetValue {
  /** What goes in the query string. */
  value: string
  label: string
  /** Casinos on this site matching it — never 0, or the value would be omitted. */
  count: number
}

export interface Facet {
  facet: FacetKey
  /** Site override, falling back to the built-in wording. */
  label: string
  values: FacetValue[]
}
