import { useEffect, useState } from 'react'
import { Image, Save, Upload } from 'lucide-react'
import { supabase } from './lib/supabase'

const DEFAULT_LOGO = '/logo.png'

export default function SiteBrandingSettings() {
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO)
  const [faviconUrl, setFaviconUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    if (!supabase) return
    setLoading(true)
    const { data, error: e } = await supabase
      .from('site_branding')
      .select('logo_url,favicon_url')
      .eq('id', 1)
      .maybeSingle()
    if (e) setError(e.message)
    else {
      setLogoUrl(data?.logo_url || DEFAULT_LOGO)
      setFaviconUrl(data?.favicon_url || '')
    }
    setLoading(false)
  }

  async function upload(file: File, name: string) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = name + '-' + Date.now() + '.' + ext
    const { error: e } = await supabase.storage.from('site-assets').upload(path, file, {
      upsert: true,
      cacheControl: '31536000',
      contentType: file.type,
    })
    if (e) throw e
    const { data } = supabase.storage.from('site-assets').getPublicUrl(path)
    return data.publicUrl
  }

  async function save() {
    if (!supabase) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      let nextLogo = logoUrl
      let nextFavicon = faviconUrl
      if (logoFile) nextLogo = await upload(logoFile, 'logo')
      if (faviconFile) nextFavicon = await upload(faviconFile, 'favicon')
      const { error: e } = await supabase.from('site_branding').upsert({
        id: 1,
        logo_url: nextLogo || null,
        favicon_url: nextFavicon || null,
        updated_at: new Date().toISOString(),
      })
      if (e) throw e
      setLogoUrl(nextLogo || DEFAULT_LOGO)
      setFaviconUrl(nextFavicon || '')
      setLogoFile(null)
      setFaviconFile(null)
      window.dispatchEvent(
        new CustomEvent('site-branding:updated', {
          detail: { logoUrl: nextLogo, faviconUrl: nextFavicon },
        }),
      )
      applyFavicon(nextFavicon)
      setMessage('Logo and favicon settings saved successfully.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save branding.')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <section className="workspace-panel">
        <div className="workspace-empty">Loading branding settings...</div>
      </section>
    )

  return (
    <section className="workspace-panel">
      <div className="panel-heading">
        <div>
          <h2>Logo & Favicon</h2>
          <p className="workspace-muted">
            Upload the logo and browser favicon used across the website.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 20 }}>
        <BrandCard
          title="Website Logo"
          description="Used in the public header, customer portal and admin header/footer."
          preview={logoUrl}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          file={logoFile}
          onFile={setLogoFile}
        />
        <BrandCard
          title="Favicon"
          description="Used in the browser tab. PNG, ICO or SVG recommended."
          preview={faviconUrl}
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
          file={faviconFile}
          onFile={setFaviconFile}
          compact
        />
      </div>

      {message && (
        <div className="workspace-note" style={{ marginTop: 16 }}>
          {message}
        </div>
      )}
      {error && (
        <div className="workspace-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button className="primary-button" disabled={saving} onClick={() => void save()}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>
    </section>
  )
}

function BrandCard({
  title,
  description,
  preview,
  accept,
  file,
  onFile,
  compact = false,
}: {
  title: string
  description: string
  preview: string
  accept: string
  file: File | null
  onFile: (file: File | null) => void
  compact?: boolean
}) {
  return (
    <div
      style={{ border: '1px solid #e4dfd6', borderRadius: 12, padding: 18, background: '#faf9f6' }}
    >
      <div style={{ fontWeight: 800, fontSize: 14 }}>{title}</div>
      <p className="workspace-muted" style={{ fontSize: 12, minHeight: 34 }}>
        {description}
      </p>
      <div
        style={{
          height: compact ? 130 : 150,
          display: 'grid',
          placeItems: 'center',
          background: '#fff',
          border: '1px solid #e4dfd6',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 12,
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt={title}
            style={{ maxWidth: '80%', maxHeight: compact ? 90 : 105, objectFit: 'contain' }}
          />
        ) : (
          <Image size={28} />
        )}
      </div>
      <label
        className="secondary-button"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
      >
        <Upload size={15} /> {file ? 'Change File' : 'Choose File'}
        <input
          hidden
          type="file"
          accept={accept}
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </label>
      {file && (
        <div style={{ fontSize: 11, color: '#6d7780', marginTop: 8, wordBreak: 'break-word' }}>
          {file.name}
        </div>
      )}
    </div>
  )
}

function applyFavicon(url: string) {
  if (!url) return
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url
}
