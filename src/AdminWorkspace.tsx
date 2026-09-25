import { useEffect, useState, type ReactNode } from 'react'
import { Plus, RefreshCw, Save, Trash2, Search, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import { GlobalFooter, GlobalHeader } from './components/GlobalChrome'

const dbFrom = (table: string): any => (supabase as any)?.from(table)

type ModuleKey =
  | 'schools'
  | 'products'
  | 'packages'
  | 'orders'
  | 'payments'
  | 'inventory'
  | 'students'
  | 'reports'
  | 'catalog'
  | 'coupons'

const META: Record<ModuleKey, { title: string; description: string }> = {
  schools: {
    title: 'Schools & Branches',
    description: 'Manage schools, branches, contact details and active status.',
  },
  products: {
    title: 'Products & Variants',
    description: 'Manage individual uniform products, sizes, SKUs and prices.',
  },
  packages: {
    title: 'Uniform Packages',
    description: 'Build packages from your individual products.',
  },
  orders: { title: 'Orders', description: 'Review customer orders, totals and order status.' },
  payments: { title: 'Payments', description: 'Review payment transactions and payment status.' },
  inventory: { title: 'Inventory', description: 'Monitor stock by branch, product and variant.' },
  students: {
    title: 'Parents & Students',
    description: 'Manage student records and school relationships.',
  },
  reports: {
    title: 'Reports',
    description: 'View high-level sales, orders and inventory summaries.',
  },
  catalog: {
    title: 'Catalog Rules',
    description: 'Control branch-specific products, prices and visibility.',
  },
  coupons: {
    title: 'Coupons',
    description: 'Manage promotional discounts and branch availability.',
  },
}

export default function AdminWorkspace({
  module,
  onBack,
}: {
  module: ModuleKey
  onBack: () => void
}) {
  const m = META[module]
  return (
    <div className="admin-workspace">
      <GlobalHeader
        portal="admin"
        title="Admin Portal"
        subtitle="School Uniform Store"
        onBack={onBack}
        backLabel="Dashboard"
      />
      <main className={`workspace-body workspace-${module}`}>
        <div
          className="workspace-heading"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div>
            <h1>{m.title}</h1>
            <p>{m.description}</p>
          </div>
          {module === 'payments' ? (
            <button
              className="secondary-button"
              onClick={() => window.dispatchEvent(new CustomEvent('payments:refresh'))}
              style={{ flexShrink: 0 }}
            >
              <RefreshCw size={15} /> Refresh
            </button>
          ) : null}
        </div>
        <ModuleBody module={module} />
      </main>
      <GlobalFooter portal="admin" />
    </div>
  )
}

function ModuleBody({ module }: { module: ModuleKey }) {
  switch (module) {
    case 'schools':
      return <Schools />
    case 'products':
      return <Products />
    case 'packages':
      return <Packages />
    case 'orders':
      return <OrdersAdmin />
    case 'payments':
      return <PaymentsAdmin />
    case 'inventory':
      return <InventoryAdmin />
    case 'students':
      return <ParentStudents />
    case 'reports':
      return <Reports />
    case 'catalog':
      return <Catalog />
    case 'coupons':
      return <Coupons />
  }
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="workspace-panel">{children}</section>
}
function Toolbar({ children, onRefresh }: { children?: ReactNode; onRefresh: () => void }) {
  return (
    <div className="workspace-toolbar">
      <div>{children}</div>
      <button className="secondary-button" onClick={onRefresh}>
        <RefreshCw size={15} /> Refresh
      </button>
    </div>
  )
}
function Loading() {
  return <div className="workspace-empty">Loading...</div>
}
function ErrorBox({ text }: { text: string }) {
  return text ? <div className="workspace-error">{text}</div> : null
}

function Schools() {
  const [schools, setSchools] = useState<any[]>([]),
    [branches, setBranches] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [branchEditing, setBranchEditing] = useState<any>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const a = await dbFrom('schools').select('*').order('name')
    const b = await dbFrom('branches').select('*').order('name')
    setSchools(a.data ?? [])
    setBranches(b.data ?? [])
    setError(a.error?.message || b.error?.message || '')
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])
  const saveSchool = async () => {
    if (!supabase || !editing) return
    const payload = {
      name: editing.name,
      code: editing.code,
      logo_url: editing.logo_url || null,
      status: editing.status,
    }
    const r = editing.id
      ? await dbFrom('schools').update(payload).eq('id', editing.id)
      : await dbFrom('schools').insert(payload)
    if (r.error) setError(r.error.message)
    else {
      setEditing(null)
      await load()
    }
  }
  const saveBranch = async () => {
    if (!supabase || !branchEditing) return
    const payload = {
      school_id: branchEditing.school_id,
      name: branchEditing.name,
      code: branchEditing.code,
      address_line1: branchEditing.address_line1 || null,
      address_line2: branchEditing.address_line2 || null,
      city: branchEditing.city || null,
      state: branchEditing.state || null,
      postal_code: branchEditing.postal_code || null,
      phone: branchEditing.phone || null,
      email: branchEditing.email || null,
      status: branchEditing.status,
    }
    const r = branchEditing.id
      ? await dbFrom('branches').update(payload).eq('id', branchEditing.id)
      : await dbFrom('branches').insert(payload)
    if (r.error) setError(r.error.message)
    else {
      setBranchEditing(null)
      await load()
    }
  }
  return (
    <>
      <Toolbar onRefresh={load}>
        <button
          className="primary-button"
          onClick={() => setEditing({ name: '', code: '', status: 'active' })}
        >
          <Plus size={15} /> Add School
        </button>
      </Toolbar>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <Panel>
            <h2>Schools</h2>
            <div className="workspace-table">
              <div className="workspace-row admin-table-header school-row">
                <strong>School</strong>
                <span>Code</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {schools.map((x) => (
                <div className="workspace-row school-row" key={x.id}>
                  <strong>{x.name}</strong>
                  <span>{x.code}</span>
                  <span>{x.status}</span>
                  <button onClick={() => setEditing({ ...x })}>Edit</button>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <div className="panel-heading">
              <h2>Branches</h2>
              <button
                className="secondary-button"
                onClick={() =>
                  setBranchEditing({
                    school_id: schools[0]?.id || '',
                    name: '',
                    code: '',
                    status: 'active',
                  })
                }
              >
                <Plus size={15} /> Add Branch
              </button>
            </div>
            <div className="workspace-table">
              <div className="workspace-row admin-table-header branch-row">
                <strong>Branch</strong>
                <span>School</span>
                <span>Code</span>
                <span>Actions</span>
              </div>
              {branches.map((x) => (
                <div className="workspace-row branch-row" key={x.id}>
                  <strong>{x.name}</strong>
                  <span>{schools.find((s) => s.id === x.school_id)?.name || '—'}</span>
                  <span>{x.code}</span>
                  <button onClick={() => setBranchEditing({ ...x })}>Edit</button>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
      {editing && (
        <EditModal
          title={editing.id ? 'Edit School' : 'Add School'}
          onClose={() => setEditing(null)}
          onSave={saveSchool}
        >
          <Field
            label="School Name"
            value={editing.name}
            onChange={(v) => setEditing({ ...editing, name: v })}
          />
          <Field
            label="Code"
            value={editing.code}
            onChange={(v) => setEditing({ ...editing, code: v })}
          />
          <Field
            label="Logo URL"
            value={editing.logo_url || ''}
            onChange={(v) => setEditing({ ...editing, logo_url: v })}
          />
          <Select
            label="Status"
            value={editing.status}
            options={['active', 'inactive', 'suspended']}
            onChange={(v) => setEditing({ ...editing, status: v })}
          />
        </EditModal>
      )}
      {branchEditing && (
        <EditModal
          title={branchEditing.id ? 'Edit Branch' : 'Add Branch'}
          onClose={() => setBranchEditing(null)}
          onSave={saveBranch}
        >
          <Select
            label="School"
            value={branchEditing.school_id}
            options={schools.map((x) => x.id)}
            labels={Object.fromEntries(schools.map((x) => [x.id, x.name]))}
            onChange={(v) => setBranchEditing({ ...branchEditing, school_id: v })}
          />
          <Field
            label="Branch Name"
            value={branchEditing.name}
            onChange={(v) => setBranchEditing({ ...branchEditing, name: v })}
          />
          <Field
            label="Code"
            value={branchEditing.code}
            onChange={(v) => setBranchEditing({ ...branchEditing, code: v })}
          />
          <Field
            label="City"
            value={branchEditing.city || ''}
            onChange={(v) => setBranchEditing({ ...branchEditing, city: v })}
          />
          <Field
            label="State"
            value={branchEditing.state || ''}
            onChange={(v) => setBranchEditing({ ...branchEditing, state: v })}
          />
          <Field
            label="Phone"
            value={branchEditing.phone || ''}
            onChange={(v) => setBranchEditing({ ...branchEditing, phone: v })}
          />
          <Select
            label="Status"
            value={branchEditing.status}
            options={['active', 'inactive', 'suspended']}
            onChange={(v) => setBranchEditing({ ...branchEditing, status: v })}
          />
        </EditModal>
      )}
    </>
  )
}

function Products() {
  const [rows, setRows] = useState<any[]>([]),
    [categories, setCategories] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [variantEditing, setVariantEditing] = useState<any>(null),
    [variants, setVariants] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState('')
  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const [p, c] = await Promise.all([
      dbFrom('products').select('*').order('name'),
      dbFrom('product_categories').select('*').eq('status', 'active').order('name'),
    ])
    setRows(p.data ?? [])
    setCategories(c.data ?? [])
    setError(p.error?.message || c.error?.message || '')
    setLoading(false)
  }
  const loadVariants = async (productId: string) => {
    if (!supabase) return
    const r = await dbFrom('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('size_label')
    setVariants(r.data ?? [])
    if (r.error) setError(r.error.message || '')
  }
  useEffect(() => {
    void load()
  }, [])
  const save = async () => {
    if (!supabase || !editing) return
    const slug = (editing.slug || editing.name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const p = {
      category_id: editing.category_id || null,
      name: editing.name,
      slug,
      description: editing.description || null,
      gender: editing.gender,
      image_url: editing.image_url || null,
      base_price: Number(editing.base_price || 0),
      status: editing.status,
    }
    const r = editing.id
      ? await dbFrom('products').update(p).eq('id', editing.id)
      : await dbFrom('products').insert(p)
    if (r.error) setError(r.error.message)
    else {
      setEditing(null)
      await load()
    }
  }
  const saveVariant = async () => {
    if (!supabase || !variantEditing) return
    const p = {
      product_id: variantEditing.product_id,
      sku: variantEditing.sku,
      size_label: variantEditing.size_label || null,
      color: variantEditing.color || null,
      variant_name: variantEditing.variant_name || null,
      price: variantEditing.price === '' ? null : Number(variantEditing.price || 0),
      status: variantEditing.status,
    }
    const r = variantEditing.id
      ? await dbFrom('product_variants').update(p).eq('id', variantEditing.id)
      : await dbFrom('product_variants').insert(p)
    if (r.error) setError(r.error.message)
    else {
      setVariantEditing(null)
      await loadVariants(variantEditing.product_id)
    }
  }
  const visible = rows.filter((x) => x.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <Toolbar onRefresh={load}>
        <div className="toolbar-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
          />
        </div>
        <button
          className="primary-button"
          onClick={() =>
            setEditing({
              name: '',
              gender: 'unisex',
              base_price: 0,
              status: 'active',
              category_id: categories[0]?.id || '',
            })
          }
        >
          <Plus size={15} /> Add Product
        </button>
      </Toolbar>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <Panel>
          <div className="workspace-table">
            <div className="workspace-row product-row product-table-header" role="row">
              <strong>Product</strong>
              <span>Category</span>
              <span>Gender</span>
              <span>Base Price</span>
              <span>Actions</span>
            </div>
            {visible.map((x) => (
              <div className="workspace-row product-row" key={x.id}>
                <strong>{x.name}</strong>
                <span>
                  {categories.find((c) => c.id === x.category_id)?.name || 'Uncategorized'}
                </span>
                <span>{x.gender}</span>
                <span>₹{Number(x.base_price || 0).toLocaleString('en-IN')}</span>
                <button
                  onClick={() => {
                    setEditing({ ...x })
                    void loadVariants(x.id)
                  }}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {editing && (
        <EditModal
          title={editing.id ? 'Edit Product' : 'Add Product'}
          onClose={() => {
            setEditing(null)
            setVariants([])
          }}
          onSave={save}
        >
          <Field
            label="Name"
            value={editing.name}
            onChange={(v) => setEditing({ ...editing, name: v })}
          />
          <Select
            label="Category"
            value={editing.category_id || ''}
            options={categories.map((x) => x.id)}
            labels={Object.fromEntries(categories.map((x) => [x.id, x.name]))}
            onChange={(v) => setEditing({ ...editing, category_id: v })}
          />
          <Field
            label="Description"
            value={editing.description || ''}
            onChange={(v) => setEditing({ ...editing, description: v })}
            area
          />
          <Select
            label="Gender"
            value={editing.gender}
            options={['boys', 'girls', 'unisex']}
            onChange={(v) => setEditing({ ...editing, gender: v })}
          />
          <Field
            label="Base Price"
            value={String(editing.base_price ?? 0)}
            onChange={(v) => setEditing({ ...editing, base_price: v })}
            type="number"
          />
          <Field
            label="Image URL"
            value={editing.image_url || ''}
            onChange={(v) => setEditing({ ...editing, image_url: v })}
          />
          <Select
            label="Status"
            value={editing.status}
            options={['active', 'inactive', 'suspended']}
            onChange={(v) => setEditing({ ...editing, status: v })}
          />
          {editing.id && (
            <>
              <div className="panel-heading">
                <h3>Variants</h3>
                <button
                  className="secondary-button"
                  onClick={() =>
                    setVariantEditing({
                      product_id: editing.id,
                      sku: '',
                      size_label: '',
                      color: '',
                      variant_name: '',
                      price: editing.base_price,
                      status: 'active',
                    })
                  }
                >
                  <Plus size={14} /> Add Variant
                </button>
              </div>
              <div className="workspace-table">
                <div className="workspace-row product-row variant-row admin-table-header">
                  <strong>SKU</strong>
                  <span>Size</span>
                  <span>Color</span>
                  <span>Price</span>
                  <span>Actions</span>
                </div>
                {variants.map((v) => (
                  <div className="workspace-row product-row variant-row" key={v.id}>
                    <strong>{v.sku}</strong>
                    <span>{v.size_label || '—'}</span>
                    <span>{v.color || '—'}</span>
                    <span>₹{Number(v.price ?? editing.base_price).toLocaleString('en-IN')}</span>
                    <button onClick={() => setVariantEditing({ ...v })}>Edit</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </EditModal>
      )}
      {variantEditing && (
        <EditModal
          title={variantEditing.id ? 'Edit Variant' : 'Add Variant'}
          onClose={() => setVariantEditing(null)}
          onSave={saveVariant}
        >
          <Field
            label="SKU"
            value={variantEditing.sku}
            onChange={(v) => setVariantEditing({ ...variantEditing, sku: v })}
          />
          <Field
            label="Size"
            value={variantEditing.size_label || ''}
            onChange={(v) => setVariantEditing({ ...variantEditing, size_label: v })}
          />
          <Field
            label="Color"
            value={variantEditing.color || ''}
            onChange={(v) => setVariantEditing({ ...variantEditing, color: v })}
          />
          <Field
            label="Variant Name"
            value={variantEditing.variant_name || ''}
            onChange={(v) => setVariantEditing({ ...variantEditing, variant_name: v })}
          />
          <Field
            label="Price"
            value={String(variantEditing.price ?? '')}
            onChange={(v) => setVariantEditing({ ...variantEditing, price: v })}
            type="number"
          />
          <Select
            label="Status"
            value={variantEditing.status}
            options={['active', 'inactive', 'suspended']}
            onChange={(v) => setVariantEditing({ ...variantEditing, status: v })}
          />
        </EditModal>
      )}
    </>
  )
}

function Packages() {
  const [rows, setRows] = useState<any[]>([]),
    [products, setProducts] = useState<any[]>([]),
    [items, setItems] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [itemEditing, setItemEditing] = useState<any>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const [p, x] = await Promise.all([
      dbFrom('uniform_packages').select('*').order('name'),
      dbFrom('products').select('id,name,gender,base_price').eq('status', 'active').order('name'),
    ])
    setRows(p.data ?? [])
    setProducts(x.data ?? [])
    setError(p.error?.message || x.error?.message || '')
    setLoading(false)
  }
  const loadItems = async (packageId: string) => {
    if (!supabase) return
    const r = await dbFrom('package_items')
      .select('*')
      .eq('package_id', packageId)
      .order('sort_order')
    setItems(r.data ?? [])
    if (r.error) setError(r.error.message || '')
  }
  useEffect(() => {
    void load()
  }, [])
  const save = async () => {
    if (!supabase || !editing) return
    const slug = (editing.slug || editing.name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const p = {
      name: editing.name,
      slug,
      description: editing.description || null,
      gender: editing.gender,
      image_url: editing.image_url || null,
      base_price: Number(editing.base_price || 0),
      status: editing.status,
    }
    const r = editing.id
      ? await dbFrom('uniform_packages').update(p).eq('id', editing.id)
      : await dbFrom('uniform_packages').insert(p)
    if (r.error) setError(r.error.message)
    else {
      setEditing(null)
      await load()
    }
  }
  const saveItem = async () => {
    if (!supabase || !itemEditing) return
    const p = {
      package_id: itemEditing.package_id,
      product_id: itemEditing.product_id,
      quantity: Number(itemEditing.quantity || 1),
      is_required: itemEditing.is_required !== false,
      requires_size: itemEditing.requires_size !== false,
      selection_group: itemEditing.selection_group || null,
      sort_order: Number(itemEditing.sort_order || 0),
    }
    const r = itemEditing.id
      ? await dbFrom('package_items').update(p).eq('id', itemEditing.id)
      : await dbFrom('package_items').insert(p)
    if (r.error) setError(r.error.message)
    else {
      setItemEditing(null)
      await loadItems(itemEditing.package_id)
    }
  }
  return (
    <>
      <Toolbar onRefresh={load}>
        <button
          className="primary-button"
          onClick={() =>
            setEditing({ name: '', gender: 'unisex', base_price: 0, status: 'active' })
          }
        >
          <Plus size={15} /> Add Package
        </button>
      </Toolbar>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <Panel>
          <div className="workspace-table">
            <div className="workspace-row package-row admin-table-header">
              <strong>Package</strong>
              <span>Gender</span>
              <span>Base Price</span>
              <span>Items</span>
              <span>Actions</span>
            </div>
            {rows.map((x) => (
              <div className="workspace-row package-row" key={x.id}>
                <strong>{x.name}</strong>
                <span>{x.gender}</span>
                <span>₹{Number(x.base_price || 0).toLocaleString('en-IN')}</span>
                <span>{items.length && editing?.id === x.id ? '' : 'Package items available'}</span>
                <button
                  onClick={() => {
                    setEditing({ ...x })
                    void loadItems(x.id)
                  }}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {editing && (
        <EditModal
          title={editing.id ? 'Edit Package' : 'Add Package'}
          onClose={() => {
            setEditing(null)
            setItems([])
          }}
          onSave={save}
        >
          <Field
            label="Name"
            value={editing.name}
            onChange={(v) => setEditing({ ...editing, name: v })}
          />
          <Select
            label="Gender"
            value={editing.gender}
            options={['boys', 'girls', 'unisex']}
            onChange={(v) => setEditing({ ...editing, gender: v })}
          />
          <Field
            label="Base Price"
            value={String(editing.base_price ?? 0)}
            onChange={(v) => setEditing({ ...editing, base_price: v })}
            type="number"
          />
          <Field
            label="Description"
            value={editing.description || ''}
            onChange={(v) => setEditing({ ...editing, description: v })}
            area
          />
          <Field
            label="Image URL"
            value={editing.image_url || ''}
            onChange={(v) => setEditing({ ...editing, image_url: v })}
          />
          <Select
            label="Status"
            value={editing.status}
            options={['active', 'inactive', 'suspended']}
            onChange={(v) => setEditing({ ...editing, status: v })}
          />
          {editing.id && (
            <>
              <div className="panel-heading">
                <h3>Package Items</h3>
                <button
                  className="secondary-button"
                  onClick={() =>
                    setItemEditing({
                      package_id: editing.id,
                      product_id: products[0]?.id || '',
                      quantity: 1,
                      is_required: true,
                      requires_size: true,
                      selection_group: '',
                      sort_order: items.length,
                    })
                  }
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              <div className="workspace-table">
                <div className="workspace-row admin-table-header package-item-row">
                  <strong>Product</strong>
                  <span>Quantity</span>
                  <span>Requirement</span>
                  <span>Size</span>
                  <span>Actions</span>
                </div>
                {items.map((i) => (
                  <div className="workspace-row package-item-row" key={i.id}>
                    <strong>
                      {products.find((p) => p.id === i.product_id)?.name || i.product_id}
                    </strong>
                    <span>Qty {i.quantity}</span>
                    <span>{i.is_required ? 'Required' : 'Optional'}</span>
                    <span>{i.requires_size ? 'Size required' : 'No size'}</span>
                    <button onClick={() => setItemEditing({ ...i })}>Edit</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </EditModal>
      )}
      {itemEditing && (
        <EditModal
          title={itemEditing.id ? 'Edit Package Item' : 'Add Package Item'}
          onClose={() => setItemEditing(null)}
          onSave={saveItem}
        >
          <Select
            label="Product"
            value={itemEditing.product_id}
            options={products.map((x) => x.id)}
            labels={Object.fromEntries(products.map((x) => [x.id, x.name]))}
            onChange={(v) => setItemEditing({ ...itemEditing, product_id: v })}
          />
          <Field
            label="Quantity"
            value={String(itemEditing.quantity)}
            onChange={(v) => setItemEditing({ ...itemEditing, quantity: v })}
            type="number"
          />
          <Field
            label="Selection Group"
            value={itemEditing.selection_group || ''}
            onChange={(v) => setItemEditing({ ...itemEditing, selection_group: v })}
          />
          <Field
            label="Sort Order"
            value={String(itemEditing.sort_order || 0)}
            onChange={(v) => setItemEditing({ ...itemEditing, sort_order: v })}
            type="number"
          />
          <Select
            label="Required"
            value={itemEditing.is_required ? 'yes' : 'no'}
            options={['yes', 'no']}
            onChange={(v) => setItemEditing({ ...itemEditing, is_required: v === 'yes' })}
          />
          <Select
            label="Requires Size"
            value={itemEditing.requires_size ? 'yes' : 'no'}
            options={['yes', 'no']}
            onChange={(v) => setItemEditing({ ...itemEditing, requires_size: v === 'yes' })}
          />
        </EditModal>
      )}
    </>
  )
}

function OrdersAdmin() {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState('')
  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const [o, p, s, b] = await Promise.all([
      dbFrom('orders').select('*').order('created_at', { ascending: false }),
      dbFrom('profiles').select('id,full_name,login_id'),
      dbFrom('students').select('id,full_name,student_code'),
      dbFrom('branches').select('id,name'),
    ])
    const pm = Object.fromEntries((p.data ?? []).map((x: any) => [x.id, x]))
    const sm = Object.fromEntries((s.data ?? []).map((x: any) => [x.id, x]))
    const bm = Object.fromEntries((b.data ?? []).map((x: any) => [x.id, x]))
    setRows(
      (o.data ?? []).map((x: any) => ({
        ...x,
        customer: pm[x.customer_user_id]?.full_name || pm[x.customer_user_id]?.login_id || '—',
        student: sm[x.student_id]?.full_name || sm[x.student_id]?.student_code || '—',
        branch: bm[x.branch_id]?.name || '—',
      })),
    )
    setError(o.error?.message || p.error?.message || s.error?.message || b.error?.message || '')
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])
  const filtered = rows.filter((x) =>
    [x.order_number, x.status, x.customer, x.student, x.branch].some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase()),
    ),
  )
  return (
    <>
      <Toolbar onRefresh={load}>
        <div className="toolbar-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders"
          />
        </div>
      </Toolbar>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <Panel>
          <div className="workspace-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Student</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <strong>{x.order_number}</strong>
                    </td>
                    <td>{x.customer}</td>
                    <td>{x.student}</td>
                    <td>{x.branch}</td>
                    <td>{x.status}</td>
                    <td>₹{Number(x.grand_total || 0).toLocaleString('en-IN')}</td>
                    <td>{new Date(x.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  )
}

function PaymentsAdmin() {
  const [rows, setRows] = useState<any[]>([]),
    [settings, setSettings] = useState<any[]>([]),
    [branches, setBranches] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const [p, o, b, s] = await Promise.all([
      dbFrom('payments').select('*').order('created_at', { ascending: false }),
      dbFrom('orders').select('id,order_number,status'),
      dbFrom('branches').select('id,name').order('name'),
      dbFrom('branch_payment_settings').select('*'),
    ])
    const om = Object.fromEntries((o.data ?? []).map((x: any) => [x.id, x]))
    setRows(
      (p.data ?? []).map((x: any) => ({
        ...x,
        order_number: om[x.order_id]?.order_number || '—',
        order_status: om[x.order_id]?.status || 'pending',
      })),
    )
    setBranches(b.data ?? [])
    setSettings(s.data ?? [])
    setError(p.error?.message || o.error?.message || b.error?.message || s.error?.message || '')
    setLoading(false)
  }

  useEffect(() => {
    void load()
    const refreshHandler = () => void load()
    window.addEventListener('payments:refresh', refreshHandler)
    return () => window.removeEventListener('payments:refresh', refreshHandler)
  }, [])

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!supabase || !orderId) return
    setUpdatingStatus(orderId)
    const result = await dbFrom('orders')
      .update({ status })
      .eq('id', orderId)
      .select('id,status')
      .maybeSingle()
    if (result.error) {
      setError(result.error.message)
    } else {
      setRows((current) =>
        current.map((row) => (row.order_id === orderId ? { ...row, order_status: status } : row)),
      )
    }
    setUpdatingStatus(null)
  }

  const value = (branchId: string) =>
    settings.find((x) => x.branch_id === branchId) || {
      branch_id: branchId,
      pay_at_school_enabled: true,
      upi_enabled: false,
      upi_id: '',
      upi_payee_name: '',
      shipping_fee: 0,
      free_shipping_above: 0,
    }

  const save = async (row: any) => {
    if (!supabase) return
    setUpdatingStatus(row.branch_id)
    const r = await dbFrom('branch_payment_settings').upsert(
      {
        branch_id: row.branch_id,
        pay_at_school_enabled: !!row.pay_at_school_enabled,
        upi_enabled: !!row.upi_enabled,
        upi_id: row.upi_id?.trim() || null,
        upi_payee_name: row.upi_payee_name?.trim() || null,
        shipping_fee: Number(row.shipping_fee || 0),
        free_shipping_above: Number(row.free_shipping_above || 0),
      },
      { onConflict: 'branch_id' },
    )
    if (r.error) setError(r.error.message)
    else await load()
    setUpdatingStatus(null)
  }

  const orderStatusOptions = [
    ['pending', 'Order Received'],
    ['confirmed', 'Order Confirmed'],
    ['processing', 'Order Processing'],
    ['ready', 'Order Ready'],
    ['packed', 'Order Packed'],
    ['shipped', 'Order Shipped'],
    ['out_for_delivery', 'Out for Delivery'],
    ['delivered', 'Order Delivered'],
    ['cancelled', 'Order Cancelled'],
    ['return_requested', 'Return Requested'],
    ['return_approved', 'Return Approved'],
    ['returned', 'Order Returned'],
    ['refund_processing', 'Refund Processing'],
    ['refunded', 'Refund Completed'],
  ]

  return (
    <>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <Panel>
            <div className="panel-heading">
              <h2>Branch Payment Settings</h2>
              <span className="workspace-muted">
                Controls checkout payment methods, UPI and delivery charges.
              </span>
            </div>
            <div className="workspace-table">
              <div className="workspace-row payment-settings-row admin-table-header">
                <strong>Branch</strong>
                <span>Pay at School</span>
                <span>UPI</span>
                <span>UPI ID</span>
                <span>Payee Name</span>
                <span>Shipping</span>
                <span>Free Above</span>
                <span>Actions</span>
              </div>
              {branches.map((b) => {
                const row = value(b.id)
                return (
                  <div className="workspace-row payment-settings-row" key={b.id}>
                    <strong>{b.name}</strong>
                    <label className="admin-inline-check">
                      <input
                        type="checkbox"
                        checked={!!row.pay_at_school_enabled}
                        onChange={(e) =>
                          setSettings((v) => [
                            ...v.filter((x) => x.branch_id !== b.id),
                            { ...row, pay_at_school_enabled: e.target.checked },
                          ])
                        }
                      />{' '}
                      Pay at School
                    </label>
                    <label className="admin-inline-check">
                      <input
                        type="checkbox"
                        checked={!!row.upi_enabled}
                        onChange={(e) =>
                          setSettings((v) => [
                            ...v.filter((x) => x.branch_id !== b.id),
                            { ...row, upi_enabled: e.target.checked },
                          ])
                        }
                      />{' '}
                      UPI
                    </label>
                    <input
                      className="admin-mini-input"
                      value={row.upi_id || ''}
                      placeholder="UPI ID"
                      onChange={(e) =>
                        setSettings((v) => [
                          ...v.filter((x) => x.branch_id !== b.id),
                          { ...row, upi_id: e.target.value },
                        ])
                      }
                    />
                    <input
                      className="admin-mini-input"
                      value={row.upi_payee_name || ''}
                      placeholder="Payee name"
                      onChange={(e) =>
                        setSettings((v) => [
                          ...v.filter((x) => x.branch_id !== b.id),
                          { ...row, upi_payee_name: e.target.value },
                        ])
                      }
                    />
                    <input
                      className="admin-mini-input"
                      type="number"
                      min="0"
                      value={row.shipping_fee ?? 0}
                      placeholder="Shipping"
                      onChange={(e) =>
                        setSettings((v) => [
                          ...v.filter((x) => x.branch_id !== b.id),
                          { ...row, shipping_fee: e.target.value },
                        ])
                      }
                    />
                    <input
                      className="admin-mini-input"
                      type="number"
                      min="0"
                      value={row.free_shipping_above ?? 0}
                      placeholder="Free above"
                      onChange={(e) =>
                        setSettings((v) => [
                          ...v.filter((x) => x.branch_id !== b.id),
                          { ...row, free_shipping_above: e.target.value },
                        ])
                      }
                    />
                    <button
                      className="primary-button"
                      disabled={updatingStatus === b.id}
                      onClick={() => void save(row)}
                    >
                      {updatingStatus === b.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )
              })}
            </div>
          </Panel>
          <Panel>
            <div className="panel-heading">
              <h2>Payment Transactions</h2>
            </div>
            <div className="workspace-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Order</th>
                    <th>Provider</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.id}>
                      <td>{x.provider_payment_id || x.id.slice(0, 8)}</td>
                      <td>{x.order_number}</td>
                      <td>{x.provider || '—'}</td>
                      <td>₹{Number(x.amount || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <select
                          value={x.order_status || 'pending'}
                          disabled={!x.order_id || updatingStatus === x.order_id}
                          onChange={(e) => void updateOrderStatus(x.order_id, e.target.value)}
                          aria-label={`Order status for ${x.order_number}`}
                          style={{
                            minWidth: '150px',
                            height: '34px',
                            border: '1px solid var(--line)',
                            borderRadius: '7px',
                            padding: '0 9px',
                            background: '#fff',
                            color: 'var(--ink)',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          {orderStatusOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{x.paid_at ? new Date(x.paid_at).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </>
  )
}
function InventoryAdmin() {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState('')

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const [i, p, v, b] = await Promise.all([
      dbFrom('branch_inventory').select('*'),
      dbFrom('products').select('id,name'),
      dbFrom('product_variants').select('id,sku,size_label,product_id'),
      dbFrom('branches').select('id,name'),
    ])
    const pm = Object.fromEntries((p.data ?? []).map((x: any) => [x.id, x.name]))
    const vm = Object.fromEntries((v.data ?? []).map((x: any) => [x.id, x]))
    const bm = Object.fromEntries((b.data ?? []).map((x: any) => [x.id, x.name]))

    setRows(
      (i.data ?? []).map((x: any) => ({
        ...x,
        product_name: pm[x.product_id] || '—',
        sku: vm[x.variant_id]?.sku || '—',
        size: vm[x.variant_id]?.size_label || '—',
        branch_name: bm[x.branch_id] || '—',
      })),
    )
    setError(i.error?.message || p.error?.message || v.error?.message || b.error?.message || '')
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  const filtered = rows.filter((x) =>
    [x.branch_name, x.product_name, x.size, x.sku].some((v) =>
      String(v ?? '')
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  )

  const grouped = Array.from(
    filtered
      .reduce((map: Map<string, any>, x: any) => {
        const key = x.branch_id + '|' + x.product_id
        if (!map.has(key)) {
          map.set(key, {
            key,
            branch_id: x.branch_id,
            product_id: x.product_id,
            branch_name: x.branch_name,
            product_name: x.product_name,
            sizes: {},
            reorder_levels: [],
          })
        }
        const group = map.get(key)
        group.sizes[x.size || '—'] = {
          quantity: Number(x.quantity_on_hand || 0),
          reorder: Number(x.reorder_level || 0),
        }
        group.reorder_levels.push(Number(x.reorder_level || 0))
        return map
      }, new Map())
      .values(),
  )

  const sizes = Array.from(new Set(grouped.flatMap((x: any) => Object.keys(x.sizes)))).sort(
    (a, b) => {
      const ai = sizeOrder.indexOf(a)
      const bi = sizeOrder.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    },
  )

  return (
    <>
      <Toolbar onRefresh={load}>
        <div className="toolbar-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory"
          />
        </div>
        <button
          className="primary-button"
          onClick={() => window.dispatchEvent(new CustomEvent('admin:add-product'))}
        >
          <Plus size={15} /> Add Product
        </button>
      </Toolbar>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <Panel>
          <div className="workspace-scroll inventory-grouped-table">
            <table>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Product</th>
                  {sizes.map((size) => (
                    <th key={size}>{size}</th>
                  ))}
                  <th>Reorder</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((x: any) => {
                  const lowStock = sizes.some(
                    (size) => x.sizes[size] && x.sizes[size].quantity <= x.sizes[size].reorder,
                  )
                  const reorder = x.reorder_levels.length > 0 ? Math.max(...x.reorder_levels) : 0

                  return (
                    <tr key={x.key}>
                      <td>{x.branch_name}</td>
                      <td>{x.product_name}</td>
                      {sizes.map((size) => (
                        <td key={size} className="inventory-size-cell">
                          {x.sizes[size] ? x.sizes[size].quantity : '—'}
                        </td>
                      ))}
                      <td>{reorder}</td>
                      <td>{lowStock ? 'Low' : 'Healthy'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  )
}
function ParentStudents() {
  const [rows, setRows] = useState<any[]>([]),
    [branches, setBranches] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(''),
    [editing, setEditing] = useState<any>(null)

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const [studentsResult, branchesResult] = await Promise.all([
      dbFrom('students').select('*').order('created_at', { ascending: false }).limit(200),
      dbFrom('branches').select('id,name,school_id').order('name'),
    ])
    setRows(studentsResult.data ?? [])
    setBranches(branchesResult.data ?? [])
    setError(studentsResult.error?.message || branchesResult.error?.message || '')
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const openNew = () => {
    const firstBranch = branches[0]
    setEditing({
      id: '',
      student_code: '',
      full_name: '',
      class_name: '',
      section: '',
      gender: '',
      date_of_birth: '',
      status: 'active',
      school_id: firstBranch?.school_id || '',
      branch_id: firstBranch?.id || '',
      father_name: '',
    })
  }

  const openEdit = (student: any) => {
    setEditing({
      ...student,
      father_name: student.father_name || '',
      date_of_birth: student.date_of_birth || '',
    })
  }

  const save = async () => {
    if (!supabase || !editing) return
    if (!editing.student_code?.trim() || !editing.full_name?.trim()) {
      setError('Student Code and Full Name are required.')
      return
    }
    if (!editing.school_id || !editing.branch_id) {
      setError('School and Branch are required.')
      return
    }

    const payload = {
      school_id: editing.school_id,
      branch_id: editing.branch_id,
      student_code: editing.student_code.trim(),
      full_name: editing.full_name.trim(),
      father_name: editing.father_name?.trim() || null,
      class_name: editing.class_name || null,
      section: editing.section || null,
      gender: editing.gender || null,
      date_of_birth: editing.date_of_birth || null,
      status: editing.status || 'active',
    }

    const result = editing.id
      ? await dbFrom('students').update(payload).eq('id', editing.id).select('id').maybeSingle()
      : await dbFrom('students').insert(payload).select('id').single()

    if (result.error) {
      setError(result.error.message)
      return
    }

    const studentId = editing.id || result.data?.id
    if (!studentId) {
      setError('Student was not saved.')
      return
    }

    setEditing(null)
    await load()
  }

  const toggleStatus = async (student: any) => {
    if (!supabase || !student?.id) return
    const nextStatus =
      String(student.status || '').toLowerCase() === 'active' ? 'inactive' : 'active'
    const result = await dbFrom('students')
      .update({ status: nextStatus })
      .eq('id', student.id)
      .select('id,status')
      .maybeSingle()

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (!result.data) {
      setError(
        'Student status was not changed. Your account may not have permission to update this student.',
      )
      return
    }

    setRows((current) =>
      current.map((item) =>
        item.id === student.id ? { ...item, status: result.data.status } : item,
      ),
    )
  }

  const filtered = rows.filter((r) => {
    const fatherName = r.father_name || ''
    return [
      r.student_code,
      r.full_name,
      fatherName,
      r.class_name,
      r.section,
      r.gender,
      r.date_of_birth,
      r.status,
    ].some((v) =>
      String(v ?? '')
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
  })

  return (
    <>
      <Toolbar onRefresh={load}>
        <div className="toolbar-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parents & students"
          />
        </div>
        <button className="primary-button" onClick={openNew}>
          <Plus size={15} /> Add Student
        </button>
      </Toolbar>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <Panel>
          <div className="workspace-scroll">
            <table>
              <thead>
                <tr>
                  <th>Student Code</th>
                  <th>Father's Name</th>
                  <th>Full Name</th>
                  <th>Class Name</th>
                  <th>Section</th>
                  <th>Gender</th>
                  <th>Date of Birth</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const father = r.father_name || '—'
                  return (
                    <tr key={r.id || i}>
                      <td>{r.student_code || '—'}</td>
                      <td>{father}</td>
                      <td>{r.full_name || '—'}</td>
                      <td>{r.class_name || '—'}</td>
                      <td>{r.section || '—'}</td>
                      <td>{r.gender || '—'}</td>
                      <td>{r.date_of_birth || '—'}</td>
                      <td>{r.status || '—'}</td>
                      <td>
                        <button className="table-action-button" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {editing && (
        <EditModal
          title={editing.id ? 'Edit Student' : 'Add Student'}
          onClose={() => setEditing(null)}
          onSave={save}
        >
          <Field
            label="Student Code"
            value={editing.student_code || ''}
            onChange={(v) => setEditing({ ...editing, student_code: v })}
          />
          <Field
            label="Full Name"
            value={editing.full_name || ''}
            onChange={(v) => setEditing({ ...editing, full_name: v })}
          />
          <Field
            label="Father's Name"
            value={editing.father_name || ''}
            onChange={(v) => setEditing({ ...editing, father_name: v })}
          />
          <Select
            label="Branch"
            value={editing.branch_id || ''}
            options={branches.map((b) => b.id)}
            labels={Object.fromEntries(branches.map((b) => [b.id, b.name]))}
            onChange={(v) => {
              const branch = branches.find((b) => b.id === v)
              setEditing({
                ...editing,
                branch_id: v,
                school_id: branch?.school_id || editing.school_id,
              })
            }}
          />
          <Field
            label="Class Name"
            value={editing.class_name || ''}
            onChange={(v) => setEditing({ ...editing, class_name: v })}
          />
          <Field
            label="Section"
            value={editing.section || ''}
            onChange={(v) => setEditing({ ...editing, section: v })}
          />
          <Select
            label="Gender"
            value={editing.gender || ''}
            options={['boys', 'girls', 'unisex']}
            onChange={(v) => setEditing({ ...editing, gender: v })}
          />
          <Field
            label="Date of Birth"
            type="date"
            value={editing.date_of_birth || ''}
            onChange={(v) => setEditing({ ...editing, date_of_birth: v })}
          />
          <Select
            label="Status"
            value={editing.status || 'active'}
            options={['active', 'inactive']}
            onChange={(v) => setEditing({ ...editing, status: v })}
          />
        </EditModal>
      )}
    </>
  )
}
function SimpleTable({
  title,
  table,
  columns,
}: {
  title: string
  table: string
  columns: string[]
}) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState('')
  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const r = await (dbFrom(table as any) as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setRows(r.data ?? [])
    setError(r.error?.message || '')
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])
  const filtered = rows.filter((r) =>
    columns.some((c) =>
      String(r[c] ?? '')
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  )
  return (
    <>
      <Toolbar onRefresh={load}>
        <div className="toolbar-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={'Search ' + title.toLowerCase()}
          />
        </div>
      </Toolbar>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <Panel>
          <div className="workspace-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c.replaceAll('_', ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id || i}>
                    {columns.map((c) => (
                      <td key={c}>
                        {typeof r[c] === 'object' ? JSON.stringify(r[c]) : String(r[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  )
}

function Reports() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, products: 0, low: 0 }),
    [error, setError] = useState('')
  useEffect(() => {
    async function load() {
      if (!supabase) return
      const [o, p, i] = await Promise.all([
        dbFrom('orders').select('grand_total'),
        dbFrom('products').select('id', { count: 'exact', head: true }),
        dbFrom('branch_inventory').select('quantity_on_hand,reorder_level'),
      ])
      if (o.error || p.error || i.error)
        setError(
          o.error?.message || p.error?.message || i.error?.message || 'Unable to load reports',
        )
      setStats({
        orders: o.data?.length || 0,
        revenue: (o.data || []).reduce((a: number, x: any) => a + Number(x.grand_total || 0), 0),
        products: p.count || 0,
        low: (i.data || []).filter(
          (x: any) => Number(x.quantity_on_hand) <= Number(x.reorder_level),
        ).length,
      })
    }
    void load()
  }, [])
  return (
    <>
      <ErrorBox text={error} />
      <div className="report-grid">
        <div>
          <span>Orders</span>
          <strong>{stats.orders}</strong>
        </div>
        <div>
          <span>Revenue</span>
          <strong>₹{stats.revenue.toLocaleString('en-IN')}</strong>
        </div>
        <div>
          <span>Products</span>
          <strong>{stats.products}</strong>
        </div>
        <div>
          <span>Low Stock Items</span>
          <strong>{stats.low}</strong>
        </div>
      </div>
      <Panel>
        <h2>Operational Summary</h2>
        <p className="workspace-note">
          This report is live from the current Supabase data. Detailed date filters and exports can
          be added to the reporting workspace.
        </p>
      </Panel>
    </>
  )
}

function Catalog() {
  const [rows, setRows] = useState<any[]>([]),
    [branches, setBranches] = useState<any[]>([]),
    [products, setProducts] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [error, setError] = useState('')
  const load = async () => {
    if (!supabase) return
    const [r, b, p] = await Promise.all([
      dbFrom('branch_products').select('*'),
      dbFrom('branches').select('id,name').order('name'),
      dbFrom('products').select('id,name').eq('status', 'active').order('name'),
    ])
    setRows(r.data ?? [])
    setBranches(b.data ?? [])
    setProducts(p.data ?? [])
    setError(r.error?.message || b.error?.message || p.error?.message || '')
  }
  useEffect(() => {
    void load()
  }, [])
  const save = async () => {
    if (!supabase || !editing) return
    const payload = {
      branch_id: editing.branch_id,
      product_id: editing.product_id,
      branch_price: Number(editing.branch_price || 0),
      is_visible: editing.is_visible !== false,
    }
    const r = editing.id
      ? await dbFrom('branch_products').update(payload).eq('id', editing.id)
      : await dbFrom('branch_products').upsert(payload, { onConflict: 'branch_id,product_id' })
    if (r.error) setError(r.error.message)
    else {
      setEditing(null)
      await load()
    }
  }
  const toggle = async (x: any) => {
    if (!supabase) return
    const r = await dbFrom('branch_products')
      .update({ is_visible: !x.is_visible })
      .eq('branch_id', x.branch_id)
      .eq('product_id', x.product_id)
    if (r.error) setError(r.error.message)
    else await load()
  }
  return (
    <>
      <Toolbar onRefresh={load}>
        <button
          className="primary-button"
          onClick={() =>
            setEditing({
              branch_id: branches[0]?.id || '',
              product_id: products[0]?.id || '',
              branch_price: products[0]?.base_price || 0,
              is_visible: true,
            })
          }
        >
          <Plus size={15} /> Add New Rule
        </button>
      </Toolbar>
      <ErrorBox text={error} />
      <Panel>
        <div className="workspace-table">
          <div className="workspace-row admin-table-header catalog-row">
            <strong>Branch</strong>
            <span>Product</span>
            <span>Branch Price</span>
            <span>Visibility</span>
            <span>Actions</span>
          </div>
          {rows.map((x) => (
            <div className="workspace-row catalog-row" key={x.branch_id + x.product_id}>
              <strong>{branches.find((b) => b.id === x.branch_id)?.name || x.branch_id}</strong>
              <span>{products.find((p) => p.id === x.product_id)?.name || x.product_id}</span>
              <span>₹{Number(x.branch_price || 0).toLocaleString('en-IN')}</span>
              <span>{x.is_visible ? 'Visible' : 'Hidden'}</span>
              <button onClick={() => void toggle(x)}>{x.is_visible ? 'Hide' : 'Show'}</button>
            </div>
          ))}
        </div>
      </Panel>
      {editing && (
        <EditModal
          title={editing.id ? 'Edit Catalog Rule' : 'Add Catalog Rule'}
          onClose={() => setEditing(null)}
          onSave={save}
        >
          <Select
            label="Branch"
            value={editing.branch_id || ''}
            options={branches.map((x) => x.id)}
            labels={Object.fromEntries(branches.map((x) => [x.id, x.name]))}
            onChange={(v) => setEditing({ ...editing, branch_id: v })}
          />
          <Select
            label="Product"
            value={editing.product_id || ''}
            options={products.map((x) => x.id)}
            labels={Object.fromEntries(products.map((x) => [x.id, x.name]))}
            onChange={(v) => {
              const product = products.find((x) => x.id === v)
              setEditing({
                ...editing,
                product_id: v,
                branch_price:
                  editing.branch_price === '' || editing.branch_price === undefined
                    ? product?.base_price || 0
                    : editing.branch_price,
              })
            }}
          />
          <Field
            label="Branch Price"
            value={String(editing.branch_price ?? 0)}
            onChange={(v) => setEditing({ ...editing, branch_price: v })}
            type="number"
          />
          <Select
            label="Visibility"
            value={editing.is_visible ? 'visible' : 'hidden'}
            options={['visible', 'hidden']}
            onChange={(v) => setEditing({ ...editing, is_visible: v === 'visible' })}
          />
        </EditModal>
      )}
    </>
  )
}
function Coupons() {
  const [rows, setRows] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [error, setError] = useState('')
  const load = async () => {
    if (!supabase) return
    const r = await dbFrom('coupons').select('*').order('created_at', { ascending: false })
    setRows(r.data ?? [])
    setError(r.error?.message || '')
  }
  useEffect(() => {
    void load()
  }, [])
  const save = async () => {
    if (!supabase || !editing) return
    const p = {
      code: editing.code,
      description: editing.description || null,
      discount_type: editing.discount_type,
      discount_value: Number(editing.discount_value || 0),
      starts_at: editing.starts_at || null,
      expires_at: editing.expires_at || null,
      usage_limit: editing.usage_limit ? Number(editing.usage_limit) : null,
      status: editing.status,
    }
    const r = editing.id
      ? await dbFrom('coupons').update(p).eq('id', editing.id)
      : await dbFrom('coupons').insert(p)
    if (r.error) setError(r.error.message)
    else {
      setEditing(null)
      await load()
    }
  }
  return (
    <>
      <Toolbar onRefresh={load}>
        <button
          className="primary-button"
          onClick={() =>
            setEditing({
              code: '',
              description: '',
              discount_type: 'percentage',
              discount_value: 0,
              status: 'active',
            })
          }
        >
          <Plus size={15} /> Add Coupon
        </button>
      </Toolbar>
      <ErrorBox text={error} />
      <Panel>
        <div className="workspace-table">
          <div className="workspace-row admin-table-header coupon-row">
            <strong>Coupon</strong>
            <span>Discount Type</span>
            <span>Value</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {rows.map((x) => (
            <div className="workspace-row coupon-row" key={x.id}>
              <strong>{x.code}</strong>
              <span>{x.discount_type}</span>
              <span>{x.discount_value}</span>
              <span>{x.status}</span>
              <button onClick={() => setEditing({ ...x })}>Edit</button>
            </div>
          ))}
        </div>
      </Panel>
      {editing && (
        <EditModal
          title={editing.id ? 'Edit Coupon' : 'Add Coupon'}
          onClose={() => setEditing(null)}
          onSave={save}
        >
          <Field
            label="Code"
            value={editing.code}
            onChange={(v) => setEditing({ ...editing, code: v })}
          />
          <Field
            label="Description"
            value={editing.description || ''}
            onChange={(v) => setEditing({ ...editing, description: v })}
            area
          />
          <Select
            label="Discount Type"
            value={editing.discount_type}
            options={['percentage', 'fixed']}
            onChange={(v) => setEditing({ ...editing, discount_type: v })}
          />
          <Field
            label="Discount Value"
            value={String(editing.discount_value)}
            onChange={(v) => setEditing({ ...editing, discount_value: v })}
            type="number"
          />
          <Field
            label="Usage Limit"
            value={String(editing.usage_limit || '')}
            onChange={(v) => setEditing({ ...editing, usage_limit: v })}
            type="number"
          />
          <Select
            label="Status"
            value={editing.status}
            options={['active', 'inactive', 'suspended']}
            onChange={(v) => setEditing({ ...editing, status: v })}
          />
        </EditModal>
      )}
    </>
  )
}

function EditModal({
  title,
  onClose,
  onSave,
  children,
}: {
  title: string
  onClose: () => void
  onSave: () => void
  children: ReactNode
}) {
  return (
    <div className="workspace-modal">
      <div className="workspace-modal-card">
        <button className="workspace-close" onClick={onClose}>
          <X size={18} />
        </button>
        <h2>{title}</h2>
        <div className="workspace-form">{children}</div>
        <div className="workspace-modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={onSave}>
            <Save size={15} /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
function Field({
  label,
  value,
  onChange,
  type = 'text',
  area = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  area?: boolean
}) {
  return (
    <label className="workspace-field">
      <span>{label}</span>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}
function Select({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  labels?: Record<string, string>
  onChange: (v: string) => void
}) {
  return (
    <label className="workspace-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((x) => (
          <option key={x} value={x}>
            {labels?.[x] || x}
          </option>
        ))}
      </select>
    </label>
  )
}
