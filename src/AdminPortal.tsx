import { lazy, Suspense, useEffect, useState } from 'react'
import type React from 'react'
import {
  Building2,
  FileSpreadsheet,
  Home,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingBag,
  Sparkles,
  MessageCircle,
  UserRound,
  ClipboardList,
  LogOut,
  Settings,
  Mail,
  Upload,
  Images,
  Trash2,
} from 'lucide-react'
import { supabase } from './lib/supabase'
const AdminWorkspace = lazy(() => import('./AdminWorkspace'))
import { DEFAULT_HOME } from './HomePage'
const SupportChatAdmin = lazy(() => import('./SupportChatAdmin'))
const EmailTemplates = lazy(() => import('./EmailTemplates'))

type AdminTool =
  | 'home'
  | 'branches'
  | 'products'
  | 'packages'
  | 'orders'
  | 'inventory'
  | 'students'
  | 'reports'
  | 'coupons'
  | 'support'
  | 'settings'
  | 'email-templates'
  | 'media'

const ADMIN_NAV: Array<{
  key: AdminTool
  label: string
  icon: React.ComponentType<{ size?: number }>
}> = [
  { key: 'home', label: 'Homepage', icon: Home },
  { key: 'branches', label: 'Branches', icon: Building2 },
  { key: 'products', label: 'Products & Variants', icon: ShoppingBag },
  { key: 'packages', label: 'Uniform Packages', icon: Package },
  { key: 'orders', label: 'Orders & Payments', icon: ClipboardList },
  { key: 'inventory', label: 'Inventory', icon: ClipboardList },
  { key: 'students', label: 'Parents & Students', icon: UserRound },
  { key: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { key: 'coupons', label: 'Coupons', icon: Sparkles },
  { key: 'support', label: 'Support Chat', icon: MessageCircle },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'email-templates', label: 'Email Templates', icon: Mail },
  { key: 'media', label: 'Media Library', icon: Images },
]

function AdminSidebar({
  tool,
  onNavigate,
  onLogout,
}: {
  tool: AdminTool
  onNavigate: (tool: AdminTool) => void
  onLogout: () => void
}) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <img src="/logo.png" alt="School Uniforms" />
        {/* <div>
          <strong>School Uniforms</strong>
          <span>ADMIN PORTAL</span>
        </div> */}
      </div>
      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        {ADMIN_NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={tool === key ? 'active' : ''}
            onClick={() => onNavigate(key)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button type="button" className="admin-sidebar-logout" onClick={onLogout}>
        <LogOut size={17} />
        <span>Logout</span>
      </button>
    </aside>
  )
}

function AdminLayout({
  tool,
  onNavigate,
  onLogout,
  children,
}: {
  tool: AdminTool
  onNavigate: (tool: AdminTool) => void
  onLogout: () => void
  children: React.ReactNode
}) {
  return (
    <div className="admin-portal-layout">
      <AdminSidebar tool={tool} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="admin-portal-main">{children}</main>
    </div>
  )
}

function MediaLibrary() {
  type MediaItem = { path: string; folder: 'products' | 'packages'; url: string }

  const [folder, setFolder] = useState<'all' | 'products' | 'packages'>('all')
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState('')
  const [error, setError] = useState('')

  const loadMedia = async () => {
    if (!supabase) return
    setLoading(true)
    setError('')
    const storage = supabase.storage
    const folders: Array<'products' | 'packages'> = ['products', 'packages']
    const all: MediaItem[] = []

    for (const currentFolder of folders) {
      const result = await storage.from('package-images').list(currentFolder, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (result.error) {
        setError(result.error.message)
        continue
      }
      for (const file of result.data ?? []) {
        if (!file.name) continue
        const path = `${currentFolder}/${file.name}`
        all.push({
          path,
          folder: currentFolder,
          url: storage.from('package-images').getPublicUrl(path).data.publicUrl,
        })
      }
    }

    setItems(all)
    setLoading(false)
  }

  useEffect(() => {
    void loadMedia()
  }, [])

  const deleteImage = async (item: MediaItem) => {
    if (!supabase) return
    const confirmed = window.confirm(
      `Delete this image permanently?\\n\\n${item.path}\\n\\nIf this image is currently used by a product or package, that record will keep the old URL until you replace it.`,
    )
    if (!confirmed) return

    setDeleting(item.path)
    setError('')
    const result = await supabase.storage.from('package-images').remove([item.path])
    if (result.error) {
      setError(result.error.message)
    } else {
      setItems((current) => current.filter((image) => image.path !== item.path))
    }
    setDeleting('')
  }

  const visible = folder === 'all' ? items : items.filter((item) => item.folder === folder)

  return (
    <div className="workspace-body media-library-page">
      <div className="workspace-heading">
        <div>
          <h1>Media Library</h1>
          <p>Upload, review and permanently delete product and package images.</p>
        </div>
        <button className="secondary-button" onClick={() => void loadMedia()} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="media-library-toolbar">
        {(['all', 'products', 'packages'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={folder === value ? 'active' : ''}
            onClick={() => setFolder(value)}
          >
            {value === 'all' ? 'All Images' : value === 'products' ? 'Products' : 'Packages'}
          </button>
        ))}
        <span>
          {visible.length} image{visible.length === 1 ? '' : 's'}
        </span>
      </div>

      {error ? <div className="workspace-image-error">{error}</div> : null}

      {loading ? (
        <div className="workspace-empty">Loading media...</div>
      ) : visible.length ? (
        <div className="media-library-grid">
          {visible.map((item) => (
            <div className="media-library-card" key={item.path}>
              <div className="media-library-preview">
                <img src={item.url} alt="" />
              </div>
              <div className="media-library-card-info">
                <span title={item.path}>{item.path}</span>
                <button
                  type="button"
                  className="media-library-delete"
                  onClick={() => void deleteImage(item)}
                  disabled={deleting === item.path}
                  aria-label={`Delete ${item.path}`}
                >
                  <Trash2 size={15} />
                  {deleting === item.path ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="workspace-empty">No images found.</div>
      )}
    </div>
  )
}

function AdminPortal({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [admin, setAdmin] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('')
  const [tool, setTool] = useState<AdminTool>('home')
  const [productSlug, setProductSlug] = useState<string | null>(null)
  const [packageSlug, setPackageSlug] = useState<string | null>(null)
  const adminPathForTool = (value: AdminTool) => {
    const paths: Record<AdminTool, string> = {
      home: '/admin/homepage',
      branches: '/admin/branches',
      products: '/admin/products',
      packages: '/admin/uniform-packages',
      orders: '/admin/orders',
      inventory: '/admin/inventory',
      students: '/admin/parents-students',
      reports: '/admin/reports',
      coupons: '/admin/coupons',
      support: '/admin/support',
      settings: '/admin/settings',
      'email-templates': '/admin/email-templates',
      media: '/admin/media',
    }
    return paths[value]
  }

  const adminToolFromPath = (path: string): AdminTool => {
    if (path === '/admin/homepage') return 'home'
    if (path === '/admin/branches' || path === '/admin/schools') return 'branches'
    if (path === '/admin/products' || path.startsWith('/admin/products/edit/')) return 'products'
    if (path === '/admin/uniform-packages' || path.startsWith('/admin/uniform-packages/edit/'))
      return 'packages'
    if (path === '/admin/orders' || path === '/admin/payments') return 'orders'
    if (path === '/admin/inventory') return 'inventory'
    if (path === '/admin/parents-students') return 'students'
    if (path === '/admin/reports') return 'reports'
    if (path === '/admin/coupons') return 'coupons'
    if (path === '/admin/support') return 'support'
    if (path === '/admin/settings') return 'settings'
    if (path === '/admin/email-templates') return 'email-templates'
    if (path === '/admin/media') return 'media'
    return 'home'
  }

  useEffect(() => {
    const syncAdminRoute = () => {
      if (!window.location.pathname.startsWith('/admin')) {
        onBack()
        return
      }
      const nextTool = adminToolFromPath(window.location.pathname)
      const productMatch = window.location.pathname.match(/^\/admin\/products\/edit\/([^/]+)$/)
      const packageMatch = window.location.pathname.match(
        /^\/admin\/uniform-packages\/edit\/([^/]+)$/,
      )
      setProductSlug(productMatch ? decodeURIComponent(productMatch[1]) : null)
      setPackageSlug(packageMatch ? decodeURIComponent(packageMatch[1]) : null)
      setTool(nextTool)
      const editMatch = productMatch || packageMatch
      const canonicalPath = editMatch ? window.location.pathname : adminPathForTool(nextTool)
      window.history.replaceState(
        {
          schoolUniformApp: 'admin',
          tool: nextTool,
          productSlug: productMatch?.[1] || null,
          packageSlug: packageMatch?.[1] || null,
        },
        '',
        canonicalPath,
      )
    }

    syncAdminRoute()
    window.addEventListener('popstate', syncAdminRoute)
    return () => window.removeEventListener('popstate', syncAdminRoute)
  }, [onBack])

  useEffect(() => {
    if (!window.location.pathname.startsWith('/admin')) return
    if (tool === 'products' && productSlug) {
      const productPath = `/admin/products/edit/${productSlug}`
      if (window.location.pathname === productPath) return
      window.history.pushState({ schoolUniformApp: 'admin', tool, productSlug }, '', productPath)
      return
    }
    if (tool === 'packages' && packageSlug) {
      const packagePath = `/admin/uniform-packages/edit/${packageSlug}`
      if (window.location.pathname === packagePath) return
      window.history.pushState({ schoolUniformApp: 'admin', tool, packageSlug }, '', packagePath)
      return
    }
    const canonicalPath = adminPathForTool(tool)
    if (window.location.pathname === '/admin' && tool === 'packages') return
    if (window.location.pathname === canonicalPath) return
    window.history.pushState(
      { schoolUniformApp: 'admin', tool, productSlug: null },
      '',
      canonicalPath,
    )
  }, [tool, productSlug])
  async function login() {
    const client = supabase
    if (!client || !email.trim() || !password) return
    setLoading(true)
    setError('')
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error || !data.user) {
      setError('Invalid admin email or password.')
      setLoading(false)
      return
    }
    const { data: p, error: pe } = await client
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()
    if (pe || !p || !['admin', 'super_admin'].includes(p.role)) {
      await client.auth.signOut({ scope: 'local' })
      setError('This account is not authorized for the Admin Portal.')
      setLoading(false)
      return
    }
    window.history.replaceState({ schoolUniformApp: 'admin', tool: 'home' }, '', '/admin/homepage')
    setTool('home')
    setAdmin(true)
    setLoading(false)
  }
  useEffect(() => {
    const client = supabase
    if (!client) return
    void client.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const { data: p } = await client
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .maybeSingle()
      if (p && ['admin', 'super_admin'].includes(p.role)) setAdmin(true)
    })
  }, [])
  const logoutAdmin = async () => {
    if (supabase) await supabase.auth.signOut({ scope: 'local' })
    localStorage.removeItem('school_uniform_admin_context')
    window.history.replaceState({}, '', '/admin/homepage')
    setTool('home')
    setAdmin(false)
    setEmail('')
    setPassword('')
    setError('')
  }

  if (!admin)
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-logo">
            <img src="/logo.png" alt="Artisan" />
          </div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Administrator Sign In</h1>
          <p>Manage branches, students, catalogs and orders from the secure admin portal.</p>
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@gmail.com"
            autoComplete="username"
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void login()
            }}
            autoComplete="current-password"
          />
          {error && <p className="login-error">{error}</p>}
          <button
            className="primary-button"
            onClick={() => void login()}
            disabled={loading || !email || !password}
          >
            {loading ? 'SIGNING IN...' : 'ADMIN LOGIN'}
          </button>
        </div>
      </div>
    )

  if (tool === 'home')
    return (
      <AdminLayout tool={tool} onNavigate={setTool} onLogout={logoutAdmin}>
        <HomepageEditor onBack={() => setTool('packages')} />
      </AdminLayout>
    )
  if (tool === 'support')
    return (
      <AdminLayout tool={tool} onNavigate={setTool} onLogout={logoutAdmin}>
        <Suspense fallback={<div className="workspace-empty">Loading support...</div>}>
          <SupportChatAdmin />
        </Suspense>
      </AdminLayout>
    )
  if (tool === 'settings')
    return (
      <AdminLayout tool={tool} onNavigate={setTool} onLogout={logoutAdmin}>
        <Suspense fallback={<div className="workspace-empty">Loading settings...</div>}>
          <AdminWorkspace module="settings" onBack={() => setTool('packages')} />
        </Suspense>
      </AdminLayout>
    )
  if (tool === 'media')
    return (
      <AdminLayout tool={tool} onNavigate={setTool} onLogout={logoutAdmin}>
        <MediaLibrary />
      </AdminLayout>
    )

  if (tool === 'email-templates')
    return (
      <AdminLayout tool={tool} onNavigate={setTool} onLogout={logoutAdmin}>
        <Suspense fallback={<div className="workspace-empty">Loading email templates...</div>}>
          <EmailTemplates />
        </Suspense>
      </AdminLayout>
    )
  if (
    tool === 'branches' ||
    tool === 'products' ||
    tool === 'packages' ||
    tool === 'orders' ||
    tool === 'inventory' ||
    tool === 'students' ||
    tool === 'reports' ||
    tool === 'coupons'
  )
    return (
      <AdminLayout tool={tool} onNavigate={setTool} onLogout={logoutAdmin}>
        <Suspense fallback={<div className="workspace-empty">Loading admin module...</div>}>
          <AdminWorkspace
            module={tool}
            productSlug={tool === 'products' ? productSlug : null}
            packageSlug={tool === 'packages' ? packageSlug : null}
            onBack={() => {
              setProductSlug(null)
              setPackageSlug(null)
              setTool(tool === 'packages' ? 'packages' : 'products')
            }}
          />
        </Suspense>
      </AdminLayout>
    )
  return (
    <AdminLayout tool={tool} onNavigate={setTool} onLogout={logoutAdmin}>
      <Suspense fallback={<div className="workspace-empty">Loading admin module...</div>}>
        <AdminWorkspace
          module="packages"
          packageSlug={packageSlug}
          onBack={() => {
            setPackageSlug(null)
            setTool('packages')
          }}
        />
      </Suspense>
    </AdminLayout>
  )
}

function CmsToggle({
  enabled,
  onChange,
  label = 'Enabled',
}: {
  enabled?: boolean
  onChange: (value: boolean) => void
  label?: string
}) {
  return (
    <label className="cms-toggle">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled !== false}
        className={enabled !== false ? 'on' : ''}
        onClick={() => onChange(enabled === false)}
      >
        <span />
      </button>
    </label>
  )
}

function CmsSectionHeading({
  title,
  enabled,
  onChange,
}: {
  title: string
  enabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="cms-section-heading">
      <h2>{title}</h2>
      <CmsToggle
        enabled={enabled}
        onChange={onChange}
        label={enabled === false ? 'Disabled' : 'Enabled'}
      />
    </div>
  )
}

function HeroImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    const client = supabase
    if (!client) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller.')
      return
    }
    setUploading(true)
    setError('')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `homepage/hero/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await client.storage.from('site-assets').upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }
    const { data } = client.storage.from('site-assets').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  return (
    <div className="cms-image-upload">
      <div className="cms-image-upload-preview">
        {value ? <img src={value} alt="Hero slide preview" /> : <span>No image selected</span>}
      </div>
      <label className="cms-upload-button">
        <Upload size={15} />
        <span>{uploading ? 'UPLOADING...' : 'UPLOAD IMAGE'}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.currentTarget.value = ''
          }}
          disabled={uploading}
        />
      </label>
      <small>PNG, JPG, WEBP or SVG · Max 5 MB</small>
      {error && <span className="cms-image-upload-error">{error}</span>}
    </div>
  )
}

function HomepageEditor({ onBack }: { onBack: () => void }) {
  const [content, setContent] = useState<any>(DEFAULT_HOME),
    [activeSlide, setActiveSlide] = useState(0),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    const client = supabase
    if (!client) return
    void (client as any)
      .from('homepage_content')
      .select('content')
      .eq('slug', 'default')
      .maybeSingle()
      .then(({ data, error }: { data: any; error: any }) => {
        if (error) setError(error.message)
        else if (data?.content)
          setContent((prev: any) => ({
            ...prev,
            ...data.content,
            sections: { ...prev.sections, ...(data.content.sections || {}) },
          }))
      })
  }, [])
  const save = async () => {
    const client = supabase
    if (!client) return
    setSaving(true)
    setError('')
    setSaved(false)
    const { data: user } = await client.auth.getUser()
    const { data: updated, error: e } = await (client as any)
      .from('homepage_content')
      .update({ content, updated_by: user.user?.id, updated_at: new Date().toISOString() })
      .eq('slug', 'default')
      .select('id,updated_at')
      .maybeSingle()
    if (e) {
      setError(e.message)
    } else if (!updated) {
      setError('Homepage was not updated. Check your admin permissions.')
    } else {
      setSaved(true)
    }
    setSaving(false)
  }
  const edit = (fn: (c: any) => void) =>
    setContent((prev: any) => {
      const n = structuredClone(prev)
      fn(n)
      return n
    })

  useEffect(() => {
    const count = content.hero?.slides?.length || 0
    setActiveSlide((current) => Math.min(current, Math.max(0, count - 1)))
  }, [content.hero?.slides?.length])

  return (
    <div className="admin-shell">
      <div className="admin-content homepage-cms-content">
        <div className="admin-title">
          <div>
            <p className="eyebrow">HOMEPAGE CMS</p>
            <h1>Control the entire public homepage</h1>
            <p>All homepage copy, imagery URLs, ordering and visibility are stored in Supabase.</p>
          </div>
          <button
            className="primary-button cms-save-button"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? 'SAVING...' : 'SAVE HOMEPAGE'}
          </button>
        </div>
        {saved && <p className="form-success">Homepage saved successfully.</p>}
        {error && <p className="login-error">{error}</p>}

        <section className="home-edit-section homepage-slider-settings">
          <CmsSectionHeading
            title="Hero Slider"
            enabled={content.sections?.hero !== false}
            onChange={(v) =>
              edit((c) => {
                c.sections = c.sections || {}
                c.sections.hero = v
              })
            }
          />

          <div className="homepage-slider-tabs">
            <button
              type="button"
              className="homepage-slider-arrow"
              disabled={!content.hero?.slides?.length || activeSlide <= 0}
              onClick={() => setActiveSlide((current) => Math.max(0, current - 1))}
              aria-label="Previous slider"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="homepage-slider-tab-list">
              {(content.hero?.slides || []).map((x: any, i: number) => (
                <button
                  type="button"
                  key={i}
                  className={activeSlide === i ? 'active' : ''}
                  onClick={() => setActiveSlide(i)}
                >
                  <span>Slider {i + 1}</span>
                  <small>{x.enabled === false ? 'Disabled' : 'Enabled'}</small>
                </button>
              ))}

              <button
                type="button"
                className="homepage-slider-add"
                onClick={() => {
                  const slides = content.hero?.slides || []
                  edit((c) => {
                    c.hero = c.hero || {}
                    c.hero.slides = c.hero.slides || []
                    c.hero.slides.push({
                      eyebrow: 'NEW SCHOOL UNIFORMS',
                      title: ['New Slider', 'Headline', 'Goes Here.'],
                      text: 'Add your slider description here.',
                      image: '/hero-slide-1.jpg',
                      button: 'Shop Uniforms',
                      secondary: 'View Packages',
                      enabled: true,
                    })
                  })
                  setActiveSlide(slides.length)
                }}
              >
                <span>+ Add New Slider</span>
              </button>
            </div>

            <button
              type="button"
              className="homepage-slider-arrow"
              disabled={
                !content.hero?.slides?.length ||
                activeSlide >= (content.hero?.slides?.length || 1) - 1
              }
              onClick={() =>
                setActiveSlide((current) =>
                  Math.min((content.hero?.slides?.length || 1) - 1, current + 1),
                )
              }
              aria-label="Next slider"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {content.hero?.slides?.length ? (
            <div className="homepage-slider-editor">
              {(() => {
                const slide = content.hero.slides[activeSlide] || content.hero.slides[0]
                const index = content.hero.slides[activeSlide] ? activeSlide : 0

                return (
                  <div className="home-edit-card homepage-slider-card" key={index}>
                    <div className="cms-item-heading">
                      <div>
                        <h3>Slider {index + 1}</h3>
                        <span className="homepage-slider-status">
                          {slide.enabled === false ? 'Disabled' : 'Enabled'}
                        </span>
                      </div>
                      <div className="homepage-slider-card-actions">
                        <CmsToggle
                          enabled={slide.enabled}
                          onChange={(v) => edit((c) => (c.hero.slides[index].enabled = v))}
                          label={slide.enabled === false ? 'Disabled' : 'Enabled'}
                        />
                        {content.hero.slides.length > 1 && (
                          <button
                            type="button"
                            className="homepage-slider-delete"
                            onClick={() => {
                              const confirmed = window.confirm(
                                `Delete Slider ${index + 1}? This cannot be undone.`,
                              )
                              if (!confirmed) return
                              edit((c) => {
                                c.hero.slides.splice(index, 1)
                              })
                              setActiveSlide((current) =>
                                Math.min(current, Math.max(0, content.hero.slides.length - 2)),
                              )
                            }}
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="cms-field-grid cms-field-grid-2">
                      <label>
                        Eyebrow
                        <input
                          value={slide.eyebrow || ''}
                          onChange={(e) =>
                            edit((c) => (c.hero.slides[index].eyebrow = e.target.value))
                          }
                        />
                      </label>
                      <label>
                        Tag Line 1
                        <input
                          value={slide.title?.[0] || ''}
                          onChange={(e) =>
                            edit((c) => (c.hero.slides[index].title[0] = e.target.value))
                          }
                        />
                      </label>
                    </div>

                    <div className="cms-field-grid cms-field-grid-2">
                      <label>
                        Tag Line 2
                        <input
                          value={slide.title?.[1] || ''}
                          onChange={(e) =>
                            edit((c) => (c.hero.slides[index].title[1] = e.target.value))
                          }
                        />
                      </label>
                      <label>
                        Tag Line 3
                        <input
                          value={slide.title?.[2] || ''}
                          onChange={(e) =>
                            edit((c) => (c.hero.slides[index].title[2] = e.target.value))
                          }
                        />
                      </label>
                    </div>

                    <div className="cms-hero-media-grid">
                      <div className="cms-hero-copy-column">
                        <label className="cms-hero-description">
                          Description
                          <textarea
                            value={slide.text || ''}
                            onChange={(e) =>
                              edit((c) => (c.hero.slides[index].text = e.target.value))
                            }
                          />
                        </label>

                        <div className="cms-field-grid cms-field-grid-2 cms-hero-buttons">
                          <label>
                            Primary Button
                            <input
                              value={slide.button || ''}
                              onChange={(e) =>
                                edit((c) => (c.hero.slides[index].button = e.target.value))
                              }
                            />
                          </label>
                          <label>
                            Secondary Button
                            <input
                              value={slide.secondary || ''}
                              onChange={(e) =>
                                edit((c) => (c.hero.slides[index].secondary = e.target.value))
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="cms-hero-image-field">
                        <span className="cms-field-label">Hero Image</span>
                        <HeroImageUpload
                          value={slide.image || ''}
                          onChange={(url) => edit((c) => (c.hero.slides[index].image = url))}
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="workspace-empty">
              No sliders configured. Click <strong>+ Add New Slider</strong> to create one.
            </div>
          )}
        </section>

        <section className="home-edit-section">
          <CmsSectionHeading
            title="Trust Strip"
            enabled={content.sections?.trust !== false}
            onChange={(v) =>
              edit((c) => {
                c.sections = c.sections || {}
                c.sections.trust = v
              })
            }
          />
          <div className="cms-item-grid cms-item-grid-2">
            {content.trust.items
              ? content.trust.items.map((x: any, i: number) => (
                  <div className="home-edit-row" key={i}>
                    <CmsToggle
                      enabled={x.enabled}
                      onChange={(v) => edit((c) => (c.trust.items[i].enabled = v))}
                    />
                    <label>
                      Title
                      <input
                        value={x.title || ''}
                        onChange={(e) => edit((c) => (c.trust.items[i].title = e.target.value))}
                      />
                    </label>
                    <label>
                      Text
                      <input
                        value={x.text || ''}
                        onChange={(e) => edit((c) => (c.trust.items[i].text = e.target.value))}
                      />
                    </label>
                  </div>
                ))
              : content.trust.map((x: any, i: number) => (
                  <div className="home-edit-row" key={i}>
                    <CmsToggle
                      enabled={x.enabled}
                      onChange={(v) => edit((c) => (c.trust[i].enabled = v))}
                    />
                    <label>
                      Title
                      <input
                        value={x.title || ''}
                        onChange={(e) => edit((c) => (c.trust[i].title = e.target.value))}
                      />
                    </label>
                    <label>
                      Text
                      <input
                        value={x.text || ''}
                        onChange={(e) => edit((c) => (c.trust[i].text = e.target.value))}
                      />
                    </label>
                  </div>
                ))}
          </div>
        </section>

        <section className="home-edit-section">
          <CmsSectionHeading
            title="Shop by Category"
            enabled={content.sections?.categories !== false}
            onChange={(v) =>
              edit((c) => {
                c.sections = c.sections || {}
                c.sections.categories = v
              })
            }
          />
          <div className="cms-item-grid cms-item-grid-2">
            {content.categories.map((x: any, i: number) => (
              <div className="home-edit-row" key={i}>
                <CmsToggle
                  enabled={x.enabled}
                  onChange={(v) => edit((c) => (c.categories[i].enabled = v))}
                />
                <label>
                  Title
                  <input
                    value={x.title || ''}
                    onChange={(e) => edit((c) => (c.categories[i].title = e.target.value))}
                  />
                </label>
                <label>
                  Image URL
                  <input
                    value={x.image || ''}
                    onChange={(e) => edit((c) => (c.categories[i].image = e.target.value))}
                  />
                </label>
                <label>
                  Target
                  <input
                    value={x.target || ''}
                    onChange={(e) => edit((c) => (c.categories[i].target = e.target.value))}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="home-edit-section">
          <CmsSectionHeading
            title="Featured Collections"
            enabled={content.sections?.featured !== false}
            onChange={(v) =>
              edit((c) => {
                c.sections = c.sections || {}
                c.sections.featured = v
              })
            }
          />
          <div className="cms-item-grid cms-item-grid-3">
            {content.featured.map((x: any, i: number) => (
              <div className="home-edit-card" key={i}>
                <div className="cms-item-heading">
                  <h3>Collection {i + 1}</h3>
                  <CmsToggle
                    enabled={x.enabled}
                    onChange={(v) => edit((c) => (c.featured[i].enabled = v))}
                    label={x.enabled === false ? 'Disabled' : 'Enabled'}
                  />
                </div>
                <label>
                  Title
                  <input
                    value={x.title || ''}
                    onChange={(e) => edit((c) => (c.featured[i].title = e.target.value))}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={x.text || ''}
                    onChange={(e) => edit((c) => (c.featured[i].text = e.target.value))}
                  />
                </label>
                <label>
                  Image URL
                  <input
                    value={x.image || ''}
                    onChange={(e) => edit((c) => (c.featured[i].image = e.target.value))}
                  />
                </label>
                <label>
                  Target
                  <input
                    value={x.target || ''}
                    onChange={(e) => edit((c) => (c.featured[i].target = e.target.value))}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="home-edit-section">
          <CmsSectionHeading
            title="After-Fold Feature"
            enabled={content.sections?.afterFold !== false}
            onChange={(v) =>
              edit((c) => {
                c.sections = c.sections || {}
                c.sections.afterFold = v
              })
            }
          />
          <div className="cms-field-grid cms-field-grid-2">
            <label>
              Eyebrow
              <input
                value={content.afterFold?.eyebrow || ''}
                onChange={(e) => edit((c) => (c.afterFold.eyebrow = e.target.value))}
              />
            </label>
            <label>
              Title line 1
              <input
                value={content.afterFold?.title?.[0] || ''}
                onChange={(e) => edit((c) => (c.afterFold.title[0] = e.target.value))}
              />
            </label>
            <label>
              Title line 2
              <input
                value={content.afterFold?.title?.[1] || ''}
                onChange={(e) => edit((c) => (c.afterFold.title[1] = e.target.value))}
              />
            </label>
            <label>
              Text
              <textarea
                value={content.afterFold?.text || ''}
                onChange={(e) => edit((c) => (c.afterFold.text = e.target.value))}
              />
            </label>
            <label>
              Image URL
              <input
                value={content.afterFold?.image || ''}
                onChange={(e) => edit((c) => (c.afterFold.image = e.target.value))}
              />
            </label>
            <label>
              Button
              <input
                value={content.afterFold?.button || ''}
                onChange={(e) => edit((c) => (c.afterFold.button = e.target.value))}
              />
            </label>
          </div>
        </section>

        <section className="home-edit-section">
          <CmsSectionHeading
            title="Benefits Strip"
            enabled={content.sections?.benefits !== false}
            onChange={(v) =>
              edit((c) => {
                c.sections = c.sections || {}
                c.sections.benefits = v
              })
            }
          />
          <div className="cms-item-grid cms-item-grid-2">
            {content.benefits.map((x: any, i: number) => (
              <div className="home-edit-row" key={i}>
                <CmsToggle
                  enabled={x.enabled}
                  onChange={(v) => edit((c) => (c.benefits[i].enabled = v))}
                />
                <label>
                  Title
                  <input
                    value={x.title || ''}
                    onChange={(e) => edit((c) => (c.benefits[i].title = e.target.value))}
                  />
                </label>
                <label>
                  Text
                  <input
                    value={x.text || ''}
                    onChange={(e) => edit((c) => (c.benefits[i].text = e.target.value))}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="home-edit-section">
          <CmsSectionHeading
            title="Call to Action"
            enabled={content.sections?.cta !== false}
            onChange={(v) =>
              edit((c) => {
                c.sections = c.sections || {}
                c.sections.cta = v
              })
            }
          />
          <div className="cms-field-grid cms-field-grid-2">
            <label>
              Eyebrow
              <input
                value={content.cta?.eyebrow || ''}
                onChange={(e) => edit((c) => (c.cta.eyebrow = e.target.value))}
              />
            </label>
            <label>
              Title line 1
              <input
                value={content.cta?.title?.[0] || ''}
                onChange={(e) => edit((c) => (c.cta.title[0] = e.target.value))}
              />
            </label>
            <label>
              Title line 2
              <input
                value={content.cta?.title?.[1] || ''}
                onChange={(e) => edit((c) => (c.cta.title[1] = e.target.value))}
              />
            </label>
            <label>
              Button
              <input
                value={content.cta?.button || ''}
                onChange={(e) => edit((c) => (c.cta.button = e.target.value))}
              />
            </label>
          </div>
        </section>

        <section className="home-edit-section">
          <CmsSectionHeading
            title="Footer"
            enabled={content.sections?.footer !== false}
            onChange={(v) =>
              edit((c) => {
                c.sections = c.sections || {}
                c.sections.footer = v
              })
            }
          />
          <div className="cms-field-grid cms-field-grid-2">
            {['tagline', 'copyright', 'credit', 'secondary'].map((k: string) => (
              <label key={k}>
                {k}
                <input
                  value={content.footer?.[k] || ''}
                  onChange={(e) => edit((c) => (c.footer[k] = e.target.value))}
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminPortal
