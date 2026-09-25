import { useEffect, useState } from 'react'
import type React from 'react'
import {
  Building2,
  CreditCard,
  FileSpreadsheet,
  Home,
  Package,
  ShoppingBag,
  Sparkles,
  UserRound,
  ClipboardList,
  LogOut,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import AdminWorkspace from './AdminWorkspace'
import { DEFAULT_HOME } from './HomePage'

type AdminTool =
  | 'home'
  | 'schools'
  | 'products'
  | 'packages'
  | 'orders'
  | 'payments'
  | 'inventory'
  | 'students'
  | 'reports'
  | 'coupons'

const ADMIN_NAV: Array<{
  key: AdminTool
  label: string
  icon: React.ComponentType<{ size?: number }>
}> = [
  { key: 'home', label: 'Homepage', icon: Home },
  { key: 'schools', label: 'Schools & Branches', icon: Building2 },
  { key: 'products', label: 'Products & Variants', icon: ShoppingBag },
  { key: 'packages', label: 'Uniform Packages', icon: Package },
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'inventory', label: 'Inventory', icon: ClipboardList },
  { key: 'students', label: 'Parents & Students', icon: UserRound },
  { key: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { key: 'coupons', label: 'Coupons', icon: Sparkles },
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

function AdminPortal({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [admin, setAdmin] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('')
  const [tool, setTool] = useState<AdminTool>('packages')
  const adminPathForTool = (value: AdminTool) => {
    const paths: Record<AdminTool, string> = {
      home: '/admin/homepage',
      schools: '/admin/schools',
      products: '/admin/products',
      packages: '/admin/uniform-packages',
      orders: '/admin/orders',
      payments: '/admin/payments',
      inventory: '/admin/inventory',
      students: '/admin/parents-students',
      reports: '/admin/reports',
      coupons: '/admin/coupons',
    }
    return paths[value]
  }

  const adminToolFromPath = (path: string): AdminTool => {
    if (path === '/admin/homepage') return 'home'
    if (path === '/admin/schools') return 'schools'
    if (path === '/admin/products') return 'products'
    if (path === '/admin/orders') return 'orders'
    if (path === '/admin/payments') return 'payments'
    if (path === '/admin/inventory') return 'inventory'
    if (path === '/admin/parents-students') return 'students'
    if (path === '/admin/reports') return 'reports'
    if (path === '/admin/coupons') return 'coupons'
    return 'packages'
  }

  useEffect(() => {
    const syncAdminRoute = () => {
      if (!window.location.pathname.startsWith('/admin')) {
        onBack()
        return
      }
      const nextTool = adminToolFromPath(window.location.pathname)
      setTool(nextTool)
      if (window.location.pathname === '/admin') return
      const canonicalPath = adminPathForTool(nextTool)
      window.history.replaceState({ schoolUniformApp: 'admin', tool: nextTool }, '', canonicalPath)
    }

    syncAdminRoute()
    window.addEventListener('popstate', syncAdminRoute)
    return () => window.removeEventListener('popstate', syncAdminRoute)
  }, [onBack])

  useEffect(() => {
    if (!window.location.pathname.startsWith('/admin')) return
    const canonicalPath = adminPathForTool(tool)
    if (window.location.pathname === '/admin' && tool === 'packages') return
    if (window.location.pathname === canonicalPath) return
    window.history.pushState({ schoolUniformApp: 'admin', tool }, '', canonicalPath)
  }, [tool])
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
    window.history.replaceState({ schoolUniformApp: 'admin', tool: 'packages' }, '', '/admin')
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
    window.history.replaceState({}, '', '/admin')
    setTool('packages')
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
          <p>Manage schools, students, catalogs and orders from the secure admin portal.</p>
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
  if (
    tool === 'schools' ||
    tool === 'products' ||
    tool === 'packages' ||
    tool === 'orders' ||
    tool === 'payments' ||
    tool === 'inventory' ||
    tool === 'students' ||
    tool === 'reports' ||
    tool === 'coupons'
  )
    return (
      <AdminLayout tool={tool} onNavigate={setTool} onLogout={logoutAdmin}>
        <AdminWorkspace module={tool} onBack={() => setTool('packages')} />
      </AdminLayout>
    )
  return (
    <AdminLayout tool={tool} onNavigate={setTool} onLogout={logoutAdmin}>
      <AdminWorkspace module="packages" onBack={() => setTool('packages')} />
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

function HomepageEditor({ onBack }: { onBack: () => void }) {
  const [content, setContent] = useState<any>(DEFAULT_HOME),
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
  return (
    <div className="admin-shell">
      <div className="admin-content">
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

        <section className="home-edit-section ">
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
          {content.hero.slides.map((x: any, i: number) => (
            <div className="home-edit-card" key={i}>
              <div className="cms-item-heading">
                <h3>Slide {i + 1}</h3>
                <CmsToggle
                  enabled={x.enabled}
                  onChange={(v) => edit((c) => (c.hero.slides[i].enabled = v))}
                  label={x.enabled === false ? 'Disabled' : 'Enabled'}
                />
              </div>
              <label>
                Eyebrow
                <input
                  value={x.eyebrow || ''}
                  onChange={(e) => edit((c) => (c.hero.slides[i].eyebrow = e.target.value))}
                />
              </label>
              <label>
                Title line 1
                <input
                  value={x.title?.[0] || ''}
                  onChange={(e) => edit((c) => (c.hero.slides[i].title[0] = e.target.value))}
                />
              </label>
              <label>
                Title line 2
                <input
                  value={x.title?.[1] || ''}
                  onChange={(e) => edit((c) => (c.hero.slides[i].title[1] = e.target.value))}
                />
              </label>
              <label>
                Title line 3
                <input
                  value={x.title?.[2] || ''}
                  onChange={(e) => edit((c) => (c.hero.slides[i].title[2] = e.target.value))}
                />
              </label>
              <label>
                Description
                <textarea
                  value={x.text || ''}
                  onChange={(e) => edit((c) => (c.hero.slides[i].text = e.target.value))}
                />
              </label>
              <label>
                Image URL
                <input
                  value={x.image || ''}
                  onChange={(e) => edit((c) => (c.hero.slides[i].image = e.target.value))}
                />
              </label>
              <label>
                Primary button
                <input
                  value={x.button || ''}
                  onChange={(e) => edit((c) => (c.hero.slides[i].button = e.target.value))}
                />
              </label>
              <label>
                Secondary button
                <input
                  value={x.secondary || ''}
                  onChange={(e) => edit((c) => (c.hero.slides[i].secondary = e.target.value))}
                />
              </label>
            </div>
          ))}
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
          {['tagline', 'copyright', 'credit', 'secondary'].map((k: string) => (
            <label key={k}>
              {k}
              <input
                value={content.footer?.[k] || ''}
                onChange={(e) => edit((c) => (c.footer[k] = e.target.value))}
              />
            </label>
          ))}
        </section>
      </div>
    </div>
  )
}

export default AdminPortal
