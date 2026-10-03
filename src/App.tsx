import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import HomePage from './HomePage'
import type { CustomerPage } from './AppPortal'
const AppPortal = lazy(() => import('./AppPortal'))
const AdminPortal = lazy(() => import('./AdminPortal'))
const ChatWidget = lazy(() => import('./ChatWidget'))

type PortalMode = 'home' | 'store' | 'admin'

function App() {
  const [mode, setMode] = useState<PortalMode>('home')
  const [branch, setBranch] = useState(''),
    [studentId, setStudentId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [branchName, setBranchName] = useState('Your Branch')
  const [customerPage, setCustomerPage] = useState<CustomerPage>('dashboard'),
    [sessionRestoring, setSessionRestoring] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setSessionRestoring(false)
      return
    }
    const client = supabase
    let cancelled = false
    async function restore() {
      const path = window.location.pathname
      if (path === '/' || path === '') {
        setMode('home')
        setSessionRestoring(false)
        return
      }
      const { data } = await client.auth.getSession()
      if (cancelled) return
      if (data.session && path.startsWith('/admin')) {
        const { data: profile } = await client
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .maybeSingle()
        if (profile && ['admin', 'super_admin'].includes(profile.role)) {
          setMode('admin')
          setSessionRestoring(false)
          return
        }
      }
      if (data.session && path.startsWith('/app')) {
        const stored = localStorage.getItem('school_uniform_portal_context')
        if (stored) {
          try {
            const ctx = JSON.parse(stored)
            if (ctx?.mode === 'store' && ctx.branch) {
              setBranch(ctx.branch)
              setStudentId(ctx.studentId || '')
              setBranchName(ctx.branchName || 'Your Branch')

              // Restore the parent display name from the authenticated profile
              // on hard refresh instead of relying on the login ID in context.
              const { data: profile } = await client
                .from('profiles')
                .select('full_name,login_id')
                .eq('id', data.session.user.id)
                .maybeSingle()
              const restoredName =
                profile?.full_name ||
                data.session.user.user_metadata?.full_name ||
                profile?.login_id ||
                ctx.studentId ||
                ''
              setCustomerName(restoredName)
              const page =
                path === '/app/packages'
                  ? 'packages'
                  : path === '/app/products'
                    ? 'products'
                    : path === '/app/orders'
                      ? 'orders'
                      : path === '/app/profile'
                        ? 'profile'
                        : 'dashboard'
              setCustomerPage(page)
              void import('./AppPortal')
              setMode('store')
              setSessionRestoring(false)
              return
            }
          } catch {
            localStorage.removeItem('school_uniform_portal_context')
          }
        }
      }
      if (path !== '/') window.history.replaceState({}, '', '/')
      setMode('home')
      setSessionRestoring(false)
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  if (sessionRestoring)
    return (
      <div className="session-loading">
        <img src="/logo.png" alt="Artisan" />
        <span>Restoring your session...</span>
      </div>
    )
  if (mode === 'store')
    return (
      <Suspense
        fallback={
          <div className="session-loading">
            <span>Loading...</span>
          </div>
        }
      >
        <>
          <AppPortal
            branchName={branchName}
            branchId={branch}
            studentId={studentId}
            customerName={customerName}
            page={customerPage}
            setPage={setCustomerPage}
            onLogout={() => {
              void supabase?.auth.signOut({ scope: 'local' })
              localStorage.removeItem('school_uniform_portal_context')
              window.history.replaceState({}, '', '/')
              setMode('home')
            }}
          />
          <ChatWidget branchId={branch} studentId={studentId} />
        </>
      </Suspense>
    )
  if (mode === 'admin')
    return (
      <Suspense
        fallback={
          <div className="session-loading">
            <span>Loading...</span>
          </div>
        }
      >
        <AdminPortal
          onBack={() => {
            window.history.replaceState({}, '', '/')
            setMode('home')
          }}
        />
      </Suspense>
    )
  return (
    <>
      <HomePage
        onLoginSuccess={(b, id, bn) => {
          setBranch(b)
          setStudentId(id)
          setBranchName(bn)
          setCustomerPage('dashboard')
          void import('./AppPortal')
          window.history.pushState(
            { schoolUniformApp: 'customer', screen: 'page:dashboard', page: 'dashboard' },
            '',
            '/app',
          )
          setMode('store')
        }}
        onAdmin={() => {
          void import('./AdminPortal')
          setMode('admin')
        }}
      />
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </>
  )
}

export default App
