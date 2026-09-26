import { useEffect, useState, type ReactNode } from 'react'
import { loadSiteBranding, applySiteFavicon, DEFAULT_LOGO_URL } from '../lib/branding'
import {
  ArrowLeft,
  LogOut,
  ShoppingCart,
  Home,
  Package,
  ShoppingBag,
  ClipboardList,
  UserRound,
} from 'lucide-react'

type GlobalHeaderProps = {
  portal: 'customer' | 'admin'
  title: string
  subtitle?: string
  onBack?: () => void
  backLabel?: string
  onLogout?: () => void
  cartCount?: number
  onCart?: () => void
  schoolName?: string
  branchName?: string
  userLabel?: string
}

export function GlobalHeader({
  portal,
  title,
  subtitle,
  onBack,
  backLabel,
  onLogout,
  cartCount = 0,
  onCart,
  schoolName,
  branchName,
  userLabel,
}: GlobalHeaderProps) {
  const [logo, setLogo] = useState(DEFAULT_LOGO_URL)
  useEffect(() => {
    const load = () => { void loadSiteBranding().then((branding) => { setLogo(branding.logoUrl); applySiteFavicon(branding.faviconUrl) }) }
    load()
    const onUpdate = (event: Event) => { const detail = (event as CustomEvent<{logoUrl?: string; faviconUrl?: string}>).detail; if (detail?.logoUrl) setLogo(detail.logoUrl); if (detail?.faviconUrl) applySiteFavicon(detail.faviconUrl) }
    window.addEventListener('site-branding:updated', onUpdate)
    return () => window.removeEventListener('site-branding:updated', onUpdate)
  }, [])
  return (
    <header className={`global-header global-header-${portal}`}>
      <div className="global-header-inner">
        <div className="global-brand">
          <img src={logo} alt="Artisan" />
          {portal === 'admin' && (
            <div>
              <strong>{title}</strong>
              {subtitle && <span>{subtitle}</span>}
            </div>
          )}
        </div>
        <div className="global-header-actions">
          {onCart && (
            <button className="global-button global-button-light" onClick={onCart}>
              <ShoppingCart size={16} /> Cart{cartCount > 0 && <b>{cartCount}</b>}
            </button>
          )}
          {portal === 'admin' && onBack && (
            <button className="global-button" onClick={onBack}>
              <ArrowLeft size={16} /> {backLabel || 'Back to Dashboard'}
            </button>
          )}
          {portal === 'admin' && onLogout && (
            <button className="global-button global-button-outline" onClick={onLogout}>
              <LogOut size={16} /> Logout
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export function GlobalFooter({ portal = 'customer' }: { portal?: 'customer' | 'admin' }) {
  const [logo, setLogo] = useState(DEFAULT_LOGO_URL)
  useEffect(() => { void loadSiteBranding().then((branding) => setLogo(branding.logoUrl)) }, [])
  return (
    <footer className={`global-footer global-footer-${portal}`}>
      <div className="global-footer-inner">
        <div>
          <img src={logo} alt="Artisan" />
          <p>School uniforms, made simple.</p>
        </div>
        <div className="global-footer-meta">
          <span>© 2026 Artisan. All rights reserved.</span>
          <span>Developed by Dexorzo Creations.</span>
          <span>School-specific shopping • Secure access</span>
        </div>
      </div>
    </footer>
  )
}

export function CustomerPageFrame({
  title,
  subtitle,
  onBack,
  onLogout,
  cartCount,
  onCart,
  schoolName,
  branchName,
  userLabel,
  children,
}: {
  title: string
  subtitle?: string
  onBack: () => void
  onLogout: () => void
  cartCount: number
  onCart: () => void
  schoolName: string
  branchName: string
  userLabel: string
  children: ReactNode
}) {
  const nav = [
    ['dashboard', 'Dashboard', Home],
    ['packages', 'Uniform Packages', Package],
    ['products', 'Individual Products', ShoppingBag],
    ['orders', 'My Orders', ClipboardList],
    ['profile', 'Profile', UserRound],
  ] as const

  return (
    <div className="portal">
      <GlobalHeader
        portal="customer"
        title=""
        subtitle={subtitle}
        onLogout={onLogout}
        cartCount={cartCount}
        onCart={onCart}
        schoolName={schoolName}
        branchName={branchName}
        userLabel={userLabel}
      />
      <div className="portal-layout">
        <aside className="sidebar">
          <nav>
            {nav.map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => {
                  if (key === 'dashboard') window.location.href = '/app'
                  else window.location.href = '/app/' + key
                }}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
          <button className="sidebar-logout" onClick={onLogout}>
            <LogOut size={17} /> Logout
          </button>
        </aside>
        <main className="portal-main">
          <div className="portal-header checkout-portal-header">
            <div>
              <p className="eyebrow">
                {schoolName} — {branchName}
              </p>
              <h1>{title}</h1>
            </div>
            <div className="header-user">
              <div className="avatar">{(userLabel || 'U').slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{userLabel || 'Parent / Student'}</strong>
                <span>Parent / Student</span>
              </div>
            </div>
          </div>
          <div className="customer-page-frame-content">{children}</div>
        </main>
      </div>
    </div>
  )
}
