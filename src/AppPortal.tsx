import { useEffect, useState } from 'react'
import type React from 'react'
import {
  ArrowRight,
  Building2,
  Heart,
  Ban,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  ShieldCheck,
  Truck,
  ChevronLeft,
  LogOut,
  ClipboardList,
  Home,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  Save,
  KeyRound,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import CheckoutFlow, { type CheckoutCartItem } from './CheckoutFlow'
import { CustomerPageFrame, GlobalHeader } from './components/GlobalChrome'
import ProductReviews from './ProductReviews'

export type CustomerPage = 'dashboard' | 'packages' | 'products' | 'orders' | 'profile'
type CartItem = CheckoutCartItem & {
  productType?: string
  occasionType?: string
  gender?: string
  material?: string
  brand?: string
  quality?: string
  fabric?: string
  care?: string
  deliveryReturns?: string
  codAvailable?: boolean
  customOrderCod?: boolean
  easyReturns?: boolean
  expressShipping?: boolean
  imageGallery?: string[]
}
type CheckoutStep = 'cart' | 'details' | 'payment' | 'success'

function CustomerPortal({
  schoolId,
  schoolName,
  branchName,
  branchId,
  studentId,
  page,
  setPage,
  onLogout,
}: {
  schoolId: string
  schoolName: string
  branchName: string
  branchId: string
  studentId: string
  page: CustomerPage
  setPage: (p: CustomerPage) => void
  onLogout: () => void
}) {
  const [cart, setCart] = useState<CartItem[]>([]),
    [cartOpen, setCartOpen] = useState(false),
    [checkout, setCheckout] = useState<CheckoutStep | null>(null),
    [selected, setSelected] = useState<CartItem | null>(null),
    [students, setStudents] = useState<any[]>([])
  const screen = checkout ? 'checkout:' + checkout : selected ? 'detail' : 'page:' + page
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const state = event.state
      if (state?.schoolUniformApp === 'customer') {
        setPage(state.page || 'dashboard')
        setCheckout(state.checkout || null)
        if (state.screen !== 'detail') setSelected(null)
        return
      }
      setSelected(null)
      setCheckout(null)
      setPage('dashboard')
      window.history.replaceState(
        { schoolUniformApp: 'customer', screen: 'page:dashboard', page: 'dashboard' },
        '',
        '/app',
      )
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [setPage])
  useEffect(() => {
    const client = supabase as any
    if (!client || !branchId) return
    let cancelled = false

    async function loadLinkedStudents() {
      const { data: auth } = await client.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) {
        if (!cancelled) setStudents([])
        return
      }

      // Load the students actually linked to this Parent / Student account.
      // Do not rely only on school/branch filtering because checkout requires
      // the student's UUID, while the login ID is a separate value.
      const { data: links, error: linksError } = await client
        .from('parent_student_links')
        .select('student_id,is_primary')
        .eq('parent_user_id', userId)
        .order('is_primary', { ascending: false })

      if (linksError) {
        if (!cancelled) setStudents([])
        return
      }

      const linkedIds = (links ?? []).map((x: any) => x.student_id).filter(Boolean)
      if (!linkedIds.length) {
        // Fallback for a student account / legacy login where the login ID
        // itself identifies the student.
        const { data: byCode } = await client
          .from('students')
          .select('id,student_code,full_name,class_name,section,school_id,branch_id,status')
          .eq('school_id', schoolId)
          .eq('branch_id', branchId)
          .eq('student_code', studentId)
          .eq('status', 'active')
          .maybeSingle()
        if (!cancelled) setStudents(byCode ? [byCode] : [])
        return
      }

      const { data: linkedStudents } = await client
        .from('students')
        .select('id,student_code,full_name,class_name,section,school_id,branch_id,status')
        .in('id', linkedIds)
        .eq('status', 'active')
        .order('full_name')

      // The parent link is the source of truth for customer access. Do not
      // discard a valid linked student just because the portal context was
      // restored with a stale/different school or branch value. Checkout will
      // validate the selected student's school/branch before placing an order.
      if (!cancelled) setStudents(linkedStudents ?? [])
    }

    void loadLinkedStudents()
    return () => {
      cancelled = true
    }
  }, [schoolId, branchId, studentId])
  const add = (item: CartItem) => {
    setCart((items) => {
      const cartKey = item.id + '|' + JSON.stringify(item.selectedVariants || [])
      const normalized = { ...item, id: cartKey }
      const f = items.find((x) => x.id === cartKey)
      return f
        ? items.map((x) => (x.id === cartKey ? { ...x, quantity: x.quantity + item.quantity } : x))
        : [...items, normalized]
    })
    setCartOpen(true)
  }
  const update = (id: string, d: number) =>
    setCart((items) =>
      items.map((x) => (x.id === id ? { ...x, quantity: Math.max(1, x.quantity + d) } : x)),
    )
  const remove = (id: string) => setCart((items) => items.filter((x) => x.id !== id))
  const total = cart.reduce((s, x) => s + x.price * x.quantity, 0)
  const nav = [
    ['dashboard', 'Dashboard', Home],
    ['packages', 'Uniform Packages', Package],
    ['products', 'Individual Products', ShoppingBag],
    ['orders', 'My Orders', ClipboardList],
    ['profile', 'Profile', UserRound],
  ] as const
  const appPath = checkout
    ? `/app/checkout/${checkout}`
    : selected
      ? '/app/product'
      : page === 'dashboard'
        ? '/app'
        : `/app/${page}`
  useEffect(() => {
    if (!window.location.pathname.startsWith('/app')) return
    if (
      window.history.state?.schoolUniformApp === 'customer' &&
      window.history.state?.screen === screen
    )
      return
    window.history.pushState(
      { schoolUniformApp: 'customer', screen, page, checkout: checkout || null },
      '',
      appPath,
    )
  }, [screen, page, checkout, appPath])

  if (checkout)
    return (
      <CustomerPageFrame
        title="Checkout"
        onBack={() => setPage('dashboard')}
        onLogout={onLogout}
        cartCount={cart.reduce((s, x) => s + x.quantity, 0)}
        onCart={() => setCheckout('cart')}
        schoolName={schoolName}
        branchName={branchName}
        userLabel={studentId}
      >
        <CheckoutFlow
          schoolId={schoolId}
          branchId={branchId}
          cart={cart}
          total={total}
          step={checkout}
          setStep={setCheckout}
          update={update}
          remove={remove}
          students={students}
          onComplete={() => {
            setCart([])
            setCheckout('success')
          }}
        />
      </CustomerPageFrame>
    )
  if (selected)
    return (
      <div className="portal">
        <GlobalHeader
          portal="customer"
          title="Product Details"
          subtitle={schoolName + ' • ' + branchName}
          onBack={() => setPage('dashboard')}
          backLabel="Dashboard"
          onLogout={onLogout}
          cartCount={cart.reduce((s, x) => s + x.quantity, 0)}
          onCart={() => setCheckout('cart')}
          schoolName={schoolName}
          branchName={branchName}
          userLabel={studentId}
        />
        <div className="portal-layout">
          <aside className="sidebar">
            <nav>
              {nav.map(([key, label, Icon]) => (
                <button
                  className={page === key ? 'active' : ''}
                  onClick={() => {
                    setSelected(null)
                    setPage(key)
                  }}
                  key={key}
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
            <ProductDetail
              item={selected}
              onBack={() => {
                setSelected(null)
                setPage('dashboard')
              }}
              onAdd={(x) => {
                add(x)
                setSelected(null)
              }}
              onBuyNow={(x) => {
                setCart((items) => {
                  const cartKey = x.id + '|' + JSON.stringify(x.selectedVariants || [])
                  const normalized = { ...x, id: cartKey }
                  const existing = items.find((item) => item.id === cartKey)
                  return existing
                    ? items.map((item) =>
                        item.id === cartKey
                          ? { ...item, quantity: item.quantity + x.quantity }
                          : item,
                      )
                    : [...items, normalized]
                })
                setCartOpen(false)
                setSelected(null)
                setCheckout('cart')
              }}
            />
          </main>
        </div>
      </div>
    )
  return (
    <div className="portal">
      <GlobalHeader
        portal="customer"
        title={
          page === 'dashboard'
            ? 'Good morning'
            : page === 'packages'
              ? 'Uniform Packages'
              : page === 'products'
                ? 'Individual Products'
                : page === 'orders'
                  ? 'My Orders'
                  : 'My Profile'
        }
        subtitle={schoolName + ' • ' + branchName}
        onBack={() => setPage('dashboard')}
        backLabel="Dashboard"
        onLogout={onLogout}
        cartCount={cart.reduce((s, x) => s + x.quantity, 0)}
        onCart={() => setCheckout('cart')}
      />
      <div className="portal-layout">
        <aside className="sidebar">
          <nav>
            {nav.map(([key, label, Icon]) => (
              <button
                className={page === key ? 'active' : ''}
                onClick={() => setPage(key)}
                key={key}
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
          <div className="portal-header">
            <div>
              <p className="eyebrow">{branchName}</p>
              <h1>
                {page === 'dashboard'
                  ? 'Good morning'
                  : page === 'packages'
                    ? 'Uniform Packages'
                    : page === 'products'
                      ? 'Individual Products'
                      : page === 'orders'
                        ? 'My Orders'
                        : 'My Profile'}
                {page === 'dashboard' && <span>, Family Account</span>}
              </h1>
            </div>
            <div className="header-user">
              <div className="avatar">{studentId.slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{studentId}</strong>
                <span>Parent / Student</span>
              </div>
            </div>
          </div>
          {page === 'dashboard' ? (
            <Dashboard setPage={setPage} students={students} />
          ) : page === 'packages' ? (
            <Packages branchId={branchId} onView={setSelected} onAdd={add} />
          ) : page === 'products' ? (
            <Products branchId={branchId} onView={setSelected} onAdd={add} />
          ) : page === 'orders' ? (
            <Orders students={students} />
          ) : (
            <Profile studentId={studentId} schoolId={schoolId} branchId={branchId} students={students} />
          )}
        </main>
      </div>

      {cartOpen && (
        <div className="school-cart-overlay" role="presentation" onClick={() => setCartOpen(false)}>
          <aside
            className="school-cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your Cart"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="school-cart-header">
              <div>
                <p className="eyebrow">SHOPPING CART</p>
                <h2>Your Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</h2>
              </div>
              <button
                className="school-cart-close"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                ×
              </button>
            </div>

            {cart.length ? (
              <>
                <div className="school-cart-items">
                  {cart.map((item) => (
                    <article className="school-cart-item" key={item.id}>
                      {item.image ? (
                        <img src={item.image} alt={item.title} />
                      ) : (
                        <div className="school-cart-item-placeholder">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                      <div className="school-cart-item-body">
                        <strong>{item.title}</strong>
                        {item.type === 'package' && item.selectedVariants?.length ? (
                          <div className="school-cart-variants">
                            {item.selectedVariants.map((v: any) => (
                              <span
                                key={
                                  v.packageItemId ||
                                  v.package_item_id ||
                                  v.variantId ||
                                  v.variant_id
                                }
                              >
                                {v.sizeLabel || v.size_label || 'Selected'}
                              </span>
                            ))}
                          </div>
                        ) : item.size ? (
                          <span className="school-cart-size">{item.size}</span>
                        ) : null}
                        <div className="school-cart-item-bottom">
                          <div className="school-cart-qty">
                            <button
                              onClick={() => update(item.id, -1)}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => update(item.id, 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong>
                          <button
                            className="school-cart-remove"
                            onClick={() => remove(item.id)}
                            aria-label="Remove item"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="school-cart-footer">
                  <div className="school-cart-total">
                    <span>Total</span>
                    <strong>₹{total.toLocaleString('en-IN')}</strong>
                  </div>
                  <button
                    className="primary-button school-cart-checkout"
                    onClick={() => {
                      setCartOpen(false)
                      setCheckout('cart')
                    }}
                  >
                    Proceed to Checkout <ArrowRight size={17} />
                  </button>
                </div>
              </>
            ) : (
              <div className="school-cart-empty">
                <ShoppingBag size={42} />
                <h3>Your cart is empty</h3>
                <p>Add a uniform package or product to continue.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
function Dashboard({ setPage, students = [] }: { setPage: (p: CustomerPage) => void; students?: any[] }) {
  const [activeOrders, setActiveOrders] = useState<number | null>(null)
  const [savedItems, setSavedItems] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadActiveOrders() {
      const client = supabase as any
      if (!client) return

      const { data: auth } = await client.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) {
        if (!cancelled) setActiveOrders(0)
        return
      }

      // Load the customer's orders and count everything that has not
      // reached a terminal state. This keeps confirmed/processing/shipped
      // orders visible while excluding delivered/cancelled orders.
      const terminalStatuses = new Set(['delivered', 'cancelled', 'refunded'])

      const { data, error } = await client
        .from('orders')
        .select('id,status')
        .eq('customer_user_id', userId)

      if (!cancelled) {
        if (error) {
          setActiveOrders(0)
        } else {
          const activeCount = (data ?? []).filter(
            (order: { status: string | null }) =>
              !terminalStatuses.has(String(order.status || '').toLowerCase()),
          ).length
          setActiveOrders(activeCount)
        }
      }
    }

    void loadActiveOrders()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadSavedItems() {
      const client = supabase as any
      const { data: auth } = await client.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) {
        if (!cancelled) setSavedItems(0)
        return
      }
      const { data, error } = await client
        .from('customer_saved_items')
        .select('id')
        .eq('user_id', userId)
      if (!cancelled) setSavedItems(error ? 0 : (data ?? []).length)
    }
    void loadSavedItems()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="portal-content">
      <div className="welcome-banner">
        <div>
          {/* <p className="eyebrow">YOUR SCHOOL STORE</p> */}
          <h2>Uniform shopping, organized for you.</h2>
          <p>Choose a complete package for the term or replace individual items as needed.</p>
          {/* <button className="hero-primary" onClick={() => setPage('packages')}>
            Explore Uniform Packages <ArrowRight size={17} />
          </button> */}
        </div>
        <div className="banner-icon">
          <ShoppingBag size={58} />
        </div>
      </div>
      <div className="portal-grid">
        <Stat
          title="Active orders"
          value={activeOrders === null ? '—' : String(activeOrders)}
          icon={<ClipboardList />}
        />
        <Stat
          title="Saved items"
          value={savedItems === null ? '—' : String(savedItems)}
          icon={<Heart />}
        />
        <Stat title="School branch" value="Active" icon={<Building2 />} />
      </div>
      {/* <div className="section-row">
        <p className="eyebrow">SHOP</p>
        <h2>Start with what you need</h2>
      </div> */}
      {students.length ? (
        <section className="parent-children-section">
          <div className="section-row">
            <p className="eyebrow">FAMILY ACCOUNT</p>
            <h2>My Children</h2>
          </div>
          <div className="parent-children-grid">
            {students.map((student) => (
              <article className="parent-child-card" key={student.id}>
                <div className="parent-child-avatar">{(student.full_name || "?").slice(0, 1).toUpperCase()}</div>
                <div>
                  <strong>{student.full_name || "Student"}</strong>
                  <span>{student.class_name || "Class"}{student.section ? ` • ${student.section}` : ""}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <div className="shop-cards">
        <ShopCard
          icon={<Package />}
          title="Uniform Packages"
          text="Complete boys and girls packages assembled from approved school products."
          action="View packages"
          onClick={() => setPage('packages')}
        />
        <ShopCard
          icon={<ShoppingBag />}
          title="Individual Products"
          text="Buy or replace individual shirts, pants, shoes, socks, belts and more."
          action="Browse products"
          onClick={() => setPage('products')}
        />
      </div>
    </div>
  )
}
function Stat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="stat">
      <div>{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}
function ShopCard({
  icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  text: string
  action: string
  onClick: () => void
}) {
  return (
    <div className="shop-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button onClick={onClick}>
        {action}
        <ArrowRight size={16} />
      </button>
    </div>
  )
}
function Packages({
  branchId,
  onView,
  onAdd,
}: {
  branchId: string
  onView: (x: CartItem) => void
  onAdd: (x: CartItem) => void
}) {
  const [items, setItems] = useState<CartItem[]>([]),
    [savedIds, setSavedIds] = useState<Set<string>>(new Set()),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  useEffect(() => {
    const client = supabase as any
    if (!client || !branchId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const { data: auth } = await client.auth.getUser()
      const userId = auth?.user?.id
      if (userId) {
        const { data: saved } = await client
          .from('customer_saved_items')
          .select('item_id')
          .eq('user_id', userId)
          .eq('item_type', 'package')
        if (!cancelled) setSavedIds(new Set((saved ?? []).map((x: any) => x.item_id)))
      }
      const bp = await client
        .from('branch_packages')
        .select('package_id,branch_price,is_visible')
        .eq('branch_id', branchId)
        .eq('is_visible', true)
      if (bp.error) {
        setError(bp.error.message)
        setLoading(false)
        return
      }
      const branchPackages = (bp.data ?? []) as Array<{
          package_id: string
          branch_price: number | null
          is_visible: boolean
        }>,
        ids = branchPackages.map((x) => x.package_id)
      if (!ids.length) {
        setItems([])
        setLoading(false)
        return
      }
      const [p, pi] = await Promise.all([
        client
          .from('uniform_packages')
          .select('id,name,description,gender,image_url,base_price,offer_price,discount_percentage')
          .in('id', ids)
          .eq('status', 'active')
          .order('name'),
        client
          .from('package_items')
          .select(
            'id,package_id,product_id,quantity,is_required,requires_size,selection_group,sort_order',
          )
          .in('package_id', ids)
          .order('sort_order'),
      ])
      if (p.error || pi.error) {
        setError(p.error?.message || pi.error?.message || 'Unable to load packages')
        setLoading(false)
        return
      }
      const packages = (p.data ?? []) as Array<{
          id: string
          name: string
          description: string | null
          gender: string | null
          image_url: string | null
          base_price: number | null
        }>,
        packageItems = (pi.data ?? []) as Array<{
          id: string
          package_id: string
          product_id: string
          quantity: number
          is_required: boolean
          requires_size: boolean
          selection_group: string | null
          sort_order: number
        }>,
        productIds = [...new Set(packageItems.map((x) => x.product_id))]
      const [pr, pv] = await Promise.all([
        productIds.length
          ? client.from('products').select('id,name').in('id', productIds)
          : Promise.resolve({ data: [], error: null }),
        productIds.length
          ? client
              .from('product_variants')
              .select('id,product_id,size_label,variant_name')
              .in('product_id', productIds)
              .eq('status', 'active')
              .order('size_label')
          : Promise.resolve({ data: [], error: null }),
      ])
      const names = Object.fromEntries(
        ((pr.data ?? []) as Array<{ id: string; name: string }>).map((x) => [x.id, x.name]),
      )
      const variantsByProduct: Record<string, { id: string; label: string }[]> = Object.fromEntries(
        productIds.map((id) => [id, []]),
      )
      ;(
        (pv.data ?? []) as Array<{
          id: string
          product_id: string
          size_label: string | null
          variant_name: string | null
        }>
      ).forEach((x) => {
        if (x.size_label && variantsByProduct[x.product_id])
          variantsByProduct[x.product_id].push({ id: x.id, label: x.size_label })
      })
      const priceMap = Object.fromEntries(branchPackages.map((x) => [x.package_id, x.branch_price]))
      Object.values(variantsByProduct).forEach((options) =>
        options.sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }),
        ),
      )
      if (!cancelled)
        setItems(
          packages.map((x) => {
            const components = packageItems
              .filter((i) => i.package_id === x.id)
              .map((i) => ({
                packageItemId: i.id,
                productId: i.product_id,
                title: names[i.product_id] || 'Product',
                quantity: i.quantity,
                requiresSize: i.requires_size,
                required: i.is_required,
                variants: variantsByProduct[i.product_id] || [],
              }))
            return {
              id: x.id,
              title: x.name,
              type: 'package' as const,
              price: Number(priceMap[x.id] ?? x.base_price ?? 0),
              quantity: 1,
              text: x.description || 'Complete school-approved package',
              sourceId: x.id,
              image: x.image_url || '/category-packages.jpg',
              bundleItems: components.map((i) => i.quantity + ' × ' + i.title),
              bundleComponents: components,
            }
          }),
        )
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [branchId])
  return (
    <div className="portal-content">
      {error && <p className="workspace-error">{error}</p>}
      {loading ? (
        <div className="empty-state">Loading school packages...</div>
      ) : (
        <div className="catalog-grid">
          {items.map((x) => (
            <ProductCard
              key={x.id}
              {...x}
              saved={savedIds.has(x.id)}
              onToggleSaved={async () => {
                const client = supabase as any
                const { data: auth } = await client.auth.getUser()
                const userId = auth?.user?.id
                if (!userId) return
                if (savedIds.has(x.id)) {
                  await client
                    .from('customer_saved_items')
                    .delete()
                    .eq('user_id', userId)
                    .eq('item_type', 'package')
                    .eq('item_id', x.id)
                  setSavedIds((prev) => {
                    const next = new Set(prev)
                    next.delete(x.id)
                    return next
                  })
                } else {
                  await client.from('customer_saved_items').insert({
                    user_id: userId,
                    item_type: 'package',
                    item_id: x.id,
                  })
                  setSavedIds((prev) => new Set(prev).add(x.id))
                }
              }}
              onView={() => onView(x)}
              onAdd={() => onAdd(x)}
            />
          ))}
        </div>
      )}
      {!loading && !items.length && !error && (
        <div className="empty-state">
          <Package size={42} />
          <h3>No packages available</h3>
          <p>Your school has not published any uniform packages yet.</p>
        </div>
      )}
    </div>
  )
}
function Products({
  branchId,
  onView,
  onAdd,
}: {
  branchId: string
  onView: (x: CartItem) => void
  onAdd: (x: CartItem) => void
}) {
  const [items, setItems] = useState<CartItem[]>([]),
    [savedIds, setSavedIds] = useState<Set<string>>(new Set()),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  useEffect(() => {
    const client = supabase as NonNullable<typeof supabase>
    if (!client || !branchId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const { data: auth } = await client.auth.getUser()
      const userId = auth?.user?.id
      if (userId) {
        const { data: saved } = await client
          .from('customer_saved_items')
          .select('item_id')
          .eq('user_id', userId)
          .eq('item_type', 'product')
        if (!cancelled) setSavedIds(new Set((saved ?? []).map((x: any) => x.item_id)))
      }
      const bp = await client
        .from('branch_products')
        .select('product_id,branch_price,is_visible')
        .eq('branch_id', branchId)
        .eq('is_visible', true)
      if (bp.error) {
        setError(bp.error.message)
        setLoading(false)
        return
      }
      const branchProducts = (bp.data ?? []) as Array<{
        product_id: string
        branch_price: number | null
        is_visible: boolean
      }>
      const ids = branchProducts.map((x) => x.product_id)
      if (!ids.length) {
        setItems([])
        setLoading(false)
        return
      }
      const p = await client
        .from('products')
        .select(
          'id,name,description,product_type,occasion_type,gender,material,brand,quality,fabric,care,delivery_returns,cod_available,custom_order_cod,easy_returns,express_shipping,image_url,image_gallery,base_price',
        )
        .in('id', ids)
        .eq('status', 'active')
        .order('name')
      if (p.error) {
        setError(p.error.message)
        setLoading(false)
        return
      }
      const products = (p.data ?? []) as Array<{
        id: string
        name: string
        description: string | null
        product_type: string | null
        occasion_type: string | null
        gender: string | null
        material: string | null
        brand: string | null
        quality: string | null
        fabric: string | null
        care: string | null
        delivery_returns: string | null
        cod_available: boolean | null
        custom_order_cod: boolean | null
        easy_returns: boolean | null
        express_shipping: boolean | null
        image_url: string | null
        image_gallery: string[] | null
        base_price: number | null
      }>
      const priceMap = Object.fromEntries(branchProducts.map((x) => [x.product_id, x.branch_price]))
      const pv = await client
        .from('product_variants')
        .select('id,product_id,size_label,variant_name,status')
        .in('product_id', ids)
        .order('size_label')
      const variants = (pv.data ?? []) as Array<{
        id: string
        product_id: string
        size_label: string | null
        variant_name: string | null
        status: string | null
      }>
      const sizes: Record<string, string[]> = Object.fromEntries(ids.map((id) => [id, []]))
      const variantOptions: Record<string, { id: string; label: string }[]> = Object.fromEntries(
        ids.map((id) => [id, []]),
      )
      variants.forEach((x) => {
        if (x.size_label && sizes[x.product_id] && !sizes[x.product_id].includes(x.size_label)) {
          sizes[x.product_id].push(x.size_label)
          variantOptions[x.product_id].push({
            id: x.id,
            label: x.size_label,
            disabled: x.status !== 'active',
          })
        }
      })
      if (!cancelled)
        setItems(
          products.map((x) => ({
            id: x.id,
            title: x.name,
            type: 'product' as const,
            price: Number(priceMap[x.id] ?? x.base_price ?? 0),
            quantity: 1,
            text: x.description || 'School-approved individual product',
            productType: x.product_type || '',
            occasionType: x.occasion_type || '',
            gender: x.gender || '',
            material: x.material || '',
            brand: x.brand || '',
            quality: x.quality || '',
            fabric: x.fabric || '',
            care: x.care || '',
            deliveryReturns: x.delivery_returns || '',
            codAvailable: x.cod_available !== false,
            customOrderCod: x.custom_order_cod === true,
            easyReturns: x.easy_returns !== false,
            expressShipping: x.express_shipping !== false,
            sourceId: x.id,
            image: x.image_url || '/category-accessories.jpg',
            imageGallery: Array.isArray(x.image_gallery) ? x.image_gallery : [],
            sizeOptions: sizes[x.id] || [],
            variantOptions: variantOptions[x.id] || [],
          })),
        )
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [branchId])
  return (
    <div className="portal-content">
      <div className="catalog-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input placeholder="Search products" />
        </div>
        <select>
          <option>All categories</option>
          <option>Shirts</option>
          <option>Pants</option>
          <option>Shoes</option>
          <option>Accessories</option>
        </select>
      </div>
      {error && <p className="workspace-error">{error}</p>}
      {loading ? (
        <div className="empty-state">Loading school products...</div>
      ) : (
        <div className="catalog-grid">
          {items.map((x) => (
            <ProductCard
              key={x.id}
              {...x}
              saved={savedIds.has(x.id)}
              onToggleSaved={async () => {
                const client = supabase as any
                const { data: auth } = await client.auth.getUser()
                const userId = auth?.user?.id
                if (!userId) return
                if (savedIds.has(x.id)) {
                  await client
                    .from('customer_saved_items')
                    .delete()
                    .eq('user_id', userId)
                    .eq('item_type', 'product')
                    .eq('item_id', x.id)
                  setSavedIds((prev) => {
                    const next = new Set(prev)
                    next.delete(x.id)
                    return next
                  })
                } else {
                  await client.from('customer_saved_items').insert({
                    user_id: userId,
                    item_type: 'product',
                    item_id: x.id,
                  })
                  setSavedIds((prev) => new Set(prev).add(x.id))
                }
              }}
              onView={() => onView(x)}
              onAdd={() => onAdd(x)}
            />
          ))}
        </div>
      )}
      {!loading && !items.length && !error && (
        <div className="empty-state">
          <ShoppingBag size={42} />
          <h3>No products available</h3>
          <p>Your school has not published any products yet.</p>
        </div>
      )}
    </div>
  )
}
function ProductCard({
  badge,
  title,
  text,
  price,
  onView,
  onAdd,
  id,
  type,
  image,
  saved = false,
  onToggleSaved,
}: {
  badge?: string
  title: string
  text?: string
  price: number
  onView: () => void
  onAdd: () => void
  id: string
  type: 'package' | 'product'
  image?: string
  saved?: boolean
  onToggleSaved?: () => void
}) {
  const visual =
    image ||
    (id.includes('girls') || title.toLowerCase().includes('girls')
      ? '/category-girls.jpg'
      : id.includes('boys') || title.toLowerCase().includes('boys')
        ? '/category-boys.jpg'
        : '/category-accessories.jpg')
  return (
    <article className="product-card">
      <button className="product-image product-image-button" onClick={onView}>
        <img
          src={visual}
          alt={title}
          onError={(e) => {
            e.currentTarget.src = '/category-packages.jpg'
          }}
        />
        {badge && <span>{badge}</span>}
        <i className="quick-view">View</i>
      </button>
      {onToggleSaved && (
        <button
          type="button"
          className={`product-save-button ${saved ? 'saved' : ''}`}
          onClick={() => void onToggleSaved()}
          aria-label={saved ? 'Remove from saved items' : 'Save item'}
          title={saved ? 'Remove from saved items' : 'Save item'}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      )}
      <div className="product-copy">
        <p>{text || 'School-approved product'}</p>
        <h3>{title}</h3>
        <div className="price-row">
          <strong>₹{price.toLocaleString('en-IN')}</strong>
          <span>School approved</span>
        </div>
        <div className="product-actions">
          <button onClick={onView}>View details</button>
          <button className="add-button" onClick={onView}>
            Add to cart <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}
function ProductDetail({
  item,
  onBack,
  onAdd,
  onBuyNow,
}: {
  item: CartItem
  onBack: () => void
  onAdd: (x: CartItem) => void
  onBuyNow: (x: CartItem) => void
}) {
  const [size, setSize] = useState(''),
    [quantity, setQuantity] = useState(1),
    [mainImage, setMainImage] = useState(item.image || '/category-packages.jpg'),
    [bundleSizes, setBundleSizes] = useState<Record<string, string>>({})
  const productOptions = item.variantOptions?.length
    ? item.variantOptions
    : (item.sizeOptions || []).map((x) => ({ id: x, label: x }))
  const packageComponents = item.bundleComponents || []
  const requiredComponents = packageComponents.filter((x) => x.required && x.requiresSize)
  const ready =
    item.type === 'product'
      ? Boolean(size)
      : requiredComponents.every((x) => Boolean(bundleSizes[x.packageItemId]))
  const selectedVariants =
    item.type === 'product'
      ? size
        ? [{ variantId: size, sizeLabel: productOptions.find((x) => x.id === size)?.label }]
        : []
      : packageComponents
          .filter((x) => x.requiresSize)
          .map((x) => ({
            packageItemId: x.packageItemId,
            variantId: bundleSizes[x.packageItemId],
            sizeLabel: x.variants.find((v) => v.id === bundleSizes[x.packageItemId])?.label,
          }))
  return (
    <div className="checkout-page">
      <div className="checkout-top">
        <button onClick={onBack}>
          <ChevronLeft size={18} /> Back to Dashboard
        </button>
        <strong>Product Details</strong>
      </div>
      <div className="detail-card">
        <div className="detail-gallery">
          <div className="detail-image">
            <img
              src={mainImage}
              alt={item.title}
              onError={(e) => {
                e.currentTarget.src = '/category-packages.jpg'
              }}
            />
          </div>
          {item.imageGallery?.length ? (
            <div className="detail-gallery-thumbnails">
              {[item.image, ...(item.imageGallery || [])]
                .filter(Boolean)
                .filter((url, index, all) => all.indexOf(url) === index)
                .map((url, index) => (
                  <button
                    type="button"
                    className={'detail-gallery-thumb' + (mainImage === url ? ' selected' : '')}
                    key={url + index}
                    onClick={() => {
                      const image = document.querySelector<HTMLImageElement>('.detail-image img')
                      setMainImage(url as string)
                    }}
                  >
                    <img src={url as string} alt={`Product image ${index + 1}`} />
                  </button>
                ))}
            </div>
          ) : null}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            {item.type === 'package' ? 'UNIFORM PACKAGE' : 'INDIVIDUAL PRODUCT'}
          </p>
          <h1>{item.title}</h1>
          <p>
            {item.text ||
              'School-approved product for your selected school and branch. Final availability and pricing are controlled by the school catalog.'}
          </p>
          {item.type === 'package' ? (
            <div className="package-includes-inline">
              <strong>Package includes</strong>
              {packageComponents.map((x) => (
                <div className="package-include-row" key={x.packageItemId}>
                  <span>
                    {x.quantity} × {x.title}
                    {x.requiresSize && x.required ? <em>*</em> : null}
                  </span>
                  {x.requiresSize ? (
                    <select
                      aria-label={x.title + ' size'}
                      value={bundleSizes[x.packageItemId] || ''}
                      onChange={(e) =>
                        setBundleSizes((v) => ({ ...v, [x.packageItemId]: e.target.value }))
                      }
                    >
                      <option value="">Select Size</option>
                      {x.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="package-no-size">No size</span>
                  )}
                </div>
              ))}
            </div>
          ) : item.bundleItems?.length ? (
            <div className="bundle-list">
              <strong>Product includes</strong>
              {item.bundleItems.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
          ) : null}
          <strong className="detail-price">₹{item.price.toLocaleString('en-IN')}</strong>
          {item.type === 'product' ? (
            <div className="detail-size-selector">
              <div className="detail-size-heading">
                <span>Size</span>
                <strong>{productOptions.find((x: any) => x.id === size)?.label || '—'}</strong>
              </div>
              <div className="detail-size-options" role="radiogroup" aria-label="Select size">
                {productOptions.map((x: any) => {
                  const unavailable = Boolean(x.disabled)
                  const selectedSize = size === x.id
                  return (
                    <button
                      key={x.id}
                      type="button"
                      className={
                        'detail-size-option' +
                        (selectedSize ? ' selected' : '') +
                        (unavailable ? ' unavailable' : '')
                      }
                      disabled={unavailable}
                      aria-pressed={selectedSize}
                      onClick={() => setSize(x.id)}
                    >
                      <span>{x.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="quantity">
            <span>Quantity</span>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              <Minus />
            </button>
            <b>{quantity}</b>
            <button onClick={() => setQuantity(quantity + 1)}>
              <Plus />
            </button>
          </div>
          <div className="detail-purchase-actions">
            <button
              className="primary-button"
              disabled={!ready}
              onClick={() =>
                onAdd({
                  ...item,
                  size:
                    item.type === 'package'
                      ? 'Multiple'
                      : productOptions.find((x) => x.id === size)?.label,
                  quantity,
                  selectedVariants,
                })
              }
            >
              Add to Cart <ShoppingCart size={18} />
            </button>
            <button
              className="secondary-button detail-buy-now"
              disabled={!ready}
              onClick={() =>
                onBuyNow({
                  ...item,
                  size:
                    item.type === 'package'
                      ? 'Multiple'
                      : productOptions.find((x) => x.id === size)?.label,
                  quantity,
                  selectedVariants,
                })
              }
            >
              Buy Now <ArrowRight size={18} />
            </button>
          </div>

          {item.type === 'product' ? (
            <div className="product-detail-information">
              <details className="product-benefits-accordion">
                <summary>
                  COD, Returns & Shipping <ChevronDown size={18} />
                </summary>
                <div className="product-benefit-list">
                  {item.codAvailable !== false ? (
                    <div>
                      <CheckCircle2 size={20} />
                      <strong>COD Available</strong>
                    </div>
                  ) : null}
                  {item.customOrderCod === true ? (
                    <div className="warning">
                      <Ban size={20} />
                      <strong>No COD on Custom Order (Embroidery)</strong>
                    </div>
                  ) : null}
                  {item.easyReturns !== false ? (
                    <div>
                      <RotateCcw size={20} />
                      <strong>Easy Returns & Exchange</strong>
                    </div>
                  ) : null}
                  {item.expressShipping !== false ? (
                    <div>
                      <Truck size={20} />
                      <strong>1–3 Day Express Shipping</strong>
                    </div>
                  ) : null}
                </div>
              </details>

              <details>
                <summary>
                  Details <ChevronDown size={18} />
                </summary>
                <div className="product-info-grid">
                  <div>
                    <strong>Product Type:</strong>
                    <span>{item.productType || '—'}</span>
                  </div>
                  <div>
                    <strong>Occasion Type:</strong>
                    <span>{item.occasionType || '—'}</span>
                  </div>
                  <div>
                    <strong>Gender:</strong>
                    <span>{item.gender || '—'}</span>
                  </div>
                  <div>
                    <strong>Material:</strong>
                    <span>{item.material || '—'}</span>
                  </div>
                  <div>
                    <strong>Brand:</strong>
                    <span>{item.brand || '—'}</span>
                  </div>
                </div>
              </details>

              <details>
                <summary>
                  Description <ChevronDown size={18} />
                </summary>
                <p className="product-info-text">{item.text || '—'}</p>
              </details>

              <details>
                <summary>
                  Quality & Care <ChevronDown size={18} />
                </summary>
                <div className="product-info-grid">
                  <div>
                    <strong>Quality:</strong>
                    <span>{item.quality || '—'}</span>
                  </div>
                  <div>
                    <strong>Fabric:</strong>
                    <span>{item.fabric || '—'}</span>
                  </div>
                  <div className="product-info-care">
                    <strong>Care:</strong>
                    <span>{item.care || '—'}</span>
                  </div>
                </div>
              </details>

              <details>
                <summary>
                  Delivery & Returns <ChevronDown size={18} />
                </summary>
                <p className="product-info-text">{item.deliveryReturns || '—'}</p>
              </details>
            </div>
          ) : null}
        </div>
      </div>
      {item.type === 'product' ? <ProductReviews productId={item.sourceId} /> : null}
    </div>
  )
}

function Orders({ students = [] }: { students?: any[] }) {
  const [studentFilter, setStudentFilter] = useState('all')
  const [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  useEffect(() => {
    const client = supabase as any
    if (!client) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const r = await client
        .from('orders')
        .select(
          'id,order_number,status,subtotal,shipping_total,grand_total,currency,created_at,student_id',
        )
        .order('created_at', { ascending: false })
      if (r.error) {
        setError(r.error.message)
        setLoading(false)
        return
      }
      const orders = (r.data ?? []) as Array<{
          id: string
          order_number: string
          status: string
          subtotal: number
          shipping_total: number
          grand_total: number
          currency: string
          created_at: string
          student_id: string | null
        }>,
        ids = orders.map((x) => x.id)
      const ir = ids.length
        ? await client
            .from('order_items')
            .select('order_id,item_name_snapshot,quantity,unit_price')
            .in('order_id', ids)
        : { data: [], error: null }
      if (ir.error) {
        setError(ir.error.message)
        setLoading(false)
        return
      }
      const itemMap: Record<string, any[]> = Object.fromEntries(ids.map((id) => [id, []]))
      ;(
        (ir.data ?? []) as Array<{
          order_id: string
          item_name_snapshot: string
          quantity: number
          unit_price: number
        }>
      ).forEach((x) => {
        if (itemMap[x.order_id]) itemMap[x.order_id].push(x)
      })
      if (!cancelled) setRows(orders.map((x) => ({ ...x, items: itemMap[x.id] || [] })))
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])
  return (
    <div className="portal-content">
      {error && <p className="workspace-error">{error}</p>}
      {loading ? (
        <div className="empty-state">Loading orders...</div>
      ) : rows.length ? (
        <div className="orders-list">
          {filteredRows.map((x) => (
            <article className="order-card" key={x.id}>
              <div className="order-card-head">
                <div>
                  <p className="eyebrow">{x.order_number}</p>
                  <strong>
                    {new Date(x.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </div>
                <span className={'order-status ' + x.status}>{x.status}</span>
              </div>
              {studentById.get(x.student_id) ? (
                <div className="order-student-row">
                  <UserRound size={15} />
                  <span>Student</span>
                  <strong>{studentById.get(x.student_id)?.full_name}</strong>
                  <small>
                    {studentById.get(x.student_id)?.class_name || 'Class'}
                    {studentById.get(x.student_id)?.section
                      ? ` • ${studentById.get(x.student_id).section}`
                      : ''}
                  </small>
                </div>
              ) : null}
              <div className="order-card-items">
                {x.items.map((i: any) => (
                  <div key={i.order_id + '-' + i.item_name_snapshot}>
                    <span>
                      {i.item_name_snapshot} × {i.quantity}
                    </span>
                    <strong>₹{Number(i.unit_price * i.quantity).toLocaleString('en-IN')}</strong>
                  </div>
                ))}
              </div>
              <div className="order-card-total">
                <span>Total</span>
                <strong>₹{Number(x.grand_total).toLocaleString('en-IN')}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ClipboardList size={42} />
          <h3>No orders found</h3>
          <p>No orders match the selected student.</p>
        </div>
      )}
    </div>
  )
}
function Profile({
  studentId,
  schoolId,
  branchId,
  students = [],
}: {
  studentId: string
  schoolId: string
  branchId: string
  students?: any[]
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<any>({})
  const [student, setStudent] = useState<any>({})
  const [address, setAddress] = useState<any>({
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
  })
  const [passwords, setPasswords] = useState({ password: '', confirm: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const client = supabase as any
      if (!client) return
      setLoading(true)
      setError('')
      const { data: auth } = await client.auth.getUser()
      const user = auth?.user
      if (!user || cancelled) {
        setLoading(false)
        return
      }
      setUserId(user.id)

      const [pr, links, ad] = await Promise.all([
        client
          .from('profiles')
          .select('full_name,login_id,phone,role')
          .eq('id', user.id)
          .maybeSingle(),
        client
          .from('parent_student_links')
          .select('student_id,relationship,is_primary')
          .eq('parent_user_id', user.id)
          .order('is_primary', { ascending: false }),
        client
          .from('customer_addresses')
          .select('id,recipient_name,phone,address_line1,address_line2,city,state,postal_code')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle(),
      ])

      if (cancelled) return
      setProfile({
        ...(pr.data || {}),
        email: user.email || '',
      })
      const studentIds = ((links.data || []) as any[]).map((x) => x.student_id).filter(Boolean)
      let selectedStudent: any = null

      // Resolve the linked student exactly like the checkout flow: the
      // parent-student relationship is the primary source of truth.
      if (studentIds.length) {
        const sr = await client
          .from('students')
          .select(
            'id,student_code,full_name,class_name,section,gender,date_of_birth,father_name,school_id,branch_id,status',
          )
          .in('id', studentIds)
          .eq('status', 'active')

        if (sr.error) {
          setError(sr.error.message)
        } else {
          const linkedStudents = (sr.data || []) as any[]
          selectedStudent =
            linkedStudents.find((s) => s.school_id === schoolId && s.branch_id === branchId) ||
            linkedStudents[0] ||
            null
        }
      }

      // Some existing Parent / Student accounts use the login ID directly
      // as students.student_code. Keep this as a reliable fallback when the
      // relationship is temporarily unavailable or not present.
      if (!selectedStudent && studentId) {
        const byCode = await client
          .from('students')
          .select(
            'id,student_code,full_name,class_name,section,gender,date_of_birth,father_name,school_id,branch_id,status',
          )
          .eq('student_code', studentId)
          .eq('school_id', schoolId)
          .eq('branch_id', branchId)
          .eq('status', 'active')
          .maybeSingle()

        if (byCode.error) {
          setError(byCode.error.message)
        } else if (byCode.data) {
          selectedStudent = byCode.data
        }
      }

      setStudent(selectedStudent || {})
      if (ad.data) setAddress(ad.data)
      setLoading(false)
      if (pr.error || links.error || ad.error) {
        setError(
          pr.error?.message ||
            links.error?.message ||
            ad.error?.message ||
            'Unable to load profile details.',
        )
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [studentId, schoolId, branchId])

  const validateProfileField = (field: string, value: string) => {
    const v = String(value || '').trim()
    switch (field) {
      case 'full_name':
        return !v ? 'Full Name is required.' : v.length < 2 ? 'Enter a valid full name.' : ''
      case 'phone':
        return !v
          ? 'Mobile number is required.'
          : !/^[6-9]\d{9}$/.test(v)
            ? 'Enter a valid 10-digit mobile number.'
            : ''
      case 'email':
        return !v
          ? 'Email is required.'
          : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
            ? 'Enter a valid email address.'
            : ''
      case 'recipient_name':
        return !v
          ? 'Recipient Name is required.'
          : v.length < 2
            ? 'Enter a valid recipient name.'
            : ''
      case 'address_phone':
        return !v
          ? 'Mobile number is required.'
          : !/^[6-9]\d{9}$/.test(v)
            ? 'Enter a valid 10-digit mobile number.'
            : ''
      case 'address_line1':
        return !v ? 'Address Line 1 is required.' : v.length < 5 ? 'Enter a complete address.' : ''
      case 'city':
        return !v ? 'City is required.' : ''
      case 'state':
        return !v ? 'State is required.' : ''
      case 'postal_code':
        return !v
          ? 'PIN / Postal Code is required.'
          : !/^\d{6}$/.test(v)
            ? 'Enter a valid 6-digit PIN / Postal Code.'
            : ''
      default:
        return ''
    }
  }

  const profileCustomerValid =
    !validateProfileField('full_name', profile.full_name) &&
    !validateProfileField('phone', profile.phone) &&
    !validateProfileField('email', profile.email)

  const profileAddressValid =
    !validateProfileField('recipient_name', address.recipient_name) &&
    !validateProfileField('address_phone', address.phone) &&
    !validateProfileField('address_line1', address.address_line1) &&
    !validateProfileField('city', address.city) &&
    !validateProfileField('state', address.state) &&
    !validateProfileField('postal_code', address.postal_code)

  const saveCustomerDetails = async () => {
    const client = supabase as any
    if (!client || !userId) return
    setSaving(true)
    setMessage('')
    setError('')
    const customerError =
      validateProfileField('full_name', profile.full_name) ||
      validateProfileField('phone', profile.phone) ||
      validateProfileField('email', profile.email)
    if (customerError) {
      setError(customerError)
      setSaving(false)
      return
    }
    const result = await client
      .from('profiles')
      .update({
        full_name: profile.full_name || null,
        phone: profile.phone || null,
      })
      .eq('id', userId)

    if (result.error) setError(result.error.message || 'Unable to save customer details.')
    else setMessage('Customer details saved successfully.')
    setSaving(false)
  }

  const saveAddress = async () => {
    const client = supabase as any
    if (!client || !userId) return
    setSaving(true)
    setMessage('')
    setError('')
    const addressError =
      validateProfileField('recipient_name', address.recipient_name) ||
      validateProfileField('address_phone', address.phone) ||
      validateProfileField('address_line1', address.address_line1) ||
      validateProfileField('city', address.city) ||
      validateProfileField('state', address.state) ||
      validateProfileField('postal_code', address.postal_code)
    if (addressError) {
      setError(addressError)
      setSaving(false)
      return
    }

    const payload = {
      user_id: userId,
      label: 'Home',
      recipient_name: address.recipient_name || profile.full_name || student.full_name || '',
      phone: address.phone || profile.phone || '',
      address_line1: address.address_line1,
      address_line2: address.address_line2 || null,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      is_default: true,
    }

    const result = address.id
      ? await client.from('customer_addresses').update(payload).eq('id', address.id)
      : await client.from('customer_addresses').insert(payload).select().single()

    if (result.error) setError(result.error.message || 'Unable to save delivery address.')
    else {
      if (result.data) setAddress(result.data)
      setMessage('Delivery address saved successfully.')
    }
    setSaving(false)
  }

  const changePassword = async () => {
    const client = supabase as any
    if (!client) return
    setMessage('')
    setError('')
    if (passwords.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (passwords.password !== passwords.confirm) {
      setError('Passwords do not match.')
      return
    }
    setPasswordSaving(true)
    const result = await client.auth.updateUser({ password: passwords.password })
    if (result.error) setError(result.error.message)
    else {
      setPasswords({ password: '', confirm: '' })
      setMessage('Password changed successfully.')
    }
    setPasswordSaving(false)
  }

  const updateEmail = async () => {
    const client = supabase as any
    if (!client || !profile.email) return
    setMessage('')
    setError('')
    const email = profile.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    const { data, error: functionError } = await client.functions.invoke('update-parent-email', {
      body: { email },
    })
    if (functionError) {
      setError(functionError.message || 'Unable to update email address.')
      return
    }
    if (data?.error) {
      setError(data.error)
      return
    }

    // Refresh the Auth user so the Profile page immediately shows the
    // newly saved email instead of the old synthetic .local address.
    const refreshed = await client.auth.getUser()
    if (refreshed.data?.user) {
      setProfile((current: any) => ({
        ...current,
        email: refreshed.data.user.email || email,
      }))
    }
    setMessage('Email address updated successfully.')
  }

  if (loading)
    return (
      <div className="portal-content">
        <div className="profile-loading">Loading profile...</div>
      </div>
    )

  return (
    <div className="portal-content">
      {message && <div className="profile-message">{message}</div>}
      {error && <div className="profile-error">{error}</div>}

      <div className="profile-grid">
        <section className="profile-panel">
          <div className="profile-panel-heading">
            <div>
              <h3>Customer Details</h3>
              <p>Your contact information used for orders and account communication.</p>
            </div>
            <UserRound size={20} />
          </div>
          <div className="profile-form-grid">
            <label>
              Full Name <span className="required-star">*</span>
              <input
                className={
                  validateProfileField('full_name', profile.full_name)
                    ? 'profile-input-invalid'
                    : ''
                }
                value={profile.full_name || ''}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
              {validateProfileField('full_name', profile.full_name) && (
                <small className="profile-field-error">
                  {validateProfileField('full_name', profile.full_name)}
                </small>
              )}
            </label>
            <label>
              Mobile <span className="required-star">*</span>
              <input
                className={
                  validateProfileField('phone', profile.phone) ? 'profile-input-invalid' : ''
                }
                value={profile.phone || ''}
                inputMode="numeric"
                maxLength={10}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                }
              />
              {validateProfileField('phone', profile.phone) && (
                <small className="profile-field-error">
                  {validateProfileField('phone', profile.phone)}
                </small>
              )}
            </label>
            <label className="profile-field-full">
              Email <span className="required-star">*</span>
              <input
                className={
                  validateProfileField('email', profile.email) ? 'profile-input-invalid' : ''
                }
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                type="email"
              />
              {validateProfileField('email', profile.email) && (
                <small className="profile-field-error">
                  {validateProfileField('email', profile.email)}
                </small>
              )}
            </label>
          </div>
          <div className="profile-panel-actions">
            <button className="secondary-button" onClick={updateEmail}>
              <Mail size={15} /> Update Email
            </button>
            <button className="primary-button" onClick={saveCustomerDetails} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        </section>

        <section className="profile-panel">
          <div className="profile-panel-heading">
            <div>
              <h3>Student Information</h3>
              <p>All students linked to this Parent / Student account.</p>
            </div>
            <UserRound size={20} />
          </div>
          <div className="profile-students-list">
            {(students.length ? students : [student]).map((child: any) => (
              <div className="profile-student-card" key={child.id || child.student_code}>
                <div className="profile-student-card-head">
                  <div>
                    <strong>{child.full_name || "Student"}</strong>
                    <span>{child.student_code || studentId}</span>
                  </div>
                  <span>{child.class_name || "Class"}{child.section ? ` • ${child.section}` : ""}</span>
                </div>
                <div className="profile-readonly-grid">
                  <div><span>Gender</span><strong>{child.gender || "—"}</strong></div>
                  <div><span>Date of Birth</span><strong>{child.date_of_birth || "—"}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="profile-panel profile-address-panel">
          <div className="profile-panel-heading">
            <div>
              <h3>Delivery Address</h3>
              <p>Keep the address used for uniform orders up to date.</p>
            </div>
            <MapPin size={20} />
          </div>
          <div className="profile-form-grid">
            <label>
              Recipient Name <span className="required-star">*</span>
              <input
                className={
                  validateProfileField('recipient_name', address.recipient_name)
                    ? 'profile-input-invalid'
                    : ''
                }
                value={address.recipient_name || ''}
                onChange={(e) => setAddress({ ...address, recipient_name: e.target.value })}
              />
              {validateProfileField('recipient_name', address.recipient_name) && (
                <small className="profile-field-error">
                  {validateProfileField('recipient_name', address.recipient_name)}
                </small>
              )}
            </label>
            <label>
              Mobile <span className="required-star">*</span>
              <input
                className={
                  validateProfileField('address_phone', address.phone)
                    ? 'profile-input-invalid'
                    : ''
                }
                value={address.phone || ''}
                inputMode="numeric"
                maxLength={10}
                onChange={(e) =>
                  setAddress({ ...address, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                }
              />
              {validateProfileField('address_phone', address.phone) && (
                <small className="profile-field-error">
                  {validateProfileField('address_phone', address.phone)}
                </small>
              )}
            </label>
            <label className="profile-field-full">
              Address Line 1 <span className="required-star">*</span>
              <input
                className={
                  validateProfileField('address_line1', address.address_line1)
                    ? 'profile-input-invalid'
                    : ''
                }
                value={address.address_line1 || ''}
                onChange={(e) => setAddress({ ...address, address_line1: e.target.value })}
              />
              {validateProfileField('address_line1', address.address_line1) && (
                <small className="profile-field-error">
                  {validateProfileField('address_line1', address.address_line1)}
                </small>
              )}
            </label>
            <label className="profile-field-full">
              Address Line 2
              <input
                value={address.address_line2 || ''}
                onChange={(e) => setAddress({ ...address, address_line2: e.target.value })}
              />
            </label>
            <label>
              City <span className="required-star">*</span>
              <input
                className={
                  validateProfileField('city', address.city) ? 'profile-input-invalid' : ''
                }
                value={address.city || ''}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
              {validateProfileField('city', address.city) && (
                <small className="profile-field-error">
                  {validateProfileField('city', address.city)}
                </small>
              )}
            </label>
            <label>
              State <span className="required-star">*</span>
              <input
                className={
                  validateProfileField('state', address.state) ? 'profile-input-invalid' : ''
                }
                value={address.state || ''}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
              />
              {validateProfileField('state', address.state) && (
                <small className="profile-field-error">
                  {validateProfileField('state', address.state)}
                </small>
              )}
            </label>
            <label>
              PIN / Postal Code <span className="required-star">*</span>
              <input
                className={
                  validateProfileField('postal_code', address.postal_code)
                    ? 'profile-input-invalid'
                    : ''
                }
                value={address.postal_code || ''}
                onChange={(e) =>
                  setAddress({
                    ...address,
                    postal_code: e.target.value.replace(/\\D/g, '').slice(0, 6),
                  })
                }
              />
              {validateProfileField('postal_code', address.postal_code) && (
                <small className="profile-field-error">
                  {validateProfileField('postal_code', address.postal_code)}
                </small>
              )}
            </label>
          </div>
          <div className="profile-panel-actions">
            <button className="primary-button" onClick={saveAddress} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </section>

        <section className="profile-panel">
          <div className="profile-panel-heading">
            <div>
              <h3>Change Password</h3>
              <p>Choose a new password for your Parent / Student Portal login.</p>
            </div>
            <KeyRound size={20} />
          </div>
          <div className="profile-form-grid">
            <label>
              New Password
              <input
                type="password"
                value={passwords.password}
                onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </label>
            <label>
              Confirm Password
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Repeat new password"
              />
            </label>
          </div>
          <div className="profile-panel-actions">
            <button className="primary-button" onClick={changePassword} disabled={passwordSaving}>
              <KeyRound size={15} /> {passwordSaving ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CustomerPortal
