import { supabase } from './supabase'

export const DEFAULT_LOGO_URL = '/logo.png'

export type SiteBranding = {
  logoUrl: string
  faviconUrl: string
}

export async function loadSiteBranding(): Promise<SiteBranding> {
  if (!supabase) return { logoUrl: DEFAULT_LOGO_URL, faviconUrl: '' }
  const { data } = await supabase
    .from('site_branding')
    .select('logo_url,favicon_url')
    .eq('id', 1)
    .maybeSingle()
  return {
    logoUrl: data?.logo_url || DEFAULT_LOGO_URL,
    faviconUrl: data?.favicon_url || '',
  }
}

export function applySiteFavicon(url: string) {
  if (!url) return
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url
}
