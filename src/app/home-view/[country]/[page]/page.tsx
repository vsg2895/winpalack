import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import HomeView, { homeMetadata } from '@/app/_home/HomeView'
import { parseHomeView } from '@/lib/seo/homeView'

/*
 * The home page's filtered and paginated views — `/?page=N`, `/?country=X` —
 * which the proxy REWRITES here (lib/seo/homeView.ts). The browser never sees
 * this path, and a direct request for it is 301'd back to `/?…` by the proxy.
 *
 * ISR through an empty generateStaticParams, as the detail routes (O1): each
 * view renders on its first request and is then served from cache. Reading
 * `searchParams`, `cookies()` or `headers()` here would make it dynamic again.
 */
type Props = { params: Promise<{ country: string; page: string }> }

export function generateStaticParams(): Array<{ country: string; page: string }> {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, page } = await params
  const view = parseHomeView(country, page)

  return view ? homeMetadata(view.page) : {}
}

export default async function HomeViewPage({ params }: Props) {
  const { country, page } = await params
  const view = parseHomeView(country, page)

  if (!view) notFound()

  return <HomeView country={view.country} page={view.page} />
}
