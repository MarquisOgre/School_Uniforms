import { useEffect, useState, type ReactNode } from 'react'
import {
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Search,
  X,
  Download,
  ArrowLeft,
  Pencil,
  Percent,
  Upload,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from './lib/supabase'
import EmailConfigSettings from './EmailConfigSettings'
import SiteBrandingSettings from './SiteBrandingSettings'

const dbFrom = (table: string): any => (supabase as any)?.from(table)

type ModuleKey =
  | 'branches'
  | 'products'
  | 'packages'
  | 'orders'
  | 'inventory'
  | 'students'
  | 'reports'
  | 'coupons'
  | 'settings'

const META: Record<ModuleKey, { title: string; description: string }> = {
  branches: {
    title: 'Branches',
    description: 'Manage branches, contact details and active status.',
  },
  products: {
    title: 'Products & Variants',
    description: 'Manage individual uniform products, sizes, SKUs and prices.',
  },
  packages: {
    title: 'Uniform Packages',
    description: 'Build packages from your individual products.',
  },
  orders: {
    title: 'Orders & Payments',
    description: 'Review orders, payment transactions, totals and status in one place.',
  },
  inventory: { title: 'Inventory', description: 'Monitor stock by branch, product and variant.' },
  students: {
    title: 'Parents & Students',
    description: 'Manage parent and student records with direct branch assignments.',
  },
  reports: {
    title: 'Reports',
    description: 'View high-level sales, orders and inventory summaries.',
  },
  coupons: {
    title: 'Coupons',
    description: 'Manage promotional discounts and branch availability.',
  },
  settings: {
    title: 'Settings',
    description: 'Configure secure payment gateway and application settings.',
  },
}

export default function AdminWorkspace({
  module,
  onBack,
  productSlug,
  packageSlug,
}: {
  module: ModuleKey
  onBack: () => void
  productSlug?: string | null
  packageSlug?: string | null
}) {
  const m = META[module]
  const [ordersSearch, setOrdersSearch] = useState('')
  const [branches, setBranches] = useState<any[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || (module !== 'products' && module !== 'packages')) return
    let cancelled = false
    const loadBranches = async () => {
      const result = await dbFrom('branches')
        .select('id,name,code,status')
        .eq('status', 'active')
        .order('name')
      if (cancelled) return
      const next = result.data ?? []
      setBranches(next)
      const stored = window.localStorage.getItem('admin:selectedBranchId')
      const nextId = next.some((x: any) => x.id === stored) ? stored : next[0]?.id || null
      setBranchId(nextId)
      if (nextId) window.localStorage.setItem('admin:selectedBranchId', nextId)
    }
    void loadBranches()
    return () => {
      cancelled = true
    }
  }, [module])

  const handleBranchChange = (nextId: string) => {
    setBranchId(nextId)
    window.localStorage.setItem('admin:selectedBranchId', nextId)
    if (productSlug || packageSlug) onBack()
  }
  return (
    <div className="admin-workspace">
      <main className={`workspace-body workspace-${module}`}>
        {module !== 'reports' && (
          <>
            {(module === 'products' || module === 'packages') && (
              <div className="admin-branch-context">
                <label htmlFor="admin-active-branch">Active Branch</label>
                <select
                  id="admin-active-branch"
                  value={branchId || ''}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  disabled={!branches.length}
                >
                  {!branches.length ? <option value="">No active branches</option> : null}
                  {branches.map((branch: any) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.code ? ` (${branch.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              {module === 'packages' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <button
                    className="primary-button"
                    onClick={() => window.dispatchEvent(new CustomEvent('packages:add'))}
                  >
                    <Plus size={15} /> Add Package
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => window.dispatchEvent(new CustomEvent('packages:refresh'))}
                  >
                    <RefreshCw size={15} /> Refresh
                  </button>
                </div>
              ) : module === 'orders' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <div className="toolbar-search">
                    <Search size={15} />
                    <input
                      value={ordersSearch}
                      onChange={(e) => setOrdersSearch(e.target.value)}
                      placeholder="Search orders or payments"
                    />
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => window.dispatchEvent(new CustomEvent('orders:refresh'))}
                  >
                    <RefreshCw size={15} /> Refresh
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
        <ModuleBody
          module={module}
          ordersSearch={ordersSearch}
          productSlug={productSlug}
          packageSlug={packageSlug}
          branchId={branchId}
        />
      </main>
    </div>
  )
}

function ModuleBody({
  module,
  ordersSearch,
  productSlug,
  packageSlug,
  branchId,
}: {
  module: ModuleKey
  ordersSearch?: string
  productSlug?: string | null
  packageSlug?: string | null
  branchId?: string | null
}) {
  switch (module) {
    case 'branches':
      return <Branches />
    case 'products':
      return <Products productSlug={productSlug} branchId={branchId} />
    case 'packages':
      return <Packages packageSlug={packageSlug} branchId={branchId} />
    case 'orders':
      return <OrdersAdmin search={ordersSearch || ''} />
    case 'inventory':
      return <InventoryAdmin />
    case 'students':
      return <ParentStudents />
    case 'reports':
      return <Reports />
    case 'coupons':
      return <Coupons />
    case 'settings':
      return <Settings />
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

function Branches() {
  const [branches, setBranches] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const result = await dbFrom('branches').select('*').order('name')
    setBranches(result.data ?? [])
    setError(result.error?.message || '')
    setLoading(false)
  }

  const saveBranch = async () => {
    if (!supabase || !editing) return
    const payload = {
      name: String(editing.name || '').trim(),
      code: String(editing.code || '').trim(),
      address_line1: editing.address_line1 || null,
      address_line2: editing.address_line2 || null,
      city: editing.city || null,
      state: editing.state || null,
      postal_code: editing.postal_code || null,
      phone: editing.phone || null,
      email: editing.email || null,
      status: editing.status || 'active',
    }
    if (!payload.name || !payload.code) {
      setError('Branch Name and Code are required.')
      return
    }
    const r = editing.id
      ? await dbFrom('branches').update(payload).eq('id', editing.id)
      : await dbFrom('branches').insert(payload)
    if (r.error) setError(r.error.message)
    else {
      setEditing(null)
      await load()
    }
  }

  const downloadBranchTemplate = () => {
    const headers = [
      'Branch Name',
      'Code',
      'Address Line 1',
      'Address Line 2',
      'City',
      'State',
      'Postal Code',
      'Phone',
      'Email',
      'Status',
    ]
    const sample = [
      'Narayana Kukatpally',
      'NAR-003',
      'Main Road',
      '',
      'Hyderabad',
      'Telangana',
      '500072',
      '9876543210',
      'kukatpally@example.com',
      'active',
    ]
    const sheet = XLSX.utils.aoa_to_sheet([headers, sample])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Branches')
    XLSX.writeFile(workbook, 'Branches_Import_Template.xlsx')
  }

  const exportBranches = () => {
    const headers = [
      'Branch Name',
      'Code',
      'Address Line 1',
      'Address Line 2',
      'City',
      'State',
      'Postal Code',
      'Phone',
      'Email',
      'Status',
    ]
    const rows = branches.map((branch) => [
      branch.name || '',
      branch.code || '',
      branch.address_line1 || '',
      branch.address_line2 || '',
      branch.city || '',
      branch.state || '',
      branch.postal_code || '',
      branch.phone || '',
      branch.email || '',
      branch.status || 'active',
    ])
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Branches')
    XLSX.writeFile(workbook, `Branches_Export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const importBranches = async (file: File) => {
    if (!supabase || importing) return
    setImporting(true)
    setError('')
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' })
      if (!raw.length) {
        setError('The Excel file contains no branch records.')
        return
      }

      let success = 0
      const errors: string[] = []

      for (let index = 0; index < raw.length; index += 1) {
        const source = raw[index]
        const row: Record<string, any> = {}
        Object.entries(source).forEach(([key, value]) => {
          const normalizedKey = String(key)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
          row[normalizedKey] =
            value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').trim()
        })

        const payload = {
          name: String(row.branch_name || row.name || '').trim(),
          code: String(row.code || '').trim(),
          address_line1: String(row.address_line_1 || '').trim() || null,
          address_line2: String(row.address_line_2 || '').trim() || null,
          city: String(row.city || '').trim() || null,
          state: String(row.state || '').trim() || null,
          postal_code: String(row.postal_code || '').trim() || null,
          phone: String(row.phone || '').trim() || null,
          email: String(row.email || '').trim() || null,
          status:
            String(row.status || 'active')
              .trim()
              .toLowerCase() || 'active',
        }

        if (!payload.name || !payload.code) {
          errors.push(`Row ${index + 2}: Branch Name and Code are required.`)
          continue
        }
        if (!['active', 'inactive', 'suspended'].includes(payload.status)) {
          errors.push(`Row ${index + 2}: Status must be active, inactive or suspended.`)
          continue
        }

        const result = await dbFrom('branches')
          .upsert(payload, { onConflict: 'code' })
          .select('id')
          .single()

        if (result.error) {
          errors.push(`Row ${index + 2}: ${result.error.message}`)
        } else {
          success += 1
        }
      }

      await load()
      setError(
        errors.length
          ? `Imported ${success} branch(es). ${errors.length} row(s) failed. ${errors.slice(0, 5).join(' | ')}`
          : `Successfully imported ${success} branch(es).`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to import the branch file.')
    } finally {
      setImporting(false)
    }
  }

  const handleBranchImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void importBranches(file)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <>
      <Toolbar onRefresh={load}>
        <BulkTools
          title="Excel Bulk Import / Export — Branches"
          description="Download a branch template, export current branches, or upload branches in bulk."
          demoLabel="Download Branch Template"
          exportLabel="Download All Branches"
          importing={importing}
          canExport={branches.length > 0}
          onDemo={downloadBranchTemplate}
          onExport={exportBranches}
          onImport={(file) => void importBranches(file)}
        />
        <button
          className="primary-button"
          onClick={() => {
            setError('')
            setEditing({ name: '', code: '', status: 'active' })
          }}
        >
          <Plus size={15} /> Add Branch
        </button>
      </Toolbar>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <Panel>
          <div className="workspace-table">
            <div className="workspace-row admin-table-header branch-row">
              <strong>Branch</strong>
              <span>Code</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {branches.map((x) => (
              <div className="workspace-row branch-row" key={x.id}>
                <strong>{x.name}</strong>
                <span>{x.code}</span>
                <span>{x.status}</span>
                <button onClick={() => setEditing({ ...x })}>Edit</button>
              </div>
            ))}
          </div>
        </Panel>
      )}


      {editing && (
        <EditModal
          title={editing.id ? 'Edit Branch' : 'Add Branch'}
          onClose={() => setEditing(null)}
          onSave={saveBranch}
        >
          <Field
            label="Branch Name"
            value={editing.name}
            onChange={(v) => setEditing({ ...editing, name: v })}
          />
          <Field
            label="Code"
            value={editing.code}
            onChange={(v) => setEditing({ ...editing, code: v })}
          />
          <Field
            label="Address Line 1"
            value={editing.address_line1 || ''}
            onChange={(v) => setEditing({ ...editing, address_line1: v })}
          />
          <Field
            label="Address Line 2"
            value={editing.address_line2 || ''}
            onChange={(v) => setEditing({ ...editing, address_line2: v })}
          />
          <Field
            label="City"
            value={editing.city || ''}
            onChange={(v) => setEditing({ ...editing, city: v })}
          />
          <Field
            label="State"
            value={editing.state || ''}
            onChange={(v) => setEditing({ ...editing, state: v })}
          />
          <Field
            label="Postal Code"
            value={editing.postal_code || ''}
            onChange={(v) => setEditing({ ...editing, postal_code: v })}
          />
          <Field
            label="Phone"
            value={editing.phone || ''}
            onChange={(v) => setEditing({ ...editing, phone: v })}
          />
          <Field
            label="Email"
            value={editing.email || ''}
            onChange={(v) => setEditing({ ...editing, email: v })}
          />
          <Select
            label="Status"
            value={editing.status || 'active'}
            options={['active', 'inactive', 'suspended']}
            onChange={(v) => setEditing({ ...editing, status: v })}
          />
        </EditModal>
      )}
    </>
  )
}


type BulkToolsProps = {
  title: string
  description: string
  demoLabel: string
  exportLabel: string
  accept?: string
  importing?: boolean
  canExport?: boolean
  onDemo: () => void
  onExport: () => void
  onImport: (file: File) => void
}

function BulkTools({
  title,
  description,
  demoLabel,
  exportLabel,
  accept = '.xlsx,.xls,.csv',
  importing = false,
  canExport = true,
  onDemo,
  onExport,
  onImport,
}: BulkToolsProps) {
  const [open, setOpen] = useState(false)

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onImport(file)
  }

  return (
    <>
      <button className="secondary-button" onClick={() => setOpen(true)}>
        <Upload size={15} /> Import / Export
      </button>

      {open ? (
        <div className="workspace-modal">
          <div className="workspace-modal-card" style={{ maxWidth: 820 }}>
            <div className="workspace-modal-header">
              <div>
                <h2>{title}</h2>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 15 }}>{description}</p>
              </div>
            </div>
            <button
              className="workspace-close"
              onClick={() => !importing && setOpen(false)}
              aria-label="Close"
              disabled={importing}
            >
              <X size={18} />
            </button>

            <div className="workspace-form" style={{ gap: 18 }}>
              <div className="workspace-note">
                <strong>Download Demo File</strong>
                <br />
                Use the demo Excel file as the starting point. Keep the column names unchanged.
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="secondary-button" onClick={onDemo}>
                    <Download size={15} /> {demoLabel}
                  </button>
                </div>
              </div>

              <div className="workspace-note">
                <strong>Export Current Data</strong>
                <br />
                Download the records currently stored in the database as an Excel file.
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={onExport}
                    disabled={!canExport || importing}
                  >
                    <Download size={15} /> {exportLabel}
                  </button>
                </div>
              </div>

              <div className="workspace-note">
                <strong>Import Data</strong>
                <br />
                Upload a completed Excel or CSV file to import or update records in bulk.
                <div style={{ marginTop: 12 }}>
                  <label
                    className="secondary-button"
                    style={{ cursor: importing ? 'wait' : 'pointer' }}
                  >
                    <Upload size={15} /> {importing ? 'Importing...' : 'Choose Excel File'}
                    <input
                      type="file"
                      accept={accept}
                      onChange={handleFile}
                      disabled={importing}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function Products({
  productSlug,
  branchId,
}: {
  productSlug?: string | null
  branchId?: string | null
}) {
  const [rows, setRows] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [variants, setVariants] = useState<any[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [bulkImporting, setBulkImporting] = useState(false)

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    if (!branchId) {
      setRows([])
      setLoading(false)
      return
    }
    const [p, c] = await Promise.all([
      dbFrom('products').select('*').eq('branch_id', branchId).order('name'),
      dbFrom('product_categories').select('*').eq('status', 'active').order('name'),
    ])
    setRows(p.data ?? [])
    setCategories(c.data ?? [])
    setError(p.error?.message || c.error?.message || '')
    setLoading(false)
  }

  const addCategory = async () => {
    const name = newCategoryName.trim()
    if (!supabase || !name || categorySaving) return
    setCategorySaving(true)
    setError('')
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const result = await dbFrom('product_categories')
      .insert({ name, slug, status: 'active' })
      .select('*')
      .single()
    if (result.error) {
      setError(result.error.message)
    } else {
      setCategories((current) =>
        [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)),
      )
      setNewCategoryName('')
    }
    setCategorySaving(false)
  }

  const deactivateCategory = async (categoryId: string) => {
    if (!supabase) return
    const used = rows.some((product) => product.category_id === categoryId)
    if (used) {
      setError(
        'This category is assigned to one or more products. Reassign those products before deactivating it.',
      )
      return
    }
    const result = await dbFrom('product_categories')
      .update({ status: 'inactive' })
      .eq('id', categoryId)
    if (result.error) setError(result.error.message)
    else setCategories((current) => current.filter((x) => x.id !== categoryId))
  }

  const loadVariants = async (productId: string) => {
    if (!supabase || !productId) {
      setVariants([])
      return
    }
    setVariantsLoading(true)
    setVariants([])
    const result = await dbFrom('product_variants')
      .select('id,product_id,sku,size_label,color,variant_name,price,status')
      .eq('product_id', productId)
      .order('size_label')
    if (result.error) {
      setError(result.error.message || 'Unable to load product variants.')
      setVariants([])
    } else {
      setVariants(result.data ?? [])
      setError('')
    }
    setVariantsLoading(false)
  }

  useEffect(() => {
    void load()
  }, [branchId])

  useEffect(() => {
    if (!productSlug || !branchId || !supabase) return

    let cancelled = false

    const loadProductPage = async () => {
      setLoading(true)
      setError('')

      const slugResult = await dbFrom('products')
        .select('*')
        .eq('slug', productSlug)
        .eq('branch_id', branchId)
        .maybeSingle()

      if (cancelled) return

      let product = slugResult.data

      if (!product && !slugResult.error && /^[0-9a-f-]{36}$/i.test(productSlug)) {
        const idResult = await dbFrom('products')
          .select('*')
          .eq('id', productSlug)
          .eq('branch_id', branchId)
          .maybeSingle()

        if (cancelled) return

        if (idResult.error) {
          setError(idResult.error.message)
          setEditing(null)
          setLoading(false)
          return
        }

        product = idResult.data
      }

      if (!product && !slugResult.error) {
        const nameFromSlug = decodeURIComponent(productSlug).replace(/-/g, ' ').trim()

        const nameResult = await dbFrom('products')
          .select('*')
          .eq('branch_id', branchId)
          .ilike('name', nameFromSlug)
          .maybeSingle()

        if (cancelled) return

        if (nameResult.error) {
          setError(nameResult.error.message)
          setEditing(null)
          setLoading(false)
          return
        }

        product = nameResult.data
      }

      if (slugResult.error || !product) {
        setError(slugResult.error?.message || 'Product not found.')
        setEditing(null)
        setLoading(false)
        return
      }

      setEditing({
        ...product,
        base_price: product.base_price ?? '',
        discount_percentage: product.discount_percentage ?? '',
        offer_price: product.offer_price ?? product.base_price ?? '',
      })

      await loadVariants(product.id)

      if (!cancelled) {
        setLoading(false)
      }
    }

    void loadProductPage()

    return () => {
      cancelled = true
    }
  }, [productSlug, branchId])

  const save = async (closeAfter = true): Promise<boolean> => {
    if (!supabase || !editing) return false
    if (!branchId) {
      setError('Select an active branch before saving the product.')
      return false
    }

    const name = String(editing.name || '').trim()
    if (!name) {
      setError('Product Name is required.')
      return false
    }
    if (!editing.category_id) {
      setError('Product Category is required.')
      return false
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const payload = {
      category_id: editing.category_id || null,
      name,
      slug,
      description: editing.description || null,
      product_type: editing.product_type || null,
      occasion_type: editing.occasion_type || null,
      gender: editing.gender || 'unisex',
      material: editing.material || null,
      brand: editing.brand || null,
      quality: editing.quality || null,
      fabric: editing.fabric || null,
      care: editing.care || null,
      delivery_returns: editing.delivery_returns || null,
      cod_available: editing.cod_available !== false,
      custom_order_cod: editing.custom_order_cod === true,
      easy_returns: editing.easy_returns !== false,
      express_shipping: editing.express_shipping !== false,
      show_cod_returns_shipping: editing.show_cod_returns_shipping !== false,
      show_details: editing.show_details !== false,
      show_description: editing.show_description !== false,
      show_quality_care: editing.show_quality_care !== false,
      show_delivery_returns: editing.show_delivery_returns !== false,
      image_url: editing.image_url || null,
      image_gallery: Array.isArray(editing.image_gallery) ? editing.image_gallery : [],
      base_price: Number(editing.base_price || 0),
      offer_price:
        editing.offer_price === '' || editing.offer_price == null
          ? null
          : Number(editing.offer_price),
      discount_percentage: Number(editing.discount_percentage || 0),
      status: editing.status || 'active',
      branch_id: branchId,
    }

    const result = editing.id
      ? await dbFrom('products').update(payload).eq('id', editing.id).eq('branch_id', branchId)
      : await dbFrom('products').insert(payload).select('id').single()

    if (result.error) {
      setError(result.error.message)
      return false
    }

    const productId = editing.id || result.data?.id
    if (productId) {
      const catalogResult = await dbFrom('branch_products').upsert(
        {
          branch_id: branchId,
          product_id: productId,
          branch_price: Number(editing.offer_price ?? editing.base_price ?? 0),
          is_visible: editing.status === 'active',
        },
        { onConflict: 'branch_id,product_id' },
      )
      if (catalogResult.error) {
        setError(catalogResult.error.message)
        return false
      }
    }

    if (closeAfter) {
      setEditing(null)
      setVariants([])
    } else {
      await load()
    }
    return true
  }

  const saveAllVariants = async (): Promise<boolean> => {
    if (!supabase || !editing?.id) {
      setError('Save the product before saving sizes.')
      return false
    }

    for (const variant of variants) {
      const sizeLabel = String(variant.size_label || '').trim()
      const productName = String(editing.name || '').trim()
      const sku =
        String(variant.sku || '').trim() ||
        `${productName
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}-${String(variants.indexOf(variant) + 1).padStart(3, '0')}`
      const payload = {
        product_id: editing.id,
        sku,
        size_label: sizeLabel || null,
        color: String(variant.color || '').trim() || null,
        variant_name:
          String(variant.variant_name || '').trim() ||
          (sizeLabel ? `${productName} - Size ${sizeLabel}` : productName),
        price: variant.price === '' || variant.price == null ? null : Number(variant.price),
        status: variant.status || 'active',
      }

      const result = variant.id
        ? await dbFrom('product_variants').update(payload).eq('id', variant.id)
        : await dbFrom('product_variants').insert(payload)

      if (result.error) {
        setError(result.error.message)
        return false
      }
    }

    await loadVariants(editing.id)
    return true
  }

  const downloadProductTemplate = () => {
    const headers = ['Product Name', 'Category ID', 'Gender', 'Base Price', 'Discount (%)', 'Offer Price', 'Status', 'SKU', 'Size', 'Color', 'Variant Name', 'Variant Price']
    const sample = ['Sample Shirt', categories[0]?.id || '', 'unisex', 1000, 10, 900, 'active', 'SAMPLE-S', 'S', '', 'Sample Shirt - Size S', 900]
    const sheet = XLSX.utils.aoa_to_sheet([headers, sample])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Products & Variants')
    XLSX.writeFile(workbook, 'Products_Variants_Import_Template.xlsx')
  }

  const exportProducts = async () => {
    const headers = ['Product', 'Category', 'Gender', 'Base Price', 'Discount (%)', 'Offer Price', 'Status', 'SKU', 'Size', 'Color', 'Variant Name', 'Variant Price']
    const productIds = rows.map((p) => p.id).filter(Boolean)
    const variantResult = productIds.length
      ? await dbFrom('product_variants').select('id,product_id,sku,size_label,color,variant_name,price,status').in('product_id', productIds).order('product_id').order('size_label')
      : { data: [], error: null }
    if (variantResult.error) {
      setError(variantResult.error.message)
      return
    }
    const variantMap: Record<string, any[]> = {}
    ;(variantResult.data || []).forEach((v: any) => {
      variantMap[v.product_id] = [...(variantMap[v.product_id] || []), v]
    })
    const values: any[][] = []
    rows.forEach((p) => {
      const productVariants = variantMap[p.id] || []
      if (!productVariants.length) {
        values.push([p.name || '', categories.find((c) => c.id === p.category_id)?.name || '', formatGender(p.gender), Number(p.base_price || 0), Number(p.discount_percentage || 0), Number(p.offer_price ?? p.base_price ?? 0), p.status || 'active', '', '', '', '', ''])
      } else {
        productVariants.forEach((v) => values.push([p.name || '', categories.find((c) => c.id === p.category_id)?.name || '', formatGender(p.gender), Number(p.base_price || 0), Number(p.discount_percentage || 0), Number(p.offer_price ?? p.base_price ?? 0), p.status || 'active', v.sku || '', v.size_label || '', v.color || '', v.variant_name || '', Number(v.price ?? p.base_price ?? 0)]))
      }
    })
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...values])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Products & Variants')
    XLSX.writeFile(workbook, `Products_Variants_Export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const importProducts = async (file: File) => {
    if (!supabase || bulkImporting || !branchId) return
    setBulkImporting(true)
    setError('')
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const raw = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' })
      if (!raw.length) throw new Error('The Excel file contains no product records.')
      let success = 0
      let variantSuccess = 0
      const errors: string[] = []
      for (let index = 0; index < raw.length; index += 1) {
        const r = raw[index]
        const name = String(r['Product Name'] ?? r.Product ?? r.product_name ?? r.name ?? '').trim()
        if (!name) { errors.push(`Row ${index + 2}: Product Name is required.`); continue }
        const gender = String(r.Gender ?? r.gender ?? 'unisex').trim().toLowerCase()
        const payload = {
          branch_id: branchId,
          name,
          category_id: String(r['Category ID'] ?? r.category_id ?? '').trim() || null,
          gender: ['boys', 'girls', 'unisex'].includes(gender) ? gender : 'unisex',
          base_price: Number(r['Base Price'] ?? r.base_price ?? 0),
          discount_percentage: Number(r['Discount (%)'] ?? r.discount_percentage ?? 0),
          offer_price: r['Offer Price'] === '' || r.offer_price === '' ? null : Number(r['Offer Price'] ?? r.offer_price ?? 0),
          status: String(r.Status ?? r.status ?? 'active').trim().toLowerCase() || 'active',
        }
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const productResult = await dbFrom('products').upsert({ ...payload, slug }, { onConflict: 'branch_id,slug' }).select('id').single()
        if (productResult.error || !productResult.data?.id) {
          errors.push(`Row ${index + 2}: ${productResult.error?.message || 'Unable to save product.'}`)
          continue
        }
        const productId = productResult.data.id
        const branchResult = await dbFrom('branch_products').upsert(
          { branch_id: branchId, product_id: productId, branch_price: Number(payload.offer_price ?? payload.base_price ?? 0), is_visible: payload.status === 'active' },
          { onConflict: 'branch_id,product_id' },
        )
        if (branchResult.error) {
          errors.push(`Row ${index + 2}: Product saved but branch catalog update failed: ${branchResult.error.message}`)
          continue
        }
        success += 1
        const sku = String(r.SKU ?? r.sku ?? '').trim()
        if (sku) {
          const variantResult = await dbFrom('product_variants').upsert(
            {
              product_id: productId,
              sku,
              size_label: String(r.Size ?? r.size ?? '').trim() || null,
              color: String(r.Color ?? r.color ?? '').trim() || null,
              variant_name: String(r['Variant Name'] ?? r.variant_name ?? '').trim() || null,
              price: Number(r['Variant Price'] ?? r.variant_price ?? payload.offer_price ?? payload.base_price ?? 0),
              status: payload.status,
            },
            { onConflict: 'sku' },
          ).select('id').single()
          if (variantResult.error) errors.push(`Row ${index + 2}: Product saved but variant failed: ${variantResult.error.message}`)
          else variantSuccess += 1
        }
      }
      await load()
      setError(errors.length
        ? `Imported ${success} product row(s) and ${variantSuccess} variant(s). ${errors.length} row(s) failed. ${errors.slice(0, 5).join(' | ')}`
        : `Successfully imported ${success} product row(s) and ${variantSuccess} variant(s).`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to import products.')
    } finally {
      setBulkImporting(false)
    }
  }

  const visible = rows.filter((product) =>
    String(product.name || '')
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  const newProduct = () =>
    setEditing({
      branch_id: branchId,
      name: '',
      description: '',
      product_type: '',
      occasion_type: '',
      gender: 'unisex',
      material: '',
      brand: '',
      quality: '',
      fabric: '',
      care: '',
      delivery_returns: '',
      cod_available: true,
      custom_order_cod: false,
      easy_returns: true,
      express_shipping: true,
      show_cod_returns_shipping: true,
      show_details: true,
      show_description: true,
      show_quality_care: true,
      show_delivery_returns: true,
      base_price: '',
      discount_percentage: '',
      offer_price: '',
      image_url: '',
      image_gallery: [],
      status: 'active',
      category_id: '',
    })

  const isEditingProduct = Boolean(editing?.id)
  const isProductPage = Boolean(productSlug)

  useEffect(() => {
    if (!editing?.id) return

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [editing?.id])

  return (
    <>
      {isProductPage && !editing?.id ? (
        <>
          <ErrorBox text={error} />
          {loading ? (
            <Panel>
              <Loading />
            </Panel>
          ) : (
            <Panel>
              <div className="workspace-empty">{error || 'Unable to load this product.'}</div>
            </Panel>
          )}
        </>
      ) : null}

      {!isEditingProduct && !isProductPage && (
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
            <BulkTools
              title="Excel Bulk Import / Export — Products & Variants"
              description="Download a template, export your current products, or upload products in bulk."
              demoLabel="Download Product Template"
              exportLabel="Download Products"
              importing={bulkImporting}
              canExport={rows.length > 0}
              onDemo={downloadProductTemplate}
              onExport={exportProducts}
              onImport={(file) => void importProducts(file)}
            />
            <button className="secondary-button" onClick={() => setCategoryManagerOpen(true)}>
              <Plus size={15} /> Categories
            </button>
            <button className="primary-button" onClick={newProduct}>
              <Plus size={15} /> Add Product
            </button>
          </Toolbar>

          <ErrorBox text={error} />

          {categoryManagerOpen && (
            <EditModal
              title="Product Categories"
              onClose={() => setCategoryManagerOpen(false)}
              onSave={() => setCategoryManagerOpen(false)}
            >
              <div className="workspace-form-row">
                <Field
                  label="New Category"
                  value={newCategoryName}
                  onChange={setNewCategoryName}
                  placeholder="e.g. Shirts"
                />
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void addCategory()}
                    disabled={!newCategoryName.trim() || categorySaving}
                  >
                    {categorySaving ? 'Adding...' : 'Add Category'}
                  </button>
                </div>
              </div>
              <div className="workspace-category-list">
                {categories.map((category) => (
                  <div className="workspace-category-item" key={category.id}>
                    <span>{category.name}</span>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void deactivateCategory(category.id)}
                    >
                      Deactivate
                    </button>
                  </div>
                ))}
              </div>
            </EditModal>
          )}

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
                  <span>Discount</span>
                  <span>Offer Price</span>
                  <span>Actions</span>
                </div>
                {visible.map((product) => (
                  <div className="workspace-row product-row" key={product.id}>
                    <strong>{product.name}</strong>
                    <span>
                      {categories.find((c) => c.id === product.category_id)?.name ||
                        'Uncategorized'}
                    </span>
                    <span>{formatGender(product.gender)}</span>
                    <span>₹{Number(product.base_price || 0).toLocaleString('en-IN')}</span>
                    <span>{Number(product.discount_percentage || 0)}%</span>
                    <span>
                      ₹
                      {Number(product.offer_price ?? product.base_price ?? 0).toLocaleString(
                        'en-IN',
                      )}
                    </span>
                    <button
                      onClick={() => {
                        const slug = String(product.name || 'product')
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, '')
                        window.history.pushState(
                          { schoolUniformApp: 'admin', tool: 'products', productSlug: slug },
                          '',
                          `/admin/products/edit/${encodeURIComponent(slug)}`,
                        )
                        window.dispatchEvent(new PopStateEvent('popstate'))
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {editing && !editing.id && (
            <EditModal
              title="Add Product"
              onClose={() => setEditing(null)}
              onSave={() => void save()}
            >
              <div className="workspace-form-row">
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
              </div>
              <div className="workspace-form-row">
                <Field
                  label="Product Type"
                  value={editing.product_type || ''}
                  onChange={(v) => setEditing({ ...editing, product_type: v })}
                />
                <Field
                  label="Occasion Type"
                  value={editing.occasion_type || ''}
                  onChange={(v) => setEditing({ ...editing, occasion_type: v })}
                />
              </div>
              <div className="workspace-form-row workspace-form-row-description-gender">
                <Field
                  label="Description"
                  value={editing.description || ''}
                  onChange={(v) => setEditing({ ...editing, description: v })}
                  area
                />
                <Select
                  label="Gender"
                  value={editing.gender || 'unisex'}
                  options={['boys', 'girls', 'unisex']}
                  labels={{ boys: 'Boys', girls: 'Girls', unisex: 'Unisex' }}
                  onChange={(v) => setEditing({ ...editing, gender: v })}
                />
              </div>
              <div className="workspace-form-row workspace-form-row-pricing">
                <Field
                  label="Base Price"
                  value={String(editing.base_price ?? '')}
                  onChange={(v) => setEditing({ ...editing, base_price: v })}
                  type="number"
                />
                <Field
                  label="Discount (%)"
                  value={String(editing.discount_percentage ?? '')}
                  onChange={(v) => setEditing({ ...editing, discount_percentage: v })}
                  type="number"
                />
                <Field
                  label="Offer Price"
                  value={String(editing.offer_price ?? '')}
                  onChange={(v) => setEditing({ ...editing, offer_price: v })}
                  type="number"
                />
              </div>
              <div className="workspace-form-row workspace-form-row-image-status">
                <div className="workspace-field">
                  <span>Product Main Image</span>
                  <ImagePicker
                    value={editing.image_url || ''}
                    folder="products"
                    alt="Selected product"
                    onChange={(v) => setEditing({ ...editing, image_url: v })}
                  />
                </div>
                <div className="workspace-field">
                  <span>Product Image Gallery</span>
                  <GalleryPicker
                    value={Array.isArray(editing.image_gallery) ? editing.image_gallery : []}
                    folder="products"
                    onChange={(v) => setEditing({ ...editing, image_gallery: v })}
                  />
                </div>
              </div>
            </EditModal>
          )}
        </>
      )}

      {editing?.id && (
        <ProductEditorScreen
          editing={editing}
          setEditing={setEditing}
          categories={categories}
          variants={variants}
          setVariants={setVariants}
          variantsLoading={variantsLoading}
          onBack={() => {
            if (window.location.pathname.startsWith('/admin/products/edit/')) {
              window.history.pushState(
                { schoolUniformApp: 'admin', tool: 'products', productSlug: null },
                '',
                '/admin/products',
              )
              window.dispatchEvent(new PopStateEvent('popstate'))
              return
            }
            setEditing(null)
            setVariants([])
          }}
          onSaveProduct={async () => {
            const productSaved = await save(false)
            if (!productSaved) return false
            const variantsSaved = await saveAllVariants()
            if (variantsSaved) {
              setError('')
              await load()
            }
            return variantsSaved
          }}
          onRefreshVariants={() => editing?.id && void loadVariants(editing.id)}
          error={error}
          setError={setError}
        />
      )}
    </>
  )
}

function PackageEditorScreen({
  editing,
  setEditing,
  products,
  items,
  onBack,
  onSave,
  onAddItem,
  onEditItem,
  error,
}: {
  editing: any
  setEditing: (value: any) => void
  products: any[]
  items: any[]
  onBack: () => void
  onSave: (value: any) => Promise<void>
  onAddItem: () => void
  onEditItem: (item: any) => void
  error: string
}) {
  const [saving, setSaving] = useState(false)

  const basePrice = items.reduce((total, item) => {
    const product = products.find((p) => p.id === item.product_id)
    return total + Number(product?.base_price || 0) * Number(item.quantity || 1)
  }, 0)

  const offerPrice = Math.max(
    0,
    basePrice * (1 - Math.min(100, Math.max(0, Number(editing.discount_percentage || 0))) / 100),
  )

  const save = async () => {
    setSaving(true)
    const nextEditing = { ...editing, base_price: basePrice, offer_price: offerPrice }
    setEditing(nextEditing)
    await onSave(nextEditing)
    setSaving(false)
  }

  return (
    <div className="product-editor-page">
      <div className="product-editor-breadcrumb">
        <span>Uniform Packages</span>
        <strong>›</strong>
        <span>Edit Package</span>
        <button type="button" className="product-editor-back" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Packages
        </button>
      </div>

      <div className="product-editor-heading">
        <div>
          <h1>Edit Package</h1>
          <p>Update package details, image, pricing and included products.</p>
        </div>
      </div>

      {error ? <div className="workspace-error">{error}</div> : null}

      <section className="product-editor-card product-details-card">
        <div className="product-details-main">
          <div className="product-editor-section-title">Package Details</div>

          <div className="product-editor-grid product-editor-grid-2">
            <Field
              label="Package Name *"
              value={editing.name || ''}
              onChange={(v) => setEditing({ ...editing, name: v })}
            />
            <Select
              label="Gender"
              value={editing.gender || 'unisex'}
              options={['boys', 'girls', 'unisex']}
              labels={{ boys: 'Boys', girls: 'Girls', unisex: 'Unisex' }}
              onChange={(v) => setEditing({ ...editing, gender: v })}
            />
          </div>

          <div className="product-editor-grid product-editor-grid-2">
            <div>
              <Field
                label="Base Price (₹)"
                value={String(basePrice)}
                onChange={() => undefined}
                type="number"
              />
              <p className="product-editor-help">
                Calculated from the included products and quantities.
              </p>
            </div>
            <label className="product-editor-status">
              <span>Status</span>
              <button
                type="button"
                className={
                  editing.status === 'active'
                    ? 'product-status-toggle active'
                    : 'product-status-toggle'
                }
                onClick={() =>
                  setEditing({
                    ...editing,
                    status: editing.status === 'active' ? 'inactive' : 'active',
                  })
                }
              >
                <span />
              </button>
              <strong>{editing.status === 'active' ? 'Active' : 'Inactive'}</strong>
            </label>
          </div>

          <div className="product-editor-grid product-editor-grid-2">
            <Field
              label="Discount (%)"
              value={String(editing.discount_percentage ?? 0)}
              onChange={(v) => setEditing({ ...editing, discount_percentage: v })}
              type="number"
              min="0"
            />
            <Field
              label="Offer Price (₹)"
              value={String(offerPrice)}
              onChange={() => undefined}
              type="number"
            />
          </div>

          <Field
            label="Package Description"
            value={editing.description || ''}
            onChange={(v) => setEditing({ ...editing, description: v })}
            area
          />
        </div>

        <div className="product-editor-images">
          <div className="product-editor-section-title">Package Image</div>
          <div className="product-main-image">
            <ImagePicker
              value={editing.image_url || ''}
              folder="packages"
              alt="Selected package"
              onChange={(v) => setEditing({ ...editing, image_url: v })}
            />
          </div>
        </div>
      </section>

      <section className="product-editor-card product-variants-card">
        <div className="product-variants-heading">
          <div className="product-editor-section-title">Package Items</div>
          <div className="product-variant-actions">
            <button type="button" className="secondary-button" onClick={onAddItem}>
              <Plus size={15} /> Add Item
            </button>
          </div>
        </div>

        <div className="product-variants-table-wrap">
          {items.length ? (
            <table className="product-variants-edit-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Size Selection</th>
                  <th>Variants</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const product = products.find((p) => p.id === item.product_id)
                  const variantCount = Array.isArray(item.variant_ids) ? item.variant_ids.length : 0
                  return (
                    <tr key={item.id || `item-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{product?.name || item.product_id}</strong>
                      </td>
                      <td>{item.quantity || 1}</td>
                      <td>{item.requires_size ? 'Required' : 'Not required'}</td>
                      <td>
                        {variantCount ? variantCount + ' configured' : 'No variants configured'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onEditItem(item)}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="workspace-empty">No products added to this package yet.</div>
          )}
        </div>
      </section>

      <div className="product-variants-footer">
        <button type="button" className="secondary-button" onClick={onBack}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-button product-save-all"
          disabled={saving}
          onClick={() => void save()}
        >
          <Save size={15} /> {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  )
}

function ProductEditorScreen({
  editing,
  setEditing,
  categories,
  variants,
  setVariants,
  variantsLoading,
  onBack,
  onSaveProduct,
  onRefreshVariants,
  error,
  setError,
}: {
  editing: any
  setEditing: (value: any) => void
  categories: any[]
  variants: any[]
  setVariants: (value: any[] | ((current: any[]) => any[])) => void
  variantsLoading: boolean
  onBack: () => void
  onSaveProduct: () => Promise<boolean>
  onRefreshVariants: () => void
  error: string
  setError: (value: string) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [bulkPrice, setBulkPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [additionalDetailsOpen, setAdditionalDetailsOpen] = useState(false)

  const toggleAdditionalDetails = () => {
    setAdditionalDetailsOpen((open) => !open)
  }

  useEffect(() => {
    setSelected([])
  }, [editing.id])

  const updateVariant = (id: string | null, patch: any, tempId?: string) => {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === id && (id || variant._tempId === tempId)
          ? { ...variant, ...patch }
          : variant,
      ),
    )
  }

  const addSize = () => {
    const index = variants.length + 1
    const base = String(editing.name || 'PRODUCT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setVariants((current) => [
      ...current,
      {
        id: null,
        _tempId: `new-${Date.now()}-${index}`,
        product_id: editing.id,
        sku: `${base || 'PRODUCT'}-${String(index).padStart(3, '0')}`,
        size_label: '',
        color: '',
        variant_name: '',
        price: editing.base_price ?? '',
        status: 'active',
        _new: true,
      },
    ])
  }

  const deleteSelected = async () => {
    if (!selected.length) return
    const confirmed = window.confirm(
      `Delete ${selected.length} selected size${selected.length === 1 ? '' : 's'}? This cannot be undone.`,
    )
    if (!confirmed) return

    const existingIds = selected.filter(Boolean)
    if (existingIds.length && supabase) {
      const result = await dbFrom('product_variants').delete().in('id', existingIds)
      if (result.error) {
        setError(result.error.message)
        return
      }
    }
    setVariants((current) => current.filter((variant) => !selected.includes(variant.id)))
    setSelected([])
  }

  const applyBulkPrice = () => {
    if (bulkPrice === '' || !selected.length) return
    setVariants((current) =>
      current.map((variant) =>
        selected.includes(variant.id) ? { ...variant, price: bulkPrice } : variant,
      ),
    )
  }

  const save = async () => {
    setSaving(true)
    setError('')
    const ok = await onSaveProduct()
    setSaving(false)
    if (ok) {
      setSelected([])
    }
  }

  return (
    <div className="product-editor-page">
      <div className="product-editor-breadcrumb">
        <span>Products</span>
        <strong>›</strong>
        <span>Edit Product</span>
        <button type="button" className="product-editor-back" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Products
        </button>
      </div>

      <div className="product-editor-heading">
        <div>
          <h1>Edit Product</h1>
          <p>Update product details, images and size-wise pricing.</p>
        </div>
      </div>

      {error ? <div className="workspace-error">{error}</div> : null}

      <section className="product-editor-card product-details-card">
        <div className="product-details-main">
          <div className="product-editor-section-title">Product Details</div>

          <div className="product-editor-grid product-editor-grid-2">
            <Field
              label="Product Name *"
              value={editing.name || ''}
              onChange={(v) => setEditing({ ...editing, name: v })}
            />
            <Select
              label="Gender"
              value={editing.gender || 'unisex'}
              options={['boys', 'girls', 'unisex']}
              onChange={(v) => setEditing({ ...editing, gender: v })}
            />
          </div>

          <div className="product-editor-grid product-editor-grid-2">
            <Select
              label="Category"
              value={editing.category_id || ''}
              options={categories.map((x) => x.id)}
              labels={Object.fromEntries(categories.map((x) => [x.id, x.name]))}
              onChange={(v) => setEditing({ ...editing, category_id: v })}
            />
            <Field
              label="Sub Category"
              value={editing.occasion_type || ''}
              onChange={(v) => setEditing({ ...editing, occasion_type: v })}
            />
          </div>

          <div className="product-editor-grid product-editor-grid-2">
            <div>
              <Field
                label="Base Price (₹)"
                value={String(editing.base_price ?? '')}
                onChange={(v) => setEditing({ ...editing, base_price: v })}
                type="number"
                min="0"
              />
              <p className="product-editor-help">This is the default price new sizes will use.</p>
            </div>
            <label className="product-editor-status">
              <span>Status</span>
              <button
                type="button"
                className={
                  editing.status === 'active'
                    ? 'product-status-toggle active'
                    : 'product-status-toggle'
                }
                onClick={() =>
                  setEditing({
                    ...editing,
                    status: editing.status === 'active' ? 'inactive' : 'active',
                  })
                }
              >
                <span />
              </button>
              <strong>{editing.status === 'active' ? 'Active' : 'Inactive'}</strong>
            </label>
          </div>

          <Field
            label="Product Description"
            value={editing.description || ''}
            onChange={(v) => setEditing({ ...editing, description: v })}
            area
          />
        </div>

        <div className="product-editor-images">
          <div className="product-editor-section-title">Product Images</div>
          <div className="product-main-image">
            <ImagePicker
              value={editing.image_url || ''}
              folder="products"
              alt="Selected product"
              onChange={(v) => setEditing({ ...editing, image_url: v })}
            />
          </div>
          <GalleryPicker
            value={Array.isArray(editing.image_gallery) ? editing.image_gallery : []}
            folder="products"
            onChange={(v) => setEditing({ ...editing, image_gallery: v })}
          />
        </div>
      </section>

      <section className="product-editor-card product-variants-card">
        <div className="product-variants-heading">
          <div className="product-editor-section-title">Sizes &amp; Prices (Variants)</div>
          <div className="product-variant-actions">
            <button type="button" className="secondary-button" onClick={addSize}>
              <Plus size={15} /> Add Size
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!selected.length}
              onClick={applyBulkPrice}
            >
              <Percent size={15} /> Bulk Price
            </button>
            <button
              type="button"
              className="product-delete-selected"
              disabled={!selected.length}
              onClick={() => void deleteSelected()}
            >
              <Trash2 size={15} /> Delete Selected
            </button>
          </div>
        </div>

        <div className="product-variants-table-wrap">
          {variantsLoading ? (
            <div className="workspace-empty">Loading sizes and prices...</div>
          ) : (
            <table className="product-variants-edit-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={variants.length > 0 && selected.length === variants.length}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? variants.map((v) => v.id).filter(Boolean) : [],
                        )
                      }
                    />
                  </th>
                  <th>Size</th>
                  <th>SKU</th>
                  <th>Price (₹)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => (
                  <tr key={variant.id || `new-${index}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(variant.id)}
                        disabled={!variant.id}
                        onChange={(e) =>
                          setSelected((current) =>
                            e.target.checked
                              ? [...current, variant.id]
                              : current.filter((id) => id !== variant.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={variant.size_label || ''}
                        placeholder="Size"
                        onChange={(e) =>
                          updateVariant(variant.id, { size_label: e.target.value }, variant._tempId)
                        }
                        onBlur={() => {
                          if (!variant.id) {
                            const row = variants[index]
                            setVariants((current) =>
                              current.map((x, i) =>
                                i === index ? { ...x, size_label: row.size_label } : x,
                              ),
                            )
                          }
                        }}
                      />
                    </td>
                    <td>
                      <input
                        value={variant.sku || ''}
                        onChange={(e) =>
                          updateVariant(variant.id, { sku: e.target.value }, variant._tempId)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={variant.price ?? ''}
                        onChange={(e) =>
                          updateVariant(variant.id, { price: e.target.value }, variant._tempId)
                        }
                      />
                    </td>
                    <td>
                      <select
                        value={variant.status || 'active'}
                        onChange={(e) =>
                          updateVariant(variant.id, { status: e.target.value }, variant._tempId)
                        }
                      >
                        <option value="active">● Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="product-row-icon"
                        onClick={() => updateVariant(variant.id, { _focus: true }, variant._tempId)}
                        title="Edit size"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="product-row-icon danger"
                        onClick={async () => {
                          if (!variant.id) {
                            setVariants((current) => current.filter((_, i) => i !== index))
                            return
                          }
                          const ok = window.confirm('Delete this size permanently?')
                          if (!ok || !supabase) return
                          const result = await dbFrom('product_variants')
                            .delete()
                            .eq('id', variant.id)
                          if (result.error) {
                            setError(result.error.message)
                            return
                          }
                          setVariants((current) => current.filter((x) => x.id !== variant.id))
                          setSelected((current) => current.filter((id) => id !== variant.id))
                        }}
                        title="Delete size"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!variantsLoading && !variants.length ? (
            <div className="workspace-empty">
              No sizes added yet. Click <strong>Add Size</strong> to create the first size.
            </div>
          ) : null}
        </div>

        <div className="product-variants-footer">
          <div className="product-bulk-price">
            <label>
              <input
                type="checkbox"
                checked={variants.length > 0 && selected.length === variants.length}
                onChange={(e) =>
                  setSelected(e.target.checked ? variants.map((v) => v.id).filter(Boolean) : [])
                }
              />
              <span>Select All</span>
            </label>
            <span>Set Price to</span>
            <input
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              type="number"
              min="0"
              placeholder="875"
            />
            <button
              type="button"
              className="primary-button"
              disabled={!selected.length || bulkPrice === ''}
              onClick={applyBulkPrice}
            >
              Apply to Selected
            </button>
          </div>
          <button
            type="button"
            className="product-save-all"
            onClick={() => void save()}
            disabled={saving}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </section>

      <section className="product-editor-card product-extra-card">
        <button
          type="button"
          className="product-extra-toggle"
          aria-expanded={additionalDetailsOpen}
          onClick={toggleAdditionalDetails}
        >
          <span className="product-extra-toggle-icon" aria-hidden="true">
            {additionalDetailsOpen ? '▼' : '▶'}
          </span>
          <span>Additional Product Details</span>
        </button>
        {additionalDetailsOpen ? (
          <div className="product-extra-content">
            <div className="workspace-form-row">
              <Field
                label="Product Type"
                value={editing.product_type || ''}
                onChange={(v) => setEditing({ ...editing, product_type: v })}
              />
              <Field
                label="Material"
                value={editing.material || ''}
                onChange={(v) => setEditing({ ...editing, material: v })}
              />
            </div>
            <div className="workspace-form-row">
              <Field
                label="Brand"
                value={editing.brand || ''}
                onChange={(v) => setEditing({ ...editing, brand: v })}
              />
              <Field
                label="Quality"
                value={editing.quality || ''}
                onChange={(v) => setEditing({ ...editing, quality: v })}
              />
            </div>
            <div className="workspace-form-row">
              <Field
                label="Fabric"
                value={editing.fabric || ''}
                onChange={(v) => setEditing({ ...editing, fabric: v })}
              />
              <Field
                label="Care Instructions"
                value={editing.care || ''}
                onChange={(v) => setEditing({ ...editing, care: v })}
                area
              />
            </div>
            <div className="workspace-form-row">
              <Field
                label="Delivery & Returns"
                value={editing.delivery_returns || ''}
                onChange={(v) => setEditing({ ...editing, delivery_returns: v })}
                area
              />
              <div />
            </div>
            <div className="workspace-product-benefits">
              {[
                ['cod_available', 'COD Available'],
                ['custom_order_cod', 'No COD on Custom Order (Embroidery)'],
                ['easy_returns', 'Easy Returns & Exchange'],
                ['express_shipping', '1–3 Day Express Shipping'],
                ['show_cod_returns_shipping', 'COD, Returns & Shipping'],
                ['show_details', 'Details'],
                ['show_description', 'Description'],
                ['show_quality_care', 'Quality & Care'],
                ['show_delivery_returns', 'Delivery & Returns'],
              ].map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={
                      key === 'cod_available' ||
                      key === 'easy_returns' ||
                      key === 'express_shipping'
                        ? editing[key] !== false
                        : editing[key] === true
                    }
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function GalleryPicker({
  value,
  onChange,
  folder = 'products',
}: {
  value: string[]
  onChange: (v: string[]) => void
  folder?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const uploadImages = async (files: FileList | null) => {
    if (!supabase || !files?.length) return
    setUploading(true)
    setError('')
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeName =
        file.name
          .replace(/[^a-zA-Z0-9.-]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || `image.${extension}`
      const storagePath = `${folder}/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
      const result = await supabase.storage.from('package-images').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })
      if (result.error) {
        setError(result.error.message)
        continue
      }
      urls.push(supabase.storage.from('package-images').getPublicUrl(storagePath).data.publicUrl)
    }
    if (urls.length) onChange([...value, ...urls])
    setUploading(false)
  }

  return (
    <div className="workspace-gallery-picker">
      <div className="workspace-gallery-grid">
        {value.map((url, index) => (
          <div className="workspace-gallery-thumb" key={url + index}>
            <img src={url} alt={`Gallery ${index + 1}`} />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label="Remove gallery image"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <label className="workspace-gallery-add">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={(e) => {
              void uploadImages(e.target.files)
              e.currentTarget.value = ''
            }}
          />
          <Plus size={20} />
          <span>{uploading ? 'Uploading...' : 'Add Images'}</span>
        </label>
      </div>
      {error ? <div className="workspace-image-error">{error}</div> : null}
    </div>
  )
}

function ImagePicker({
  value,
  onChange,
  folder = 'packages',
  alt = 'Selected image',
}: {
  value: string
  onChange: (v: string) => void
  folder?: string
  alt?: string
}) {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState('')

  const loadImages = async () => {
    if (!supabase) return
    setLoading(true)
    setImageError('')
    const storage = supabase.storage
    const result = await storage.from('package-images').list(folder, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (result.error) {
      setImageError(result.error.message)
      setImages([])
    } else {
      setImages(
        (result.data ?? [])
          .filter((file) => file.name)
          .map(
            (file) =>
              storage.from('package-images').getPublicUrl(`${folder}/${file.name}`).data.publicUrl,
          ),
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) void loadImages()
  }, [open, folder])

  const uploadImage = async (file: File) => {
    if (!supabase) return
    setUploading(true)
    setImageError('')
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName =
      file.name
        .replace(/[^a-zA-Z0-9.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `image.${extension}`
    const path = `${folder}/${Date.now()}-${safeName}`
    const result = await supabase.storage.from('package-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (result.error) {
      setImageError(result.error.message)
    } else {
      const url = supabase.storage.from('package-images').getPublicUrl(path).data.publicUrl
      onChange(url)
      setOpen(false)
    }
    setUploading(false)
  }

  return (
    <div className="workspace-image-picker">
      <div className="workspace-image-picker-box">
        {value ? (
          <img src={value} alt={alt} />
        ) : (
          <button
            type="button"
            className="workspace-image-picker-add"
            onClick={() => setOpen(true)}
            aria-label="Add image"
          >
            <Plus size={22} />
            <span>Add Image</span>
          </button>
        )}
        {value ? (
          <button
            type="button"
            className="workspace-image-picker-change"
            onClick={() => setOpen(true)}
          >
            Change Image
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="workspace-image-picker-panel">
          <div className="workspace-image-picker-panel-header">
            <strong>Media Library</strong>
            <button type="button" className="workspace-close" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <label className="workspace-image-upload">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadImage(file)
                e.currentTarget.value = ''
              }}
            />
            <Plus size={17} />
            {uploading ? 'Uploading...' : 'Add New Image'}
          </label>

          {imageError ? <div className="workspace-image-error">{imageError}</div> : null}

          <div className="workspace-image-library">
            {loading ? (
              <span>Loading images...</span>
            ) : images.length ? (
              images.map((url) => (
                <button
                  type="button"
                  className={`workspace-image-tile${value === url ? ' selected' : ''}`}
                  key={url}
                  onClick={() => {
                    onChange(url)
                    setOpen(false)
                  }}
                >
                  <img src={url} alt="" />
                </button>
              ))
            ) : (
              <span>No images uploaded yet.</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Packages({
  packageSlug,
  branchId,
}: {
  packageSlug?: string | null
  branchId?: string | null
}) {
  const [rows, setRows] = useState<any[]>([]),
    [products, setProducts] = useState<any[]>([]),
    [items, setItems] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [itemEditing, setItemEditing] = useState<any>(null),
    [itemVariants, setItemVariants] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [bulkImporting, setBulkImporting] = useState(false)
  const load = async () => {
    if (!supabase) return
    setLoading(true)
    if (!branchId) {
      setRows([])
      setProducts([])
      setLoading(false)
      return
    }
    const [p, x, pi] = await Promise.all([
      dbFrom('uniform_packages').select('*').eq('branch_id', branchId).order('name'),
      dbFrom('products')
        .select('id,name,gender,base_price')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name'),
      dbFrom('package_items')
        .select('package_id,product_id,quantity,sort_order')
        .order('sort_order'),
    ])

    const productMap = Object.fromEntries(
      (x.data ?? []).map((product: any) => [product.id, product]),
    )
    const packageItemsMap: Record<string, string[]> = {}

    for (const item of pi.data ?? []) {
      const product = productMap[item.product_id]
      if (!product) continue
      if (!packageItemsMap[item.package_id]) packageItemsMap[item.package_id] = []
      packageItemsMap[item.package_id].push(
        `${product.name}${Number(item.quantity || 1) > 1 ? ` × ${item.quantity}` : ''}`,
      )
    }

    setRows(
      (p.data ?? []).map((pkg: any) => ({
        ...pkg,
        item_names: packageItemsMap[pkg.id] ?? [],
      })),
    )
    setProducts(x.data ?? [])
    setError(p.error?.message || x.error?.message || pi.error?.message || '')
    setLoading(false)
  }
  const downloadPackageTemplate = () => {
    const headers = ['Package Name', 'Gender', 'Discount (%)', 'Description', 'Status', 'Items']
    const sample = ['Sample Package', 'unisex', 10, 'Package description', 'active', 'Sample Shirt']
    const sheet = XLSX.utils.aoa_to_sheet([headers, sample])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Uniform Packages')
    XLSX.writeFile(workbook, 'Uniform_Packages_Import_Template.xlsx')
  }

  const exportPackages = () => {
    const headers = ['Package', 'Gender', 'Base Price', 'Discount (%)', 'Offer Price', 'Items', 'Status']
    const values = rows.map((p) => [
      p.name || '',
      formatGender(p.gender),
      Number(p.base_price || 0),
      Number(p.discount_percentage || 0),
      Number(p.offer_price || 0),
      (p.item_names || []).join(', '),
      p.status || 'active',
    ])
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...values])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Uniform Packages')
    XLSX.writeFile(workbook, `Uniform_Packages_Export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const importPackages = async (file: File) => {
    if (!supabase || bulkImporting || !branchId) return
    setBulkImporting(true)
    setError('')
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const raw = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' })
      if (!raw.length) throw new Error('The Excel file contains no package records.')
      let success = 0
      const errors: string[] = []

      for (let i = 0; i < raw.length; i += 1) {
        const r = raw[i]
        const name = String(r['Package Name'] ?? r.Package ?? r.package_name ?? r.name ?? '').trim()
        if (!name) {
          errors.push(`Row ${i + 2}: Package Name is required.`)
          continue
        }
        const genderRaw = String(r.Gender ?? r.gender ?? 'unisex').trim().toLowerCase()
        const gender = ['boys', 'girls', 'unisex'].includes(genderRaw) ? genderRaw : 'unisex'
        const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const discount = Math.min(100, Math.max(0, Number(r['Discount (%)'] ?? r.discount_percentage ?? 0)))
        const result = await dbFrom('uniform_packages').upsert({
          branch_id: branchId,
          name,
          slug: baseSlug,
          gender,
          description: String(r.Description ?? r.description ?? '').trim() || null,
          discount_percentage: discount,
          base_price: 0,
          offer_price: 0,
          status: ['active', 'inactive', 'suspended'].includes(String(r.Status ?? r.status ?? 'active').toLowerCase())
            ? String(r.Status ?? r.status ?? 'active').toLowerCase()
            : 'active',
        }, { onConflict: 'branch_id,slug' }).select('id').single()

        if (result.error || !result.data?.id) {
          errors.push(`Row ${i + 2}: ${result.error?.message || 'Unable to save package.'}`)
          continue
        }

        const packageId = result.data.id
        const itemText = String(r.Items ?? r.items ?? '').trim()
        if (itemText) {
          await dbFrom('package_items').delete().eq('package_id', packageId)
          const names = itemText.split(',').map((value) => value.replace(/ × \\d+$/, '').trim()).filter(Boolean)
          const packageRows: any[] = []
          let basePrice = 0

          for (let itemIndex = 0; itemIndex < names.length; itemIndex += 1) {
            const match = await dbFrom('products')
              .select('id,name,base_price')
              .eq('branch_id', branchId)
              .ilike('name', names[itemIndex])
              .maybeSingle()
            if (!match.data?.id) {
              errors.push(`Row ${i + 2}: Product "${names[itemIndex]}" was not found in this branch.`)
              continue
            }
            const variantsResult = await dbFrom('product_variants')
              .select('id')
              .eq('product_id', match.data.id)
              .eq('status', 'active')
            packageRows.push({
              package_id: packageId,
              product_id: match.data.id,
              quantity: 1,
              is_required: true,
              requires_size: true,
              selection_group: null,
              sort_order: itemIndex,
              variant_ids: (variantsResult.data || []).map((v: any) => v.id),
            })
            basePrice += Number(match.data.base_price || 0)
          }

          if (packageRows.length) {
            const itemsResult = await dbFrom('package_items').insert(packageRows)
            if (itemsResult.error) errors.push(`Row ${i + 2}: Package items failed: ${itemsResult.error.message}`)
          }

          const offerPrice = Math.max(0, basePrice * (1 - discount / 100))
          const priceResult = await dbFrom('uniform_packages').update({ base_price: basePrice, offer_price: offerPrice }).eq('id', packageId)
          if (priceResult.error) errors.push(`Row ${i + 2}: Package price update failed: ${priceResult.error.message}`)
        }

        const branchResult = await dbFrom('branch_packages').upsert(
          { branch_id: branchId, package_id: packageId, branch_price: Number(r['Offer Price'] ?? r.offer_price ?? 0), is_visible: String(r.Status ?? r.status ?? 'active').toLowerCase() === 'active' },
          { onConflict: 'branch_id,package_id' },
        )
        if (branchResult.error) errors.push(`Row ${i + 2}: Branch package link failed: ${branchResult.error.message}`)
        else success += 1
      }

      await load()
      setError(errors.length
        ? `Imported ${success} package(s). ${errors.length} issue(s). ${errors.slice(0, 5).join(' | ')}`
        : `Successfully imported ${success} package(s).`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to import uniform packages.')
    } finally {
      setBulkImporting(false)
    }
  }

  const loadItems = async (packageId: string) => {
    if (!supabase) return
    const r = await dbFrom('package_items')
      .select('*')
      .eq('package_id', packageId)
      .order('sort_order')
    setItems(r.data ?? [])
    if (r.data && editing?.id === packageId) {
      const basePrice = r.data.reduce((total: number, item: any) => {
        const product = products.find((p) => p.id === item.product_id)
        return total + Number(product?.base_price || 0) * Number(item.quantity || 1)
      }, 0)
      const discount = Number(editing.discount_percentage || 0)
      setEditing((current: any) =>
        current
          ? {
              ...current,
              base_price: basePrice,
              offer_price: calculateOfferPrice(basePrice, discount),
            }
          : current,
      )
    }
    if (r.error) setError(r.error.message || '')
  }
  const loadItemVariants = async (productId: string) => {
    if (!supabase || !productId) {
      setItemVariants([])
      return
    }
    const r = await dbFrom('product_variants')
      .select('id,sku,size_label,color,variant_name,status')
      .eq('product_id', productId)
      .eq('status', 'active')
      .order('size_label')
    setItemVariants(r.data ?? [])
    if (r.error) setError(r.error.message || '')
  }

  useEffect(() => {
    void load()
    const addHandler = () =>
      setEditing({
        branch_id: branchId,
        name: '',
        gender: 'unisex',
        base_price: 0,
        offer_price: 0,
        discount_percentage: 0,
        status: 'active',
      })
    const refreshHandler = () => void load()
    window.addEventListener('packages:add', addHandler)
    window.addEventListener('packages:refresh', refreshHandler)
    return () => {
      window.removeEventListener('packages:add', addHandler)
      window.removeEventListener('packages:refresh', refreshHandler)
    }
  }, [branchId])
  useEffect(() => {
    if (!packageSlug || !branchId || !supabase) return

    let cancelled = false

    const loadPackagePage = async () => {
      setLoading(true)
      setError('')

      const slugResult = await dbFrom('uniform_packages')
        .select('*')
        .eq('slug', packageSlug)
        .eq('branch_id', branchId)
        .maybeSingle()

      if (cancelled) return

      let pkg = slugResult.data

      if (!pkg && !slugResult.error) {
        const nameFromSlug = decodeURIComponent(packageSlug).replace(/-/g, ' ').trim()
        const nameResult = await dbFrom('uniform_packages')
          .select('*')
          .eq('branch_id', branchId)
          .ilike('name', nameFromSlug)
          .maybeSingle()

        if (cancelled) return

        if (nameResult.error) {
          setError(nameResult.error.message)
          setEditing(null)
          setLoading(false)
          return
        }

        pkg = nameResult.data
      }

      if (slugResult.error || !pkg) {
        setError(slugResult.error?.message || 'Package not found.')
        setEditing(null)
        setLoading(false)
        return
      }

      const itemsResult = await dbFrom('package_items')
        .select('*')
        .eq('package_id', pkg.id)
        .order('sort_order')

      if (cancelled) return

      if (itemsResult.error) {
        setError(itemsResult.error.message)
        setEditing(null)
        setLoading(false)
        return
      }

      const packageItems = itemsResult.data ?? []
      const productIds = packageItems.map((item: any) => item.product_id).filter(Boolean)
      let packageProducts = products

      if (productIds.length) {
        const productsResult = await dbFrom('products')
          .select('id,name,gender,base_price')
          .in('id', productIds)

        if (cancelled) return

        if (productsResult.error) {
          setError(productsResult.error.message)
          setEditing(null)
          setLoading(false)
          return
        }

        packageProducts = productsResult.data ?? []
      }

      const basePrice = packageItems.reduce((total: number, item: any) => {
        const product = packageProducts.find((p: any) => p.id === item.product_id)
        return total + Number(product?.base_price || 0) * Number(item.quantity || 1)
      }, 0)

      setItems(packageItems)
      setEditing({
        ...pkg,
        base_price: basePrice,
        discount_percentage: pkg.discount_percentage ?? 0,
        offer_price:
          pkg.offer_price ?? calculateOfferPrice(basePrice, Number(pkg.discount_percentage || 0)),
      })

      if (!cancelled) setLoading(false)
    }

    void loadPackagePage()

    return () => {
      cancelled = true
    }
  }, [packageSlug, branchId])

  const calculatePackageBasePrice = () =>
    items.reduce((total, item) => {
      const product = products.find((p) => p.id === item.product_id)
      return total + Number(product?.base_price || 0) * Number(item.quantity || 1)
    }, 0)

  const calculateOfferPrice = (basePrice: number, discount: number) =>
    Math.max(0, basePrice * (1 - Math.min(100, Math.max(0, discount)) / 100))

  const save = async (editingOverride?: any, closeAfter = true) => {
    const currentEditing = editingOverride || editing
    if (!supabase || !currentEditing) return
    if (!branchId) {
      setError('Select an active branch before saving the package.')
      return
    }
    const name = String(currentEditing.name || '').trim()
    if (!name) {
      setError('Package Name is required.')
      return
    }

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    let slug = baseSlug
    const slugConflict = await dbFrom('uniform_packages')
      .select('id')
      .eq('branch_id', branchId)
      .eq('slug', baseSlug)
      .neq('id', currentEditing.id || '00000000-0000-0000-0000-000000000000')
      .maybeSingle()
    if (slugConflict.error) {
      setError(slugConflict.error.message)
      return
    }
    if (slugConflict.data) {
      slug = `${baseSlug}-${String(currentEditing.id || 'new').slice(0, 6)}`
    }
    const p = {
      name,
      slug,
      description: currentEditing.description || null,
      gender: currentEditing.gender,
      image_url: currentEditing.image_url || null,
      base_price: Number(currentEditing.base_price || 0),
      discount_percentage: Number(currentEditing.discount_percentage || 0),
      offer_price: Number(
        currentEditing.offer_price ??
          calculateOfferPrice(
            Number(currentEditing.base_price || 0),
            Number(currentEditing.discount_percentage || 0),
          ),
      ),
      status: currentEditing.status,
      branch_id: branchId,
    }
    const r = currentEditing.id
      ? await dbFrom('uniform_packages')
          .update(p)
          .eq('id', currentEditing.id)
          .eq('branch_id', branchId)
      : await dbFrom('uniform_packages').insert(p).select('id').single()
    if (r.error) setError(r.error.message)
    else {
      const packageId = currentEditing.id || r.data?.id
      if (packageId) {
        const catalogResult = await dbFrom('branch_packages').upsert(
          {
            branch_id: branchId,
            package_id: packageId,
            branch_price: Number(currentEditing.offer_price ?? currentEditing.base_price ?? 0),
            is_visible: currentEditing.status === 'active',
          },
          { onConflict: 'branch_id,package_id' },
        )
        if (catalogResult.error) {
          setError(catalogResult.error.message)
          return
        }
      }
      if (closeAfter) {
        setEditing(null)
        setItems([])
      } else {
        setEditing({ ...currentEditing, base_price: Number(currentEditing.base_price || 0) })
      }
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
      variant_ids: Array.isArray(itemEditing.variant_ids) ? itemEditing.variant_ids : [],
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
  const isPackagePage = Boolean(packageSlug)

  useEffect(() => {
    if (!editing?.id || !isPackagePage) return
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [editing?.id, isPackagePage])

  return (
    <>
      {isPackagePage && !editing?.id ? (
        <>
          <ErrorBox text={error} />
          {loading ? (
            <Panel>
              <Loading />
            </Panel>
          ) : (
            <Panel>
              <div className="workspace-empty">{error || 'Unable to load this package.'}</div>
            </Panel>
          )}
        </>
      ) : null}
      {!isPackagePage && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <BulkTools
              title="Excel Bulk Import / Export — Uniform Packages"
              description="Download a package template, export current packages, or upload package records in bulk."
              demoLabel="Download Package Template"
              exportLabel="Download Packages"
              importing={bulkImporting}
              canExport={rows.length > 0}
              onDemo={downloadPackageTemplate}
              onExport={exportPackages}
              onImport={(file) => void importPackages(file)}
            />
          </div>
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
                    <span>{formatGender(x.gender)}</span>
                    <span>₹{Number(x.base_price || 0).toLocaleString('en-IN')}</span>
                    <span>
                      {x.item_names?.length ? (
                        <span className="package-list-items">
                          {x.item_names.map((name: string, index: number) => (
                            <span key={`${x.id}-item-${index}`}>{name}</span>
                          ))}
                        </span>
                      ) : (
                        'No items configured'
                      )}
                    </span>
                    <button
                      onClick={() => {
                        const baseSlug = String(x.name || 'package')
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, '')
                        const duplicateNameCount = rows.filter(
                          (row) =>
                            String(row.name || '')
                              .trim()
                              .toLowerCase() ===
                            String(x.name || '')
                              .trim()
                              .toLowerCase(),
                        ).length
                        const slug =
                          duplicateNameCount > 1
                            ? `${baseSlug}-${String(x.id).slice(0, 6)}`
                            : baseSlug
                        window.history.pushState(
                          { schoolUniformApp: 'admin', tool: 'packages', packageSlug: slug },
                          '',
                          `/admin/uniform-packages/edit/${encodeURIComponent(slug)}`,
                        )
                        window.dispatchEvent(new PopStateEvent('popstate'))
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}
      {editing && !isPackagePage && (
        <EditModal
          title={editing.id ? 'Edit Package' : 'Add Package'}
          onClose={() => {
            setEditing(null)
            setItems([])
          }}
          onSave={save}
        >
          <div className="workspace-form-row">
            <Field
              label="Name"
              value={editing.name}
              onChange={(v) => setEditing({ ...editing, name: v })}
            />
            <Select
              label="Gender"
              value={editing.gender || 'unisex'}
              options={['boys', 'girls', 'unisex']}
              labels={{ boys: 'Boys', girls: 'Girls', unisex: 'Unisex' }}
              onChange={(v) => setEditing({ ...editing, gender: v })}
            />
          </div>
          <div className="workspace-form-row workspace-form-row-pricing">
            <Field
              label="Base Price"
              value={String(calculatePackageBasePrice())}
              onChange={() => undefined}
              type="number"
            />
            <Field
              label="Discount (%)"
              value={String(editing.discount_percentage ?? 0)}
              onChange={(v) => setEditing({ ...editing, discount_percentage: v })}
              type="number"
            />
            <Field
              label="Offer Price"
              value={String(
                calculateOfferPrice(
                  calculatePackageBasePrice(),
                  Number(editing.discount_percentage || 0),
                ),
              )}
              onChange={() => undefined}
              type="number"
            />
          </div>
          <Field
            label="Description"
            value={editing.description || ''}
            onChange={(v) => setEditing({ ...editing, description: v })}
            area
          />
          <div className="workspace-form-row workspace-form-row-image-status">
            <label className="workspace-field">
              <span>Package Image</span>
              <ImagePicker
                value={editing.image_url || ''}
                folder="packages"
                alt="Selected package"
                onChange={(v) => setEditing({ ...editing, image_url: v })}
              />
            </label>
            <Select
              label="Status"
              value={editing.status}
              options={['active', 'inactive', 'suspended']}
              onChange={(v) => setEditing({ ...editing, status: v })}
            />
          </div>
          {editing.id && (
            <>
              <div className="panel-heading">
                <h3>Package Items</h3>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setItemEditing({
                      package_id: editing.id,
                      product_id: products[0]?.id || '',
                      quantity: 1,
                      is_required: true,
                      requires_size: true,
                      selection_group: '',
                      sort_order: items.length,
                      variant_ids: [],
                    })
                    setItemVariants([])
                    if (products[0]?.id) void loadItemVariants(products[0].id)
                  }}
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              <div className="package-items-inline">
                {items.length ? (
                  items.map((i) => (
                    <div className="package-item-inline-row" key={i.id}>
                      <div className="package-item-inline-main">
                        <strong>
                          {i.quantity} ×{' '}
                          {products.find((p) => p.id === i.product_id)?.name || i.product_id}
                        </strong>
                        {i.requires_size ? (
                          <span className="package-variant-summary">
                            {Array.isArray(i.variant_ids) && i.variant_ids.length
                              ? `${i.variant_ids.length} Variant${i.variant_ids.length === 1 ? '' : 's'} configured`
                              : 'No variants configured'}
                          </span>
                        ) : (
                          <span className="package-size-not-required">No size selection</span>
                        )}
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setError('')
                          setItemEditing({
                            ...i,
                            variant_ids: Array.isArray(i.variant_ids) ? i.variant_ids : [],
                          })
                          void loadItemVariants(i.product_id)
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="workspace-empty package-items-empty">
                    No products added to this package yet.
                  </div>
                )}
              </div>
            </>
          )}
        </EditModal>
      )}
      {isPackagePage && editing?.id && (
        <PackageEditorScreen
          editing={editing}
          setEditing={setEditing}
          products={products}
          items={items}
          onBack={() => {
            window.history.pushState(
              { schoolUniformApp: 'admin', tool: 'packages', packageSlug: null },
              '',
              '/admin/uniform-packages',
            )
            window.dispatchEvent(new PopStateEvent('popstate'))
          }}
          onSave={async (value) => {
            await save(value, false)
          }}
          onAddItem={() => {
            setItemEditing({
              package_id: editing.id,
              product_id: products[0]?.id || '',
              quantity: 1,
              is_required: true,
              requires_size: true,
              selection_group: '',
              sort_order: items.length,
              variant_ids: [],
            })
            setItemVariants([])
            if (products[0]?.id) void loadItemVariants(products[0].id)
          }}
          onEditItem={(item) => {
            setError('')
            setItemEditing({
              ...item,
              variant_ids: Array.isArray(item.variant_ids) ? item.variant_ids : [],
            })
            void loadItemVariants(item.product_id)
          }}
          error={error}
        />
      )}{' '}
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
            onChange={(v) => {
              setItemEditing({ ...itemEditing, product_id: v, variant_ids: [] })
              void loadItemVariants(v)
            }}
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

          <div className="workspace-variant-config">
            <div className="workspace-variant-config-header">
              <div>
                <span className="workspace-field-label">Variants</span>
                <p className="workspace-muted">
                  Select the sizes/variants customers can choose for this package item.
                </p>
              </div>
              {itemVariants.length ? (
                <div className="workspace-variant-config-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setItemEditing({
                        ...itemEditing,
                        variant_ids: itemVariants.map((variant) => variant.id),
                      })
                    }
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setItemEditing({ ...itemEditing, variant_ids: [] })}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>

            {itemVariants.length ? (
              <div className="workspace-variant-grid">
                {itemVariants.map((variant) => {
                  const selected = (itemEditing.variant_ids || []).includes(variant.id)
                  const label =
                    variant.size_label || variant.variant_name || variant.color || variant.sku
                  return (
                    <label className="workspace-variant-option" key={variant.id}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) =>
                          setItemEditing({
                            ...itemEditing,
                            variant_ids: e.target.checked
                              ? [...(itemEditing.variant_ids || []), variant.id]
                              : (itemEditing.variant_ids || []).filter(
                                  (id: string) => id !== variant.id,
                                ),
                          })
                        }
                      />
                      <span>{label}</span>
                      {variant.color && variant.size_label ? <small>{variant.color}</small> : null}
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="workspace-variant-empty">
                No variants are configured for this product. Create them first in{' '}
                <strong>Products &amp; Variants</strong>.
              </div>
            )}
          </div>
        </EditModal>
      )}
    </>
  )
}

function OrdersAdmin({ search }: { search: string }) {
  const [rows, setRows] = useState<any[]>([]),
    [unmatchedPayments, setUnmatchedPayments] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const [o, p, s, b, oi, pi, products, payments] = await Promise.all([
      dbFrom('orders').select('*').order('created_at', { ascending: false }),
      dbFrom('profiles').select('id,full_name,login_id'),
      dbFrom('students').select('id,full_name,student_code'),
      dbFrom('branches').select('id,name'),
      dbFrom('order_items')
        .select(
          'id,order_id,product_id,package_id,quantity,unit_price,item_name_snapshot,selected_variants',
        )
        .order('created_at'),
      dbFrom('package_items')
        .select('package_id,product_id,quantity,sort_order')
        .order('sort_order'),
      dbFrom('products').select('id,name'),
      dbFrom('payments')
        .select('id,order_id,provider_payment_id,provider,amount,status,paid_at,created_at')
        .order('created_at', { ascending: false }),
    ])

    const pm = Object.fromEntries((p.data ?? []).map((x: any) => [x.id, x]))
    const sm = Object.fromEntries((s.data ?? []).map((x: any) => [x.id, x]))
    const bm = Object.fromEntries((b.data ?? []).map((x: any) => [x.id, x]))
    const productMap = Object.fromEntries((products.data ?? []).map((x: any) => [x.id, x.name]))
    const packageItemsMap: Record<string, any[]> = {}

    for (const item of pi.data ?? []) {
      if (!packageItemsMap[item.package_id]) packageItemsMap[item.package_id] = []
      packageItemsMap[item.package_id].push(item)
    }

    const itemsByOrder: Record<string, string[]> = {}
    const paymentsByOrder: Record<string, any[]> = {}
    const orderIds = new Set((o.data ?? []).map((x: any) => x.id))

    for (const payment of payments.data ?? []) {
      if (!payment.order_id || !orderIds.has(payment.order_id)) continue
      if (!paymentsByOrder[payment.order_id]) paymentsByOrder[payment.order_id] = []
      paymentsByOrder[payment.order_id].push(payment)
    }

    for (const item of oi.data ?? []) {
      const orderItems = itemsByOrder[item.order_id] || []
      const quantity = Number(item.quantity || 1)

      if (item.package_id) {
        const packageName = item.item_name_snapshot || 'Uniform Package'
        orderItems.push(`${packageName} × ${quantity}`)
        const components = packageItemsMap[item.package_id] || []
        for (const component of components) {
          const componentQuantity = Number(component.quantity || 1) * quantity
          const productName = productMap[component.product_id] || 'Product'
          orderItems.push(`↳ ${productName} × ${componentQuantity}`)
        }
      } else {
        const productName = productMap[item.product_id] || item.item_name_snapshot || 'Product'
        orderItems.push(`${productName} × ${quantity}`)
      }

      itemsByOrder[item.order_id] = orderItems
    }

    setRows(
      (o.data ?? []).map((x: any) => ({
        ...x,
        customer: pm[x.customer_user_id]?.full_name || pm[x.customer_user_id]?.login_id || '—',
        student: sm[x.student_id]?.full_name || sm[x.student_id]?.student_code || '—',
        branch: bm[x.branch_id]?.name || '—',
        products: itemsByOrder[x.id] ?? [],
        payments: paymentsByOrder[x.id] ?? [],
      })),
    )
    setUnmatchedPayments(
      (payments.data ?? []).filter(
        (payment: any) => !payment.order_id || !orderIds.has(payment.order_id),
      ),
    )
    setError(
      o.error?.message ||
        p.error?.message ||
        s.error?.message ||
        b.error?.message ||
        oi.error?.message ||
        pi.error?.message ||
        products.error?.message ||
        payments.error?.message ||
        '',
    )
    setLoading(false)
  }

  useEffect(() => {
    void load()
    const refreshHandler = () => void load()
    window.addEventListener('orders:refresh', refreshHandler)
    window.addEventListener('payments:refresh', refreshHandler)
    return () => {
      window.removeEventListener('orders:refresh', refreshHandler)
      window.removeEventListener('payments:refresh', refreshHandler)
    }
  }, [])

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
    } else if (result.data) {
      setRows((current) =>
        current.map((row) => (row.id === orderId ? { ...row, status: result.data.status } : row)),
      )
      const templateByStatus: Record<string, string> = {
        processing: 'order_processing',
        completed: 'order_completed',
        cancelled: 'order_cancelled',
        refunded: 'refund_processed',
      }
      const templateKey = templateByStatus[status]
      if (templateKey) {
        void supabase.functions.invoke('send-system-email', {
          body: { order_id: orderId, template_key: templateKey },
        })
      }
    }

    setUpdatingStatus(null)
  }

  const filtered = rows.filter((x) =>
    [
      x.order_number,
      x.status,
      x.customer,
      x.student,
      x.branch,
      ...(x.products || []),
      ...(x.payments || []).flatMap((payment: any) => [
        payment.provider_payment_id,
        payment.provider,
        payment.status,
      ]),
    ].some((v) =>
      String(v ?? '')
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  )
  const filteredUnmatchedPayments = unmatchedPayments.filter((payment) =>
    [
      payment.provider_payment_id,
      payment.id,
      payment.order_id,
      payment.provider,
      payment.status,
    ].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  )

  return (
    <>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <Panel>
          <div className="panel-heading">
            <h2>Orders & Payments</h2>
          </div>
          <div className="workspace-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Student</th>
                  <th>Branch</th>
                  <th>Products</th>
                  <th>Order Status</th>
                  <th>Payment Transactions</th>
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
                    <td>
                      <div style={{ display: 'grid', gap: '4px', minWidth: '260px' }}>
                        {x.products.length ? (
                          x.products.map((product: string, index: number) => (
                            <span key={`${x.id}-product-${index}`}>{product}</span>
                          ))
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        value={x.status || 'pending'}
                        disabled={updatingStatus === x.id}
                        onChange={(e) => void updateOrderStatus(x.id, e.target.value)}
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
                    <td>
                      <div style={{ display: 'grid', gap: '8px', minWidth: '190px' }}>
                        {x.payments.length ? (
                          x.payments.map((payment: any) => (
                            <div key={payment.id} style={{ display: 'grid', gap: '2px' }}>
                              <strong>
                                {payment.provider_payment_id || payment.id.slice(0, 8)}
                              </strong>
                              <span>
                                {payment.provider || '—'} · {payment.status || 'Unknown'}
                              </span>
                              <span>
                                ₹{Number(payment.amount || 0).toLocaleString('en-IN')} ·{' '}
                                {payment.paid_at
                                  ? new Date(payment.paid_at).toLocaleDateString('en-IN')
                                  : 'Not paid'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span>No payment recorded</span>
                        )}
                      </div>
                    </td>
                    <td>₹{Number(x.grand_total || 0).toLocaleString('en-IN')}</td>
                    <td>{new Date(x.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {!loading && filteredUnmatchedPayments.length > 0 && (
        <Panel>
          <div className="panel-heading">
            <h2>Payments Without a Matching Order</h2>
          </div>
          <div className="workspace-scroll">
            <table>
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Order Reference</th>
                  <th>Provider</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnmatchedPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.provider_payment_id || payment.id.slice(0, 8)}</td>
                    <td>{payment.order_id || '—'}</td>
                    <td>{payment.provider || '—'}</td>
                    <td>₹{Number(payment.amount || 0).toLocaleString('en-IN')}</td>
                    <td>{payment.status || 'Unknown'}</td>
                    <td>
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
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

function InventoryAdmin() {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(''),
    [bulkImporting, setBulkImporting] = useState(false)

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

  const downloadInventoryTemplate = () => {
    const headers = ['Branch', 'Product', 'SKU', 'Size', 'Quantity on Hand', 'Reorder Level']
    const sample = ['', '', '', '', 0, 5]
    const sheet = XLSX.utils.aoa_to_sheet([headers, sample])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Inventory')
    XLSX.writeFile(workbook, 'Inventory_Import_Template.xlsx')
  }
  const exportInventory = () => {
    const headers = ['Branch', 'Product', 'SKU', 'Size', 'Quantity on Hand', 'Reorder Level']
    const values = rows.map((r) => [r.branch_name || '', r.product_name || '', r.sku || '', r.size || '', Number(r.quantity_on_hand || 0), Number(r.reorder_level || 0)])
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...values])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Inventory')
    XLSX.writeFile(workbook, `Inventory_Export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }
  const importInventory = async (file: File) => {
    if (!supabase || bulkImporting) return
    setBulkImporting(true)
    setError('')
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const raw = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' })
      if (!raw.length) throw new Error('The Excel file contains no inventory records.')
      let success = 0
      const errors: string[] = []
      for (let i = 0; i < raw.length; i += 1) {
        const r = raw[i]
        const branchText = String(r.Branch ?? r.branch ?? '').trim()
        const productText = String(r.Product ?? r.product ?? '').trim()
        const sku = String(r.SKU ?? r.sku ?? '').trim()
        const branch = (await dbFrom('branches').select('id').or(`name.ilike.%${branchText}%,id.eq.${branchText}`).maybeSingle()).data
        const product = (await dbFrom('products').select('id').eq('branch_id', branch?.id).ilike('name', productText).maybeSingle()).data
        const variant = product ? (await dbFrom('product_variants').select('id').eq('product_id', product.id).eq('sku', sku).maybeSingle()).data : null
        if (!branch?.id || !product?.id || !variant?.id) {
          errors.push(`Row ${i + 2}: Branch, Product and SKU must match existing records.`)
          continue
        }
        const result = await dbFrom('branch_inventory').upsert({
          branch_id: branch.id,
          product_id: product.id,
          variant_id: variant.id,
          quantity_on_hand: Number(r['Quantity on Hand'] ?? r.quantity_on_hand ?? 0),
          reorder_level: Number(r['Reorder Level'] ?? r.reorder_level ?? 0),
        }, { onConflict: 'branch_id,variant_id' })
        if (result.error) errors.push(`Row ${i + 2}: ${result.error.message}`)
        else success += 1
      }
      await load()
      setError(errors.length ? `Imported ${success} inventory row(s). ${errors.length} failed. ${errors.slice(0,5).join(' | ')}` : `Successfully imported ${success} inventory row(s).`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to import inventory.')
    } finally {
      setBulkImporting(false)
    }
  }

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
        <BulkTools
          title="Excel Bulk Import / Export — Inventory"
          description="Download a template, export current inventory, or upload stock quantities in bulk."
          demoLabel="Download Inventory Template"
          exportLabel="Download Inventory"
          importing={bulkImporting}
          canExport={rows.length > 0}
          onDemo={downloadInventoryTemplate}
          onExport={exportInventory}
          onImport={(file) => void importInventory(file)}
        />
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
  const emptyChild = (branchId = '') => ({
    student_id: '',
    student_code: '',
    full_name: '',
    father_name: '',
    class_name: '',
    section: '',
    gender: '',
    date_of_birth: '',
    branch_id: branchId,
  })

  const [parents, setParents] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [parentEditing, setParentEditing] = useState<any>(null)
  const [studentEditing, setStudentEditing] = useState<any>(null)
  const [savingParent, setSavingParent] = useState(false)
  const [parentChildren, setParentChildren] = useState<Record<string, string[]>>({})
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRows, setBulkRows] = useState<any[]>([])
  const [bulkError, setBulkError] = useState('')
  const [bulkResult, setBulkResult] = useState<{
    processed: number
    success: number
    failed: number
  } | null>(null)
  const [bulkImporting, setBulkImporting] = useState(false)

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const [parentsResult, studentsResult, branchesResult, linksResult] = await Promise.all([
      dbFrom('profiles')
        .select('id,full_name,login_id,phone,branch_id,status,role')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
        .limit(200),
      dbFrom('students').select('*').order('created_at', { ascending: false }).limit(200),
      dbFrom('branches').select('id,name').order('name'),
      dbFrom('parent_student_links').select('parent_user_id,student_id'),
    ])
    setParents(parentsResult.data ?? [])
    setStudents(studentsResult.data ?? [])
    setBranches(branchesResult.data ?? [])
    const grouped: Record<string, string[]> = {}
    ;(linksResult.data ?? []).forEach((link: any) => {
      grouped[link.parent_user_id] = [...(grouped[link.parent_user_id] || []), link.student_id]
    })
    setParentChildren(grouped)
    setError(
      parentsResult.error?.message ||
        studentsResult.error?.message ||
        branchesResult.error?.message ||
        linksResult.error?.message ||
        '',
    )
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const downloadBulkTemplate = () => {
    const headers = [
      'Branch',
      'Parent Name',
      'Parent ID',
      'Password',
      'Email',
      'Phone',
      'Student Code',
      'Student Name',
      'Class',
      'Section',
      'Gender',
      'DOB',
    ]
    const sample = [
      'CBSE',
      'Bhupesh Kumar',
      'BHUPESHKUMAR',
      'Qwerty@123',
      '',
      '',
      'CBSE-001',
      'Tanmay Kumar',
      '7th',
      'A',
      'Boys',
      '2014-03-01',
    ]
    const sheet = XLSX.utils.aoa_to_sheet([headers, sample])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Parents & Students')
    XLSX.writeFile(workbook, 'Parents_Students_Import_Template.xlsx')
  }

  const openBulkImport = () => {
    setBulkRows([])
    setBulkError('')
    setBulkResult(null)
    setBulkOpen(true)
  }

  const handleBulkFile = async (file: File) => {
    try {
      setBulkError('')
      setBulkResult(null)
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' })
      const normalized = raw
        .map((row: any, index: number) => {
          const out: any = { __row: index + 2 }
          Object.entries(row).forEach(([key, value]) => {
            const k = String(key)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '')
            out[k] =
              value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').trim()
          })
          out.branch = out.branch || ''
          out.parent_name = out.parent_name || ''
          out.parent_id = out.parent_id || ''
          out.password = out.password || ''
          out.email = out.email || ''
          out.phone = out.phone || ''
          out.student_code = out.student_code || ''
          out.student_name = out.student_name || ''
          out.class = out.class || out.class_name || ''
          out.section = out.section || ''
          out.gender = out.gender || ''
          out.dob = out.dob || out.date_of_birth || ''
          return out
        })
        .filter((row: any) =>
          Object.values(row).some((v: any) => String(v).trim() && v !== row.__row),
        )
      if (!normalized.length) {
        setBulkError('The Excel file contains no data rows.')
        return
      }
      const required = ['branch', 'parent_name', 'parent_id', 'student_code', 'student_name', 'dob']
      const missing = required.filter(
        (key) => !Object.prototype.hasOwnProperty.call(normalized[0], key),
      )
      if (missing.length) {
        setBulkError('Missing required columns: ' + missing.join(', '))
        return
      }
      setBulkRows(normalized)
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Unable to read the Excel file.')
    }
  }

  const runBulkImport = async () => {
    if (!supabase || !bulkRows.length || bulkImporting) return
    setBulkImporting(true)
    setBulkError('')
    let success = 0
    let failed = 0
    const errors: string[] = []

    const grouped = new Map<string, any[]>()
    for (const row of bulkRows) {
      const branch = branches.find(
        (b) =>
          b.name.toLowerCase() === String(row.branch).trim().toLowerCase() ||
          b.id === String(row.branch).trim(),
      )
      if (!branch) {
        failed += 1
        errors.push(`Row ${row.__row}: invalid Branch "${row.branch}".`)
        continue
      }
      const key = branch.id + '|' + String(row.parent_id).trim().toUpperCase()
      grouped.set(key, [...(grouped.get(key) || []), { ...row, branch_id: branch.id }])
    }

    for (const [, rows] of grouped) {
      const first = rows[0]
      let parentId = parents.find(
        (p) =>
          p.branch_id === first.branch_id &&
          String(p.login_id).toUpperCase() === String(first.parent_id).toUpperCase(),
      )?.id

      if (!parentId) {
        const { data, error: invokeError } = await supabase.functions.invoke(
          'create-parent-login-v2',
          {
            body: {
              branch_id: first.branch_id,
              parent_name: first.parent_name,
              login_id: first.parent_id,
              password: first.password,
              parent_email: first.email || '',
              parent_phone: first.phone || '',
              student_code: first.student_code,
              student_name: first.student_name,
              dob: first.dob,
              class_name: first.class,
              section: first.section,
              gender: first.gender,
            },
          },
        )
        if (invokeError || !data?.success) {
          failed += rows.length
          errors.push(
            `Parent ${first.parent_id}: ${data?.error || invokeError?.message || 'unable to create Parent'}`,
          )
          continue
        }
        parentId = data.parent_id
        if (data.student_id) {
          await dbFrom('students')
            .update({ father_name: first.parent_name })
            .eq('id', data.student_id)
        }
        success += 1
      } else {
        success += 1
      }

      for (
        let i =
          parentId && rows.length
            ? parentId && !parents.some((p) => p.id === parentId)
              ? 1
              : 0
            : 0;
        i < rows.length;
        i += 1
      ) {
        const row = rows[i]
        const studentResult = await dbFrom('students')
          .upsert(
            {
              branch_id: row.branch_id,
              student_code: row.student_code,
              father_name: row.parent_name,
              full_name: row.student_name,
              class_name: row.class || null,
              section: row.section || null,
              gender: ['boys', 'girls', 'unisex'].includes(String(row.gender).toLowerCase())
                ? String(row.gender).toLowerCase()
                : null,
              date_of_birth: row.dob || null,
              status: 'active',
            },
            { onConflict: 'branch_id,student_code' },
          )
          .select('id')
          .single()
        if (studentResult.error || !studentResult.data?.id) {
          failed += 1
          errors.push(
            `Row ${row.__row}: ${studentResult.error?.message || 'student creation failed'}`,
          )
          continue
        }
        const linkResult = await dbFrom('parent_student_links').upsert(
          {
            parent_user_id: parentId,
            student_id: studentResult.data.id,
            relationship: 'parent',
            is_primary: false,
          },
          { onConflict: 'parent_user_id,student_id' },
        )
        if (linkResult.error) {
          failed += 1
          errors.push(`Row ${row.__row}: ${linkResult.error.message}`)
          continue
        }
        if (i > 0 || parents.some((p) => p.id === parentId)) success += 1
      }
    }

    setBulkResult({ processed: bulkRows.length, success, failed })
    if (errors.length) setBulkError(errors.slice(0, 20).join('\\n'))
    setBulkImporting(false)
    await load()
  }

  const openNewParent = () => {
    const branchId = branches[0]?.id || ''
    setError('')
    setParentEditing({
      full_name: '',
      login_id: '',
      password: '',
      confirm_password: '',
      phone: '',
      email: '',
      branch_id: branchId,
      children: [emptyChild(branchId)],
    })
  }

  const openEditStudent = async (student: any) => {
    if (!supabase) return
    setError('')
    const { data: link } = await dbFrom('parent_student_links')
      .select('parent_user_id')
      .eq('student_id', student.id)
      .maybeSingle()

    if (!link?.parent_user_id) {
      setStudentEditing({
        ...student,
        father_name: student.father_name || '',
        date_of_birth: student.date_of_birth || '',
      })
      return
    }

    const [{ data: parent }, { data: links }] = await Promise.all([
      dbFrom('profiles')
        .select('id,full_name,login_id,phone,branch_id,status')
        .eq('id', link.parent_user_id)
        .maybeSingle(),
      dbFrom('parent_student_links').select('student_id').eq('parent_user_id', link.parent_user_id),
    ])

    if (!parent) {
      setStudentEditing({
        ...student,
        father_name: student.father_name || '',
        date_of_birth: student.date_of_birth || '',
      })
      return
    }

    const childIds = (links || []).map((x: any) => x.student_id)
    const children = students
      .filter((s: any) => childIds.includes(s.id))
      .map((s: any) => ({
        ...s,
        student_id: s.id,
        branch_id: s.branch_id || parent.branch_id,
        student_code: s.student_code || '',
        full_name: s.full_name || '',
        father_name: s.father_name || parent.full_name || '',
        class_name: s.class_name || '',
        section: s.section || '',
        gender: s.gender || '',
        date_of_birth: s.date_of_birth || '',
      }))

    setParentEditing({
      editMode: true,
      id: parent.id,
      branch_id: parent.branch_id || '',
      full_name: parent.full_name || '',
      login_id: parent.login_id || '',
      phone: parent.phone || '',
      password: '',
      confirm_password: '',
      children: children.length
        ? children
        : [
            {
              ...emptyChild(parent.branch_id || ''),
              ...student,
              student_id: student.id,
              father_name: student.father_name || parent.full_name || '',
            },
          ],
    })
  }

  const updateChild = (index: number, patch: any) => {
    setParentEditing((current: any) => {
      const children = [...current.children]
      children[index] = { ...children[index], ...patch }
      return { ...current, children }
    })
  }

  const addChild = () => {
    setParentEditing((current: any) => ({
      ...current,
      children: [...current.children, emptyChild(current.branch_id)],
    }))
  }

  const removeChild = (index: number) => {
    setParentEditing((current: any) => {
      if (current.children.length <= 1) return current
      return { ...current, children: current.children.filter((_: any, i: number) => i !== index) }
    })
  }

  const saveParent = async () => {
    if (!supabase || !parentEditing || savingParent) return
    setError('')

    if (parentEditing.editMode) {
      if (
        !parentEditing.branch_id ||
        !parentEditing.full_name?.trim() ||
        !parentEditing.login_id?.trim()
      ) {
        setError('Branch, Parent Name and Parent ID are required.')
        return
      }
      if (parentEditing.password && parentEditing.password !== parentEditing.confirm_password) {
        setError('Password and Confirm Password do not match.')
        return
      }
      const validChildren =
        parentEditing.children?.filter(
          (child: any) =>
            child.student_id ||
            child.student_code?.trim() ||
            child.full_name?.trim() ||
            child.date_of_birth,
        ) || []
      if (!validChildren.length) {
        setError('Add at least one child to this Parent.')
        return
      }
      for (let i = 0; i < validChildren.length; i += 1) {
        const child = validChildren[i]
        if (!child.student_code?.trim() || !child.full_name?.trim() || !child.date_of_birth) {
          setError(`Child ${i + 1}: Student Code, Student Name and Date of Birth are required.`)
          return
        }
      }

      setSavingParent(true)
      const { error: profileError } = await dbFrom('profiles')
        .update({
          full_name: parentEditing.full_name.trim(),
          login_id: parentEditing.login_id.trim().toUpperCase(),
          branch_id: parentEditing.branch_id,
          phone: parentEditing.phone?.trim() || null,
        })
        .eq('id', parentEditing.id)

      if (profileError) {
        setError(profileError.message)
        setSavingParent(false)
        return
      }

      if (parentEditing.password) {
        const { data: resetData, error: resetError } = await supabase.functions.invoke(
          'admin-reset-parent-password',
          { body: { parent_user_id: parentEditing.id, password: parentEditing.password } },
        )
        if (resetError || !resetData?.success) {
          setError(resetData?.error || resetError?.message || 'Unable to update parent password.')
          setSavingParent(false)
          return
        }
      }

      const keepIds: string[] = []
      for (const child of validChildren) {
        const { data: savedStudent, error: studentError } = await dbFrom('students')
          .upsert(
            {
              id: child.student_id || undefined,
              branch_id: parentEditing.branch_id,
              student_code: child.student_code.trim(),
              full_name: child.full_name.trim(),
              father_name: parentEditing.full_name.trim(),
              class_name: child.class_name?.trim() || null,
              section: child.section?.trim() || null,
              gender: child.gender || null,
              date_of_birth: child.date_of_birth,
              status: child.status || 'active',
            },
            { onConflict: 'branch_id,student_code' },
          )
          .select('id')
          .single()
        if (studentError || !savedStudent?.id) {
          setError(studentError?.message || 'Unable to save student.')
          setSavingParent(false)
          return
        }
        keepIds.push(savedStudent.id)
        const { error: linkError } = await dbFrom('parent_student_links').upsert(
          {
            parent_user_id: parentEditing.id,
            student_id: savedStudent.id,
            relationship: 'parent',
            is_primary: keepIds.length === 1,
          },
          { onConflict: 'parent_user_id,student_id' },
        )
        if (linkError) {
          setError(linkError.message)
          setSavingParent(false)
          return
        }
      }

      const existingLinks = await dbFrom('parent_student_links')
        .select('student_id')
        .eq('parent_user_id', parentEditing.id)
      const removeIds = (existingLinks.data || [])
        .map((x: any) => x.student_id)
        .filter((id: string) => !keepIds.includes(id))
      if (removeIds.length) {
        await dbFrom('parent_student_links')
          .delete()
          .eq('parent_user_id', parentEditing.id)
          .in('student_id', removeIds)
      }

      setParentEditing(null)
      setSavingParent(false)
      await load()
      return
    }
    if (
      !parentEditing.branch_id ||
      !parentEditing.full_name?.trim() ||
      !parentEditing.login_id?.trim() ||
      !parentEditing.password
    ) {
      setError('Branch, Parent Name, Parent ID and Password are required.')
      return
    }
    if (parentEditing.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (parentEditing.password !== parentEditing.confirm_password) {
      setError('Password and Confirm Password do not match.')
      return
    }
    if (!parentEditing.children?.length) {
      setError('Add at least one child to this Parent.')
      return
    }

    const validChildren = parentEditing.children.filter(
      (child: any) =>
        child.student_id ||
        child.student_code?.trim() ||
        child.full_name?.trim() ||
        child.date_of_birth,
    )
    if (!validChildren.length) {
      setError('Add at least one child to this Parent.')
      return
    }
    for (let i = 0; i < validChildren.length; i += 1) {
      const child = validChildren[i]
      if (
        !child.student_id &&
        (!child.student_code?.trim() || !child.full_name?.trim() || !child.date_of_birth)
      ) {
        setError(`Child ${i + 1}: Student Code, Full Name and Date of Birth are required.`)
        return
      }
    }

    setSavingParent(true)
    const { data, error: invokeError } = await supabase.functions.invoke('create-parent-login-v2', {
      body: {
        branch_id: parentEditing.branch_id,
        parent_name: parentEditing.full_name.trim(),
        login_id: parentEditing.login_id.trim(),
        password: parentEditing.password,
        parent_email: parentEditing.email?.trim() || '',
        parent_phone: parentEditing.phone?.trim() || '',
        children: validChildren.map((child: any) => ({
          student_code: child.student_code.trim(),
          full_name: child.full_name.trim(),
          class_name: child.class_name?.trim() || '',
          section: child.section?.trim() || '',
          gender: child.gender || '',
          date_of_birth: child.date_of_birth,
        })),
      },
    })

    if (invokeError || !data?.success) {
      setError(data?.error || invokeError?.message || 'Unable to create Parent Login.')
      setSavingParent(false)
      return
    }

    if (data.student_id) {
      await dbFrom('students')
        .update({ father_name: parentEditing.full_name.trim() })
        .eq('id', data.student_id)
    }
    if (Array.isArray(data.students)) {
      for (const student of data.students) {
        await dbFrom('students')
          .update({ father_name: parentEditing.full_name.trim() })
          .eq('id', student.id)
      }
    }

    setParentEditing(null)
    setSavingParent(false)
    await load()
  }

  const saveStudent = async () => {
    if (!supabase || !studentEditing) return
    if (!studentEditing.student_code?.trim() || !studentEditing.full_name?.trim()) {
      setError('Student Code and Full Name are required.')
      return
    }
    if (!studentEditing.branch_id) {
      setError('Branch is required.')
      return
    }
    const payload = {
      branch_id: studentEditing.branch_id,
      student_code: studentEditing.student_code.trim(),
      full_name: studentEditing.full_name.trim(),
      father_name: studentEditing.father_name?.trim() || null,
      class_name: studentEditing.class_name || null,
      section: studentEditing.section || null,
      gender: studentEditing.gender || null,
      date_of_birth: studentEditing.date_of_birth || null,
      status: studentEditing.status || 'active',
    }
    const result = await dbFrom('students')
      .update(payload)
      .eq('id', studentEditing.id)
      .select('id')
      .maybeSingle()
    if (result.error) {
      setError(result.error.message)
      return
    }
    setStudentEditing(null)
    await load()
  }

  const exportParentsStudents = () => {
    const headers = ['Branch', 'Parent ID', 'Parent Name', 'Phone', 'Student Code', 'Student Name', 'Class', 'Section', 'Gender', 'DOB', 'Status']
    const values: any[][] = []
    parents.forEach((p) => {
      const childIds = parentChildren[p.id] || []
      const children = students.filter((s) => childIds.includes(s.id))
      if (!children.length) values.push([branches.find((b) => b.id === p.branch_id)?.name || '', p.login_id || '', p.full_name || '', p.phone || '', '', '', '', '', '', '', p.status || ''])
      children.forEach((s) => values.push([branches.find((b) => b.id === p.branch_id)?.name || '', p.login_id || '', p.full_name || '', p.phone || '', s.student_code || '', s.full_name || '', s.class_name || '', s.section || '', s.gender || '', s.date_of_birth || '', s.status || '']))
    })
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...values])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Parents & Students')
    XLSX.writeFile(workbook, `Parents_Students_Export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const filteredParents = parents.filter((p) =>
    [p.full_name, p.login_id, p.phone, branches.find((b) => b.id === p.branch_id)?.name].some((v) =>
      String(v ?? '')
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  )
  const filteredStudents = students.filter((s) =>
    [
      s.student_code,
      s.full_name,
      s.father_name,
      s.class_name,
      s.section,
      s.gender,
      s.date_of_birth,
      s.status,
    ].some((v) =>
      String(v ?? '')
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
            placeholder="Search parents & students"
          />
        </div>
        <BulkTools
          title="Excel Bulk Import / Export — Parents & Students"
          description="Download the parent/student template, export current records, or upload records in bulk."
          demoLabel="Download Parents & Students Template"
          exportLabel="Download Parents & Students"
          importing={bulkImporting}
          canExport={parents.length > 0 || students.length > 0}
          onDemo={downloadBulkTemplate}
          onExport={exportParentsStudents}
          onImport={(file) => { openBulkImport(); void handleBulkFile(file) }}
        />
        <button className="primary-button" onClick={openNewParent}>
          <Plus size={15} /> Add Parent
        </button>
      </Toolbar>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <Panel>
            <div className="panel-heading">
              <div>
                <h2>Parents</h2>
                <span className="workspace-muted">
                  Create the Parent and all of their children together. The Parent ID and password
                  are used for portal login.
                </span>
              </div>
            </div>
            <div className="workspace-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Parent ID</th>
                    <th>Parent Name</th>
                    <th>Branch</th>
                    <th>Children</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParents.length ? (
                    filteredParents.map((p, i) => {
                      const childNames = (parentChildren[p.id] || [])
                        .map((id) => students.find((s) => s.id === id)?.full_name)
                        .filter(Boolean)
                      return (
                        <tr key={p.id || i}>
                          <td>{p.login_id || '—'}</td>
                          <td>{p.full_name || '—'}</td>
                          <td>{branches.find((b) => b.id === p.branch_id)?.name || '—'}</td>
                          <td>{childNames.length ? childNames.join(', ') : '—'}</td>
                          <td>{p.phone || '—'}</td>
                          <td>{p.status || '—'}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6}>No Parent accounts created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <div className="panel-heading">
              <div>
                <h2>Students</h2>
                <span className="workspace-muted">
                  Students are created inside a Parent record and linked automatically.
                </span>
              </div>
            </div>
            <div className="workspace-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student Code</th>
                    <th>Father's Name</th>
                    <th>Full Name</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Gender</th>
                    <th>Date of Birth</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length ? (
                    filteredStudents.map((r, i) => (
                      <tr key={r.id || i}>
                        <td>{r.student_code || '—'}</td>
                        <td>{r.father_name || '—'}</td>
                        <td>{r.full_name || '—'}</td>
                        <td>{r.class_name || '—'}</td>
                        <td>{r.section || '—'}</td>
                        <td>{r.gender || '—'}</td>
                        <td>{r.date_of_birth || '—'}</td>
                        <td>{r.status || '—'}</td>
                        <td>
                          <button
                            className="table-action-button"
                            onClick={() => openEditStudent(r)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9}>No student records created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {parentEditing && (
        <EditModal
          title={parentEditing.editMode ? 'Edit Parent & Children' : 'Add Parent'}
          onClose={() => setParentEditing(null)}
          onSave={saveParent}
        >
          <div className="workspace-form-row">
            <Select
              label="Branch"
              value={parentEditing.branch_id || ''}
              options={branches.map((b) => b.id)}
              labels={Object.fromEntries(branches.map((b) => [b.id, b.name]))}
              onChange={(v) => {
                setParentEditing((current: any) => ({
                  ...current,
                  branch_id: v,
                  children: current.children.map((child: any) => ({ ...child, branch_id: v })),
                }))
              }}
            />
            <Field
              label="Parent ID"
              value={parentEditing.login_id || ''}
              onChange={(v) => setParentEditing({ ...parentEditing, login_id: v.toUpperCase() })}
              placeholder="Login ID"
            />
          </div>

          <div className="workspace-form-row-pricing">
            <Field
              label="Parent Name"
              value={parentEditing.full_name || ''}
              onChange={(v) => setParentEditing({ ...parentEditing, full_name: v })}
              placeholder="Parent full name"
            />
            <Field
              label="Password"
              type="password"
              value={parentEditing.password || ''}
              onChange={(v) => setParentEditing({ ...parentEditing, password: v })}
              placeholder={
                parentEditing.editMode
                  ? 'Leave blank to keep current password'
                  : 'Set parent password'
              }
            />
            <Field
              label="Confirm Password"
              type="password"
              value={parentEditing.confirm_password || ''}
              onChange={(v) => setParentEditing({ ...parentEditing, confirm_password: v })}
              placeholder={
                parentEditing.editMode ? 'Confirm new password' : 'Confirm parent password'
              }
            />
          </div>

          <div className="workspace-form-row">
            <Field
              label="Email (Optional)"
              type="email"
              value={parentEditing.email || ''}
              onChange={(v) => setParentEditing({ ...parentEditing, email: v })}
              placeholder="Parent email"
            />
            <Field
              label="Phone (Optional)"
              value={parentEditing.phone || ''}
              onChange={(v) => setParentEditing({ ...parentEditing, phone: v })}
              placeholder="Phone number"
            />
          </div>

          {parentEditing.children.map((child: any, index: number) => (
            <div key={index} className="workspace-note" style={{ marginTop: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <strong>Child {index + 1}</strong>
                {parentEditing.children.length > 1 && (
                  <button type="button" className="text-button" onClick={() => removeChild(index)}>
                    Remove
                  </button>
                )}
              </div>

              <div className="workspace-form-row">
                <Field
                  label="Student Code"
                  value={child.student_code || ''}
                  onChange={(v) => updateChild(index, { student_code: v })}
                  placeholder="Student code"
                />
                <Field
                  label="Student Name"
                  value={child.full_name || ''}
                  onChange={(v) => updateChild(index, { full_name: v })}
                  placeholder="Student full name"
                />
              </div>

              <div className="workspace-form-row-4">
                <Field
                  label="Class"
                  value={child.class_name || ''}
                  onChange={(v) => updateChild(index, { class_name: v })}
                  placeholder="Class"
                />
                <Field
                  label="Section"
                  value={child.section || ''}
                  onChange={(v) => updateChild(index, { section: v })}
                  placeholder="Section"
                />
                <Select
                  label="Gender"
                  value={child.gender || ''}
                  options={['boys', 'girls', 'unisex']}
                  labels={{ boys: 'Boys', girls: 'Girls', unisex: 'Unisex' }}
                  onChange={(v) => updateChild(index, { gender: v })}
                />
                <Field
                  label="Date of Birth"
                  type="date"
                  value={child.date_of_birth || ''}
                  onChange={(v) => updateChild(index, { date_of_birth: v })}
                />
              </div>
            </div>
          ))}

          <button type="button" className="secondary-button" onClick={addChild}>
            <Plus size={15} /> Add Another Child
          </button>
          <div className="workspace-note">
            The password is stored securely in Supabase Auth. No Student ID or Student Password is
            used for parent login.
          </div>
        </EditModal>
      )}

      {bulkOpen && (
        <EditModal
          title="Bulk Import Parents & Students"
          onClose={() => !bulkImporting && setBulkOpen(false)}
          onSave={runBulkImport}
        >
          <div className="workspace-note">
            <strong>1. Download the Excel template</strong>
            <br />
            One row represents one child. Repeat the same Parent ID for multiple children. A Parent
            account is created only once.
            <div style={{ marginTop: 10 }}>
              <button type="button" className="secondary-button" onClick={downloadBulkTemplate}>
                <Download size={15} /> Download Template
              </button>
            </div>
          </div>
          <div className="workspace-note">
            <strong>2. Upload your completed Excel file</strong>
            <br />
            Required columns: Branch, Parent Name, Parent ID, Password, Student Code, Student Name,
            DOB.
            <div style={{ marginTop: 10 }}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleBulkFile(file)
                }}
              />
            </div>
          </div>
          {bulkRows.length > 0 && (
            <div className="workspace-note">
              <strong>Preview</strong>
              <br />
              {bulkRows.length} rows loaded ·{' '}
              {new Set(bulkRows.map((r) => String(r.parent_id).toUpperCase())).size} Parent IDs
              <div style={{ maxHeight: 220, overflow: 'auto', marginTop: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Parent ID</th>
                      <th>Student Code</th>
                      <th>Student Name</th>
                      <th>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.slice(0, 20).map((r) => (
                      <tr key={r.__row}>
                        <td>{r.branch}</td>
                        <td>{r.parent_id}</td>
                        <td>{r.student_code}</td>
                        <td>{r.student_name}</td>
                        <td>{r.class}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bulkRows.length > 20 ? (
                <div style={{ marginTop: 8 }}>Showing first 20 rows.</div>
              ) : null}
            </div>
          )}
          {bulkResult && (
            <div className="workspace-note">
              <strong>Import Complete</strong>
              <br />
              Processed: {bulkResult.processed} · Successful: {bulkResult.success} · Failed:{' '}
              {bulkResult.failed}
            </div>
          )}
          {bulkError ? (
            <div className="workspace-note" style={{ whiteSpace: 'pre-wrap' }}>
              {bulkError}
            </div>
          ) : null}
          <div className="workspace-note">
            {bulkImporting ? 'Importing… Please keep this window open.' : 'Save starts the import.'}
          </div>
        </EditModal>
      )}

      {studentEditing && (
        <EditModal
          title="Edit Student"
          onClose={() => setStudentEditing(null)}
          onSave={saveStudent}
        >
          <Field
            label="Student Code"
            value={studentEditing.student_code || ''}
            onChange={(v) => setStudentEditing({ ...studentEditing, student_code: v })}
          />
          <Field
            label="Full Name"
            value={studentEditing.full_name || ''}
            onChange={(v) => setStudentEditing({ ...studentEditing, full_name: v })}
          />
          <Field
            label="Father's Name"
            value={studentEditing.father_name || ''}
            onChange={(v) => setStudentEditing({ ...studentEditing, father_name: v })}
          />
          <Select
            label="Branch"
            value={studentEditing.branch_id || ''}
            options={branches.map((b) => b.id)}
            labels={Object.fromEntries(branches.map((b) => [b.id, b.name]))}
            onChange={(v) => setStudentEditing({ ...studentEditing, branch_id: v })}
          />
          <Field
            label="Class"
            value={studentEditing.class_name || ''}
            onChange={(v) => setStudentEditing({ ...studentEditing, class_name: v })}
          />
          <Field
            label="Section"
            value={studentEditing.section || ''}
            onChange={(v) => setStudentEditing({ ...studentEditing, section: v })}
          />
          <Select
            label="Gender"
            value={studentEditing.gender || ''}
            options={['boys', 'girls', 'unisex']}
            labels={{ boys: 'Boys', girls: 'Girls', unisex: 'Unisex' }}
            onChange={(v) => setStudentEditing({ ...studentEditing, gender: v })}
          />
          <Field
            label="Date of Birth"
            type="date"
            value={studentEditing.date_of_birth || ''}
            onChange={(v) => setStudentEditing({ ...studentEditing, date_of_birth: v })}
          />
          <Select
            label="Status"
            value={studentEditing.status || 'active'}
            options={['active', 'inactive']}
            onChange={(v) => setStudentEditing({ ...studentEditing, status: v })}
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
  const today = new Date()
  const [reportMonth, setReportMonth] = useState(String(today.getMonth() + 1))
  const [reportYear, setReportYear] = useState(String(today.getFullYear()))
  const [statusFilter, setStatusFilter] = useState('all')

  const monthOptions = [
    { value: 'all', label: 'All Months' },
    ...Array.from({ length: 12 }, (_, index) => ({
      value: String(index + 1),
      label: new Date(2000, index, 1).toLocaleString('en-US', { month: 'long' }),
    })),
  ]
  const yearOptions = Array.from({ length: 5 }, (_, index) => String(today.getFullYear() - index))
  const getReportRange = () => {
    const year = Number(reportYear)
    if (reportMonth === 'all') return { from: `${year}-01-01`, to: `${year}-12-31` }
    const month = Number(reportMonth) - 1
    const pad = (value: number) => String(value).padStart(2, '0')
    const lastDay = new Date(year, month + 1, 0).getDate()
    return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${pad(lastDay)}` }
  }
  const reportRange = getReportRange()
  const from = reportRange.from
  const to = reportRange.to
  const [data, setData] = useState<any>({
    orders: [],
    items: [],
    products: [],
    inventory: [],
    payments: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    setError('')
    const start = new Date(`${from}T00:00:00`).toISOString()
    const endDate = new Date(`${to}T23:59:59`)
    const end = endDate.toISOString()
    const [o, oi, p, inv, pay] = await Promise.all([
      dbFrom('orders')
        .select(
          'id,order_number,status,subtotal,discount_total,shipping_total,grand_total,currency,created_at,student_id,branch_id',
        )
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false }),
      dbFrom('order_items').select(
        'order_id,product_id,package_id,item_name_snapshot,quantity,unit_price',
      ),
      dbFrom('products').select('id,name,status,base_price,offer_price'),
      dbFrom('branch_inventory').select(
        'branch_id,product_id,variant_id,quantity_on_hand,reorder_level,updated_at',
      ),
      dbFrom('payments').select('order_id,provider,amount,status,paid_at,created_at'),
    ])
    const err = o.error || oi.error || p.error || inv.error || pay.error
    if (err) setError(err.message)
    setData({
      orders: o.data ?? [],
      items: oi.data ?? [],
      products: p.data ?? [],
      inventory: inv.data ?? [],
      payments: pay.data ?? [],
    })
    setLoading(false)
  }

  useEffect(() => {
    void load()
    const handler = () => void load()
    window.addEventListener('reports:refresh', handler)
    return () => window.removeEventListener('reports:refresh', handler)
  }, [from, to])

  const orders = data.orders.filter((x: any) => statusFilter === 'all' || x.status === statusFilter)
  const items = data.items.filter((x: any) => orders.some((o: any) => o.id === x.order_id))
  const revenue = orders.reduce((n: number, x: any) => n + Number(x.grand_total || 0), 0)
  const subtotal = orders.reduce((n: number, x: any) => n + Number(x.subtotal || 0), 0)
  const discounts = orders.reduce((n: number, x: any) => n + Number(x.discount_total || 0), 0)
  const shipping = orders.reduce((n: number, x: any) => n + Number(x.shipping_total || 0), 0)
  const averageOrder = orders.length ? revenue / orders.length : 0
  const lowStock = data.inventory.filter(
    (x: any) => Number(x.quantity_on_hand) <= Number(x.reorder_level),
  )
  const outOfStock = data.inventory.filter((x: any) => Number(x.quantity_on_hand) <= 0)
  const statusCounts: Record<string, number> = data.orders.reduce(
    (m: Record<string, number>, x: any) => {
      m[x.status] = (m[x.status] || 0) + 1
      return m
    },
    {},
  )
  const productMap = new Map<string, string>(
    data.products.map((x: any) => [x.id, x.name] as [string, string]),
  )
  const topProducts = Object.values(
    items.reduce((m: Record<string, any>, x: any) => {
      const key = x.product_id || x.package_id || x.item_name_snapshot
      const name = x.item_name_snapshot || productMap.get(x.product_id) || 'Item'
      if (!m[key]) m[key] = { name, quantity: 0, revenue: 0 }
      m[key].quantity += Number(x.quantity || 0)
      m[key].revenue += Number(x.quantity || 0) * Number(x.unit_price || 0)
      return m
    }, {}),
  )
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 8)
  const daily = Object.values(
    orders.reduce((m: Record<string, any>, x: any) => {
      const day = new Date(x.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })
      if (!m[day]) m[day] = { day, orders: 0, revenue: 0 }
      m[day].orders += 1
      m[day].revenue += Number(x.grand_total || 0)
      return m
    }, {}),
  ).reverse() as any[]
  const paymentSummary = Object.values(
    data.payments
      .filter((p: any) => orders.some((o: any) => o.id === p.order_id))
      .reduce((m: Record<string, any>, p: any) => {
        const key = p.provider || 'Unknown'
        if (!m[key]) m[key] = { provider: key, count: 0, amount: 0 }
        m[key].count += 1
        m[key].amount += Number(p.amount || 0)
        return m
      }, {}),
  ) as any[]

  const money = (n: number) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  const exportCsv = () => {
    const header = [
      'Order Number',
      'Date',
      'Status',
      'Subtotal',
      'Discount',
      'Shipping',
      'Grand Total',
    ]
    const lines = orders.map((x: any) =>
      [
        x.order_number,
        new Date(x.created_at).toLocaleDateString('en-IN'),
        x.status,
        x.subtotal,
        x.discount_total,
        x.shipping_total,
        x.grand_total,
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `school-uniforms-report-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="reports-toolbar">
        <div className="reports-heading">
          <h1>Reports</h1>
          <p>View high-level sales, orders and inventory summaries.</p>
        </div>
        <div className="reports-date-controls">
          <label>
            Month
            <select value={reportMonth} onChange={(e) => setReportMonth(e.target.value)}>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select value={reportYear} onChange={(e) => setReportYear(e.target.value)}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {Object.keys(statusCounts)
                .sort()
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="reports-actions">
          <button className="secondary-button" onClick={() => void load()}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="primary-button" onClick={exportCsv}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="report-grid reports-kpis">
            <div>
              <span>Total Orders</span>
              <strong>{orders.length}</strong>
              <small>{statusFilter === 'all' ? 'All statuses' : statusFilter}</small>
            </div>
            <div>
              <span>Total Revenue</span>
              <strong>{money(revenue)}</strong>
              <small>Gross order value</small>
            </div>
            <div>
              <span>Average Order</span>
              <strong>{money(averageOrder)}</strong>
              <small>Revenue ÷ orders</small>
            </div>
            <div>
              <span>Units Sold</span>
              <strong>{items.reduce((n: number, x: any) => n + Number(x.quantity || 0), 0)}</strong>
              <small>Order item quantities</small>
            </div>
            <div>
              <span>Discounts</span>
              <strong>{money(discounts)}</strong>
              <small>Applied discounts</small>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{money(shipping)}</strong>
              <small>Shipping collected</small>
            </div>
            <div>
              <span>Products</span>
              <strong>{data.products.length}</strong>
              <small>Catalog products</small>
            </div>
            <div>
              <span>Low Stock</span>
              <strong>{lowStock.length}</strong>
              <small>{outOfStock.length} out of stock</small>
            </div>
          </div>

          <div className="reports-two-col">
            <Panel>
              <div className="report-panel-heading">
                <div>
                  <h2>Sales Trend</h2>
                  <p>Daily orders and revenue for the selected period.</p>
                </div>
              </div>
              {daily.length ? (
                <div className="report-bars">
                  {daily.map((d: any) => {
                    const max = Math.max(...daily.map((x) => x.revenue), 1)
                    return (
                      <div className="report-bar-row" key={d.day}>
                        <span>{d.day}</span>
                        <div>
                          <i style={{ width: `${(d.revenue / max) * 100}%` }} />
                          <small>
                            {money(d.revenue)} · {d.orders} orders
                          </small>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="workspace-empty">No sales in this period.</div>
              )}
            </Panel>
            <Panel>
              <div className="report-panel-heading">
                <div>
                  <h2>Order Status</h2>
                  <p>Current status distribution.</p>
                </div>
              </div>
              <div className="report-status-list">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status}>
                    <span>{status}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="reports-two-col">
            <Panel>
              <div className="report-panel-heading">
                <div>
                  <h2>Top Selling Items</h2>
                  <p>Ranked by item revenue in the selected period.</p>
                </div>
              </div>
              <div className="report-table">
                <div className="report-table-head">
                  <span>Item</span>
                  <span>Units</span>
                  <span>Revenue</span>
                </div>
                {topProducts.length ? (
                  topProducts.map((x: any) => (
                    <div className="report-table-row" key={x.name}>
                      <strong>{x.name}</strong>
                      <span>{x.quantity}</span>
                      <span>{money(x.revenue)}</span>
                    </div>
                  ))
                ) : (
                  <div className="workspace-empty">No item sales.</div>
                )}
              </div>
            </Panel>
            <Panel>
              <div className="report-panel-heading">
                <div>
                  <h2>Payments</h2>
                  <p>Payment activity for the selected orders.</p>
                </div>
              </div>
              <div className="report-table">
                <div className="report-table-head">
                  <span>Provider</span>
                  <span>Transactions</span>
                  <span>Amount</span>
                </div>
                {paymentSummary.length ? (
                  paymentSummary.map((x: any) => (
                    <div className="report-table-row" key={x.provider}>
                      <strong>{x.provider}</strong>
                      <span>{x.count}</span>
                      <span>{money(x.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="workspace-empty">No payment records.</div>
                )}
              </div>
            </Panel>
          </div>

          <Panel>
            <div className="report-panel-heading">
              <div>
                <h2>Inventory Alerts</h2>
                <p>Items at or below their configured reorder level.</p>
              </div>
            </div>
            <div className="report-table report-inventory-table">
              <div className="report-table-head">
                <span>Product</span>
                <span>On Hand</span>
                <span>Reorder Level</span>
                <span>Branch</span>
              </div>
              {lowStock.length ? (
                lowStock.slice(0, 20).map((x: any) => (
                  <div
                    className="report-table-row"
                    key={`${x.branch_id}-${x.product_id}-${x.variant_id}`}
                  >
                    <strong>{productMap.get(x.product_id) || 'Unknown product'}</strong>
                    <span>{x.quantity_on_hand}</span>
                    <span>{x.reorder_level}</span>
                    <span>{x.branch_id?.slice(0, 8) || '—'}</span>
                  </div>
                ))
              ) : (
                <div className="workspace-empty">No low-stock inventory.</div>
              )}
            </div>
          </Panel>

          <Panel>
            <div className="report-panel-heading">
              <div>
                <h2>Financial Summary</h2>
                <p>Breakdown for the selected reporting period.</p>
              </div>
            </div>
            <div className="report-financial-grid">
              <div>
                <span>Gross Sales</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <div>
                <span>Discounts</span>
                <strong>− {money(discounts)}</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>+ {money(shipping)}</strong>
              </div>
              <div>
                <span>Net Order Value</span>
                <strong>{money(revenue)}</strong>
              </div>
            </div>
          </Panel>
        </>
      )}
    </>
  )
}

function Coupons() {
  const [rows, setRows] = useState<any[]>([]),
    [usage, setUsage] = useState<Record<string, number>>({}),
    [editing, setEditing] = useState<any>(null),
    [error, setError] = useState('')
  const load = async () => {
    if (!supabase) return
    const r = await dbFrom('coupons').select('*').order('created_at', { ascending: false })
    setRows(r.data ?? [])
    setError(r.error?.message || '')
    const couponIds = (r.data ?? []).map((x: any) => x.id)
    if (couponIds.length) {
      const u = await dbFrom('order_coupons').select('coupon_id').in('coupon_id', couponIds)
      const counts: Record<string, number> = {}
      ;(u.data ?? []).forEach((x: any) => {
        counts[x.coupon_id] = (counts[x.coupon_id] || 0) + 1
      })
      setUsage(counts)
    } else setUsage({})
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
            <span>Allowed</span>
            <span>Used</span>
            <span>Remaining</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {rows.map((x) => (
            <div className="workspace-row coupon-row" key={x.id}>
              <strong>{x.code}</strong>
              <span>{x.discount_type}</span>
              <span>{x.discount_value}</span>
              <span>{x.usage_limit == null ? 'Unlimited' : Number(x.usage_limit)}</span>
              <span>{usage[x.id] || 0}</span>
              <span>
                {x.usage_limit == null
                  ? 'Unlimited'
                  : Math.max(Number(x.usage_limit) - (usage[x.id] || 0), 0)}
              </span>
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
            label="Allowed Uses"
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
  onDelete,
  children,
}: {
  title: string
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
  children: ReactNode
}) {
  return (
    <div className="workspace-modal">
      <div className="workspace-modal-card">
        <div className="workspace-modal-header">
          <h2>{title}</h2>
          <div className="workspace-modal-actions">
            {onDelete ? (
              <button
                type="button"
                className="variant-delete-button variant-delete-header-button"
                onClick={onDelete}
              >
                Delete Variant
              </button>
            ) : null}
            <button className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" onClick={onSave}>
              <Save size={15} /> Save
            </button>
          </div>
        </div>
        <button className="workspace-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="workspace-form">{children}</div>
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
  min,
  clearZeroOnFocus = false,
  placeholder,
  readOnly = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  area?: boolean
  min?: string
  clearZeroOnFocus?: boolean
  placeholder?: string
  readOnly?: boolean
}) {
  const handleFocus = () => {
    if (clearZeroOnFocus && type === 'number' && String(value) === '0') onChange('')
  }

  return (
    <label className="workspace-field">
      <span>{label}</span>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          type={type}
          min={min}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          onFocus={handleFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}
function formatGender(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (normalized === 'boys') return 'Boys'
  if (normalized === 'girls') return 'Girls'
  if (normalized === 'unisex') return 'Unisex'
  return String(value || '—')
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

function BranchPaymentSettings() {
  const [settings, setSettings] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const [b, s] = await Promise.all([
      dbFrom('branches').select('id,name').order('name'),
      dbFrom('branch_payment_settings').select('*'),
    ])
    setBranches(b.data ?? [])
    setSettings(s.data ?? [])
    setError(b.error?.message || s.error?.message || '')
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const value = (branchId: string) =>
    settings.find((x) => x.branch_id === branchId) || {
      branch_id: branchId,
      pay_at_school_enabled: true,
      upi_enabled: false,
      razorpay_enabled: false,
      upi_id: '',
      upi_payee_name: '',
      shipping_fee: 0,
      free_shipping_above: 0,
    }

  const save = async (row: any) => {
    if (!supabase) return
    setSaving(row.branch_id)
    const r = await dbFrom('branch_payment_settings').upsert(
      {
        branch_id: row.branch_id,
        pay_at_school_enabled: !!row.pay_at_school_enabled,
        upi_enabled: !!row.upi_enabled,
        razorpay_enabled: !!row.razorpay_enabled,
        upi_id: row.upi_id?.trim() || null,
        upi_payee_name: row.upi_payee_name?.trim() || null,
        shipping_fee: Number(row.shipping_fee || 0),
        free_shipping_above: Number(row.free_shipping_above || 0),
      },
      { onConflict: 'branch_id' },
    )
    if (r.error) setError(r.error.message)
    else await load()
    setSaving(null)
  }

  const update = (branchId: string, row: any, patch: any) =>
    setSettings((v) => [...v.filter((x) => x.branch_id !== branchId), { ...row, ...patch }])

  return (
    <Panel>
      <div className="panel-heading">
        <div>
          <h2>Branch Payment Settings</h2>
          <span className="workspace-muted">
            Configure payment methods and delivery charges for each branch.
          </span>
        </div>
      </div>
      <ErrorBox text={error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="workspace-table">
          <div className="workspace-row payment-settings-row admin-table-header">
            <strong>Branch</strong>
            <span>Pay at School</span>
            <span>UPI</span>
            <span>Razorpay</span>
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
                    onChange={(e) => update(b.id, row, { pay_at_school_enabled: e.target.checked })}
                  />{' '}
                  Pay at School
                </label>
                <label className="admin-inline-check">
                  <input
                    type="checkbox"
                    checked={!!row.upi_enabled}
                    onChange={(e) => update(b.id, row, { upi_enabled: e.target.checked })}
                  />{' '}
                  UPI
                </label>
                <label className="admin-inline-check">
                  <input
                    type="checkbox"
                    checked={!!row.razorpay_enabled}
                    onChange={(e) => update(b.id, row, { razorpay_enabled: e.target.checked })}
                  />{' '}
                  Razorpay
                </label>
                <input
                  className="admin-mini-input"
                  value={row.upi_id || ''}
                  placeholder="UPI ID"
                  onChange={(e) => update(b.id, row, { upi_id: e.target.value })}
                />
                <input
                  className="admin-mini-input"
                  value={row.upi_payee_name || ''}
                  placeholder="Payee name"
                  onChange={(e) => update(b.id, row, { upi_payee_name: e.target.value })}
                />
                <input
                  className="admin-mini-input"
                  type="number"
                  min="0"
                  value={row.shipping_fee ?? 0}
                  placeholder="Shipping"
                  onChange={(e) => update(b.id, row, { shipping_fee: e.target.value })}
                />
                <input
                  className="admin-mini-input"
                  type="number"
                  min="0"
                  value={row.free_shipping_above ?? 0}
                  placeholder="Free above"
                  onChange={(e) => update(b.id, row, { free_shipping_above: e.target.value })}
                />
                <button
                  className="primary-button"
                  disabled={saving === b.id}
                  onClick={() => void save(row)}
                >
                  {saving === b.id ? 'Saving...' : 'Save'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

function Settings() {
  const [mode, setMode] = useState<'test' | 'live'>('test')
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [keyConfigured, setKeyConfigured] = useState(false)
  const [webhookConfigured, setWebhookConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const webhookUrl = 'https://uovhndbzkdbfyjahakqf.supabase.co/functions/v1/razorpay-webhook'

  const load = async (showLoader = true) => {
    if (!supabase) return
    if (showLoader) setLoading(true)
    setError('')
    const { data, error: e } = await supabase.functions.invoke('razorpay-admin-settings', {
      method: 'GET',
    })
    if (e) setError(e.message)
    else {
      setMode(data?.mode === 'live' ? 'live' : 'test')
      setKeyId(data?.key_id || '')
      setKeyConfigured(!!data?.key_secret_configured)
      setWebhookConfigured(!!data?.webhook_secret_configured)
      try {
        localStorage.setItem(
          'school_uniforms_razorpay_settings_ui',
          JSON.stringify({
            mode: data?.mode === 'live' ? 'live' : 'test',
            keyId: data?.key_id || '',
            keyConfigured: !!data?.key_secret_configured,
            webhookConfigured: !!data?.webhook_secret_configured,
          }),
        )
      } catch {
        // Ignore unavailable local storage.
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    let hasCache = false
    try {
      const raw = localStorage.getItem('school_uniforms_razorpay_settings_ui')
      if (raw) {
        const cached = JSON.parse(raw)
        if (cached && typeof cached === 'object') {
          setMode(cached.mode === 'live' ? 'live' : 'test')
          setKeyId(cached.keyId || '')
          setKeyConfigured(!!cached.keyConfigured)
          setWebhookConfigured(!!cached.webhookConfigured)
          setLoading(false)
          hasCache = true
        }
      }
    } catch {
      // Ignore malformed or unavailable local storage.
    }
    void load(!hasCache)
  }, [])

  const save = async () => {
    if (!supabase) return
    if (!keyId.trim()) {
      setError('Razorpay Key ID is required.')
      return
    }
    setSaving(true)
    setSaved(false)
    setError('')
    const { data, error: e } = await supabase.functions.invoke('razorpay-admin-settings', {
      method: 'POST',
      body: {
        mode,
        key_id: keyId.trim(),
        key_secret: keySecret.trim() || undefined,
        webhook_secret: webhookSecret.trim() || undefined,
      },
    })
    if (e) {
      setError(e.message)
    } else if (data?.error) {
      setError(data.error)
    } else {
      setMode(data?.mode === 'live' ? 'live' : mode)
      setKeyId(data?.key_id || keyId)
      setKeyConfigured(!!data?.key_secret_configured)
      setWebhookConfigured(!!data?.webhook_secret_configured)
      try {
        localStorage.setItem(
          'school_uniforms_razorpay_settings_ui',
          JSON.stringify({
            mode: data?.mode === 'live' ? 'live' : mode,
            keyId: data?.key_id || keyId,
            keyConfigured: !!data?.key_secret_configured,
            webhookConfigured: !!data?.webhook_secret_configured,
          }),
        )
      } catch {
        // Ignore unavailable local storage.
      }
      setKeySecret('')
      setWebhookSecret('')
      setSaved(true)
    }
    setSaving(false)
  }

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } catch {
      setError('Could not copy the webhook URL. Please copy it manually.')
    }
  }

  return (
    <>
      <ErrorBox text={error} />
      <Panel>
        {loading ? (
          <Loading />
        ) : (
          <>
            <div className="panel-heading">
              <div>
                <h2>Razorpay Settings</h2>
                <p className="workspace-muted">
                  Store Razorpay credentials securely in Supabase Vault. Secrets are never returned
                  to this browser after saving.
                </p>
              </div>
              <span
                className="workspace-status"
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '7px 10px',
                  borderRadius: '999px',
                  background: keyConfigured && webhookConfigured ? '#eaf8ef' : '#fff5e6',
                  color: keyConfigured && webhookConfigured ? '#16743a' : '#9a5a00',
                }}
              >
                {keyConfigured && webhookConfigured ? 'Configured' : 'Setup Required'}
              </span>
            </div>

            <div className="workspace-form-row">
              <Select
                label="Razorpay Mode"
                value={mode}
                options={['test', 'live']}
                labels={{ test: 'Test Mode', live: 'Live Mode' }}
                onChange={(v) => setMode(v as 'test' | 'live')}
              />
              <Field
                label="Razorpay Key ID"
                value={keyId}
                onChange={setKeyId}
                placeholder="rzp_test_..."
              />
            </div>

            <div className="workspace-form-row">
              <label className="workspace-field">
                <span>Razorpay Key Secret</span>
                <input
                  type="password"
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  placeholder={
                    keyConfigured ? '••••••••••••••••  (configured)' : 'Enter Key Secret'
                  }
                  autoComplete="new-password"
                />
              </label>
              <label className="workspace-field">
                <span>Webhook Secret</span>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={
                    webhookConfigured ? '••••••••••••••••  (configured)' : 'Enter Webhook Secret'
                  }
                  autoComplete="new-password"
                />
              </label>
            </div>

            <div className="workspace-note">
              <strong>Security:</strong> Key Secret and Webhook Secret are encrypted with Supabase
              Vault. Leaving either field blank keeps the currently stored secret unchanged.
            </div>

            <div className="workspace-form-row" style={{ alignItems: 'end' }}>
              <label className="workspace-field">
                <span>Webhook URL</span>
                <input value={webhookUrl} readOnly />
              </label>
              <button type="button" className="secondary-button" onClick={() => void copyWebhook()}>
                Copy Webhook URL
              </button>
            </div>

            <div className="workspace-note">
              Configure this exact URL in Razorpay Dashboard → Webhooks and enable
              payment.authorized, payment.captured, payment.failed, refund.created and
              refund.failed.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
              <button className="primary-button" disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving...' : 'Save Razorpay Settings'}
              </button>
              {saved && (
                <span style={{ color: '#16743a', fontSize: '11px', fontWeight: 800 }}>
                  Saved successfully.
                </span>
              )}
            </div>
          </>
        )}
      </Panel>
      <SiteBrandingSettings />
      <EmailConfigSettings />
      <BranchPaymentSettings />
    </>
  )
}
