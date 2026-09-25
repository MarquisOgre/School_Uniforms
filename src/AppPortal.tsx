import { useEffect, useState } from 'react'
import type React from 'react'
import {
  ArrowRight,
  Building2,
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
} from 'lucide-react'
import { supabase } from './lib/supabase'
import CheckoutFlow, { type CheckoutCartItem } from './CheckoutFlow'
import { CustomerPageFrame, GlobalHeader } from './components/GlobalChrome'

export type CustomerPage = 'dashboard' | 'packages' | 'products' | 'orders' | 'profile'
type CartItem = CheckoutCartItem
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
    void client
      .from('students')
      .select('id,student_code,full_name,class_name,section')
      .eq('school_id', schoolId)
      .eq('branch_id', branchId)
      .eq('status', 'active')
      .order('full_name')
      .then(({ data }: { data: any[] | null }) => {
        if (!cancelled) setStudents(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [schoolId, branchId])
  const add = (item: CartItem) =>
    setCart((items) => {
      const cartKey = item.id + '|' + JSON.stringify(item.selectedVariants || [])
      const normalized = { ...item, id: cartKey }
      const f = items.find((x) => x.id === cartKey)
      return f
        ? items.map((x) => (x.id === cartKey ? { ...x, quantity: x.quantity + item.quantity } : x))
        : [...items, normalized]
    })
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
        onBack={() => setPage('dashboard')}
        onLogout={onLogout}
        cartCount={cart.reduce((s, x) => s + x.quantity, 0)}
        onCart={() => setCheckout('cart')}
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
      <CustomerPageFrame
        onBack={() => setPage('dashboard')}
        onLogout={onLogout}
        cartCount={cart.reduce((s, x) => s + x.quantity, 0)}
        onCart={() => setCheckout('cart')}
      >
        <ProductDetail
          item={selected}
          onBack={() => setPage('dashboard')}
          onAdd={(x) => {
            add(x)
            setSelected(null)
          }}
        />
      </CustomerPageFrame>
    )
  return (
    <div className="portal">
      <GlobalHeader
        portal="customer"
        title="Parent / Student Portal"
        subtitle={schoolName + ' • ' + branchName}
        onBack={() => setPage('dashboard')}
        backLabel="Dashboard"
        onLogout={onLogout}
        cartCount={cart.reduce((s, x) => s + x.quantity, 0)}
        onCart={() => setCheckout('cart')}
      />
      <div className="portal-layout">
        <aside className="sidebar">
          <div className="school-scope">
            <Building2 size={16} />
            <div>
              <strong>{schoolName}</strong>
              <span>{branchName}</span>
            </div>
          </div>
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
                {page === 'dashboard' && <span>, {studentId}</span>}
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
            <Dashboard setPage={setPage} />
          ) : page === 'packages' ? (
            <Packages branchId={branchId} onView={setSelected} onAdd={add} />
          ) : page === 'products' ? (
            <Products branchId={branchId} onView={setSelected} onAdd={add} />
          ) : page === 'orders' ? (
            <Orders />
          ) : (
            <Profile studentId={studentId} />
          )}
        </main>
      </div>
    </div>
  )
}
function Dashboard({ setPage }: { setPage: (p: CustomerPage) => void }) {
  return (
    <div className="portal-content">
      <div className="welcome-banner">
        <div>
          <p className="eyebrow">YOUR SCHOOL STORE</p>
          <h2>Uniform shopping, organized for you.</h2>
          <p>Choose a complete package for the term or replace individual items as needed.</p>
          <button className="hero-primary" onClick={() => setPage('packages')}>
            Explore Uniform Packages <ArrowRight size={17} />
          </button>
        </div>
        <div className="banner-icon">
          <ShoppingBag size={58} />
        </div>
      </div>
      <div className="portal-grid">
        <Stat title="Active orders" value="0" icon={<ClipboardList />} />
        <Stat title="Saved items" value="0" icon={<Package />} />
        <Stat title="School branch" value="Active" icon={<Building2 />} />
      </div>
      <div className="section-row">
        <p className="eyebrow">SHOP</p>
        <h2>Start with what you need</h2>
      </div>
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
          .select('id,name,description,gender,image_url,base_price')
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
            <ProductCard key={x.id} {...x} onView={() => onView(x)} onAdd={() => onAdd(x)} />
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
        .select('id,name,description,gender,image_url,base_price')
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
        gender: string | null
        image_url: string | null
        base_price: number | null
      }>
      const priceMap = Object.fromEntries(branchProducts.map((x) => [x.product_id, x.branch_price]))
      const pv = await client
        .from('product_variants')
        .select('id,product_id,size_label,variant_name')
        .in('product_id', ids)
        .eq('status', 'active')
        .order('size_label')
      const variants = (pv.data ?? []) as Array<{
        id: string
        product_id: string
        size_label: string | null
        variant_name: string | null
      }>
      const sizes: Record<string, string[]> = Object.fromEntries(ids.map((id) => [id, []]))
      const variantOptions: Record<string, { id: string; label: string }[]> = Object.fromEntries(
        ids.map((id) => [id, []]),
      )
      variants.forEach((x) => {
        if (x.size_label && sizes[x.product_id] && !sizes[x.product_id].includes(x.size_label)) {
          sizes[x.product_id].push(x.size_label)
          variantOptions[x.product_id].push({ id: x.id, label: x.size_label })
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
            sourceId: x.id,
            image: x.image_url || '/category-accessories.jpg',
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
            <ProductCard key={x.id} {...x} onView={() => onView(x)} onAdd={() => onAdd(x)} />
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
}: {
  item: CartItem
  onBack: () => void
  onAdd: (x: CartItem) => void
}) {
  const [size, setSize] = useState(''),
    [quantity, setQuantity] = useState(1),
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
        <div className="detail-image">
          <img
            src={item.image || '/category-packages.jpg'}
            alt={item.title}
            onError={(e) => {
              e.currentTarget.src = '/category-packages.jpg'
            }}
          />
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
          {item.bundleItems?.length ? (
            <div className="bundle-list">
              <strong>Package includes</strong>
              {item.bundleItems.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
          ) : null}
          <strong className="detail-price">₹{item.price.toLocaleString('en-IN')}</strong>
          {item.type === 'product' ? (
            <label>
              Size
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">Select size</option>
                {productOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="package-size-list">
              <strong>Select sizes for this package</strong>
              {packageComponents.map((x) => (
                <label key={x.packageItemId}>
                  {x.title}
                  {x.quantity > 1 ? ' × ' + x.quantity : ''}
                  {x.requiresSize && x.required ? <span>*</span> : null}
                  {x.requiresSize ? (
                    <select
                      value={bundleSizes[x.packageItemId] || ''}
                      onChange={(e) =>
                        setBundleSizes((v) => ({ ...v, [x.packageItemId]: e.target.value }))
                      }
                    >
                      <option value="">Select size</option>
                      {x.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <small>No size selection required</small>
                  )}
                </label>
              ))}
            </div>
          )}
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
        </div>
      </div>
    </div>
  )
}

function Orders() {
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
          {rows.map((x) => (
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
          <h3>No orders yet</h3>
          <p>Your completed orders will appear here.</p>
        </div>
      )}
    </div>
  )
}
function Profile({ studentId }: { studentId: string }) {
  return (
    <div className="portal-content">
      <div className="profile-card">
        <div className="profile-avatar">{studentId.slice(0, 1).toUpperCase()}</div>
        <div>
          <span>Login ID</span>
          <strong>{studentId}</strong>
        </div>
        <div>
          <span>Account type</span>
          <strong>Parent / Student</strong>
        </div>
        <div>
          <span>Access</span>
          <strong>School Store</strong>
        </div>
      </div>
    </div>
  )
}

export default CustomerPortal
