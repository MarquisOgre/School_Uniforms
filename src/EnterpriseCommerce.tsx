import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  CheckCircle2,
  FileText,
  Globe2,
  LayoutTemplate,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Truck,
  Users,
  XCircle,
} from 'lucide-react'
import { supabase } from './lib/supabase'

const db = (table: string): any => (supabase as any)?.from(table)
type Tab =
  | 'shipping'
  | 'returns'
  | 'invoices'
  | 'marketing'
  | 'content'
  | 'seo'
  | 'access'

export default function EnterpriseCommerce() {
  const [tab, setTab] = useState<Tab>('shipping')
  const tabs = [
    ['shipping', 'Shipping'],
    ['returns', 'Returns & Refunds'],
    ['invoices', 'Invoices'],
    ['marketing', 'Marketing'],
    ['content', 'Pages & Blog'],
    ['seo', 'SEO & Menus'],
    ['access', 'Roles & Audit'],
  ] as const
  return (
    <div className="workspace-body">
      <div className="workspace-heading">
        <div>
          <h1>Commerce & CMS</h1>
          <p>
            Built-in store operations and WordPress + WooCommerce style administration without a
            development dependency.
          </p>
        </div>
        <button className="secondary-button" onClick={() => window.location.reload()}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      <div className="admin-module-tabs">
        {tabs.map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'shipping' && <Shipping />}
      {tab === 'returns' && <Returns />}
      {tab === 'invoices' && <Invoices />}
      {tab === 'marketing' && <Marketing />}
      {tab === 'content' && <Content />}
      {tab === 'seo' && <SeoMenus />}
      {tab === 'access' && <AccessAudit />}
    </div>
  )
}

function Payments() {
  const [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const load = async () => {
    setLoading(true)
    setError('')
    const r = await db('payments')
      .select(
        'id,order_id,provider,provider_payment_id,provider_order_id,amount,currency,status,paid_at,created_at,orders(order_number,customer_user_id,grand_total)',
      )
      .order('created_at', { ascending: false })
      .limit(100)
    if (r.error) setError(r.error.message)
    setRows(r.data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])
  const verify = async (p: any) => {
    setMessage('')
    const paidAt = new Date().toISOString()
    const r = await db('payments').update({ status: 'paid', paid_at: paidAt }).eq('id', p.id)
    if (r.error) {
      setMessage(r.error.message)
      return
    }
    const orderUpdate = await db('orders')
      .update({ status: 'confirmed' })
      .eq('id', p.order_id)
      .in('status', ['pending'])
    if (orderUpdate.error) {
      setMessage(orderUpdate.error.message)
      return
    }
    await audit('payment.verified', 'payments', p.id, {
      provider: p.provider,
      order_id: p.order_id,
      verified_at: paidAt,
    })
    setMessage('Payment verified and pending order moved to confirmed.')
    void load()
  }
  return (
    <section className="enterprise-card">
      <div className="enterprise-card-head">
        <div>
          <h3>
            <CheckCircle2 size={17} /> Payment Verification
          </h3>
          <span>
            Manual UPI payments remain pending until an administrator verifies the transaction.
            Gateway payments can also be reconciled here.
          </span>
        </div>
      </div>
      {message && <p className="form-success">{message}</p>}
      {error && <p className="workspace-error">{error}</p>}
      {loading ? (
        <div className="workspace-empty">Loading payments...</div>
      ) : (
        <div className="enterprise-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Provider</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.orders?.order_number || p.order_id}</td>
                  <td>{p.provider || '—'}</td>
                  <td>{p.provider_payment_id || p.provider_order_id || '—'}</td>
                  <td>₹{Number(p.amount || 0).toFixed(2)}</td>
                  <td>
                    <span className="status-pill">{p.status}</span>
                  </td>
                  <td>{new Date(p.created_at).toLocaleString()}</td>
                  <td>
                    {p.status !== 'paid' ? (
                      <button className="secondary-button" onClick={() => void verify(p)}>
                        Verify Paid
                      </button>
                    ) : (
                      <span>Verified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Shipping() {
  const [zones, setZones] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [methods, setMethods] = useState<any[]>([])
  const [name, setName] = useState('')
  const [states, setStates] = useState('')
  const [postcodes, setPostcodes] = useState('')
  const [rate, setRate] = useState('0')
  const [freeAbove, setFreeAbove] = useState('0')
  const [methodType, setMethodType] = useState('flat_rate')
  const [msg, setMsg] = useState('')
  const load = async () => {
    const r = await db('shipping_zones')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name')
    setZones(r.data ?? [])
    if (!selected && r.data?.[0]) setSelected(r.data[0].id)
  }
  const loadMethods = async (id: string) => {
    const r = await db('shipping_methods').select('*').eq('zone_id', id).order('sort_order')
    setMethods(r.data ?? [])
  }
  useEffect(() => {
    void load()
  }, [])
  useEffect(() => {
    if (selected) void loadMethods(selected)
  }, [selected])
  const selectedZone = zones.find((z) => z.id === selected)
  const addZone = async () => {
    if (!name.trim()) return
    const r = await db('shipping_zones')
      .insert({
        name: name.trim(),
        states: states
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        postal_codes: postcodes
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        is_default: zones.length === 0,
      })
      .select()
      .single()
    if (r.error) setMsg(r.error.message)
    else {
      setName('')
      setStates('')
      setPostcodes('')
      setMsg('Shipping zone created.')
      void load()
    }
  }
  const saveZone = async () => {
    if (!selected) return
    const r = await db('shipping_zones')
      .update({
        states: states
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        postal_codes: postcodes
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      })
      .eq('id', selected)
    setMsg(r.error ? r.error.message : 'Shipping zone updated.')
    void load()
  }
  const addMethod = async () => {
    if (!selected) return
    const r = await db('shipping_methods').insert({
      zone_id: selected,
      name:
        methodType === 'local_pickup'
          ? 'Local Pickup'
          : methodType === 'free_shipping'
            ? 'Free Shipping'
            : 'Standard Delivery',
      rate: methodType === 'free_shipping' || methodType === 'local_pickup' ? 0 : Number(rate) || 0,
      free_shipping_minimum:
        methodType === 'free_shipping' ? Number(freeAbove) || null : Number(freeAbove) || null,
      method_type: methodType,
    })
    if (r.error) setMsg(r.error.message)
    else {
      setRate('0')
      setFreeAbove('0')
      setMsg('Shipping method added.')
      void loadMethods(selected)
    }
  }
  useEffect(() => {
    if (!selectedZone) return
    setStates((selectedZone.states || []).join(', '))
    setPostcodes((selectedZone.postal_codes || []).join(', '))
  }, [selected])
  return (
    <section className="enterprise-grid">
      <div className="enterprise-card">
        <h3>
          <Globe2 size={17} /> Shipping Zones
        </h3>
        <div className="cms-field-grid">
          <label>
            Zone Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hyderabad" />
          </label>
          <label>
            States
            <input
              value={states}
              onChange={(e) => setStates(e.target.value)}
              placeholder="Telangana"
            />
          </label>
          <label className="full-field">
            Postcodes
            <input
              value={postcodes}
              onChange={(e) => setPostcodes(e.target.value)}
              placeholder="500001, 500032, 500081"
            />
          </label>
        </div>
        <div className="inline-form">
          <button className="primary-button" onClick={() => void addZone()}>
            <Plus size={15} /> Add Zone
          </button>
          {selected && (
            <button className="secondary-button" onClick={() => void saveZone()}>
              Save Zone
            </button>
          )}
        </div>
        <div className="enterprise-list">
          {zones.map((z) => (
            <button
              key={z.id}
              className={selected === z.id ? 'selected' : ''}
              onClick={() => setSelected(z.id)}
            >
              <span>
                {z.name}
                <small>
                  {z.is_default ? 'Default · ' : ''}
                  {(z.states || []).join(', ') || 'All states'}
                  {(z.postal_codes || []).length ? ' · ' + z.postal_codes.join(', ') : ''}
                </small>
              </span>
              <span>{z.status}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="enterprise-card">
        <h3>
          <Truck size={17} /> Shipping Methods
        </h3>
        {selected ? (
          <>
            <div className="cms-field-grid">
              <label>
                Method Type
                <select value={methodType} onChange={(e) => setMethodType(e.target.value)}>
                  <option value="flat_rate">Flat Rate</option>
                  <option value="free_shipping">Free Shipping</option>
                  <option value="local_pickup">Local Pickup</option>
                </select>
              </label>
              <label>
                Rate
                <input
                  type="number"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  disabled={methodType !== 'flat_rate'}
                />
              </label>
              <label>
                Free Above
                <input
                  type="number"
                  min="0"
                  value={freeAbove}
                  onChange={(e) => setFreeAbove(e.target.value)}
                />
              </label>
            </div>
            <button className="secondary-button" onClick={() => void addMethod()}>
              <Plus size={15} /> Add Shipping Method
            </button>
            <div className="enterprise-list">
              {methods.map((m) => (
                <div key={m.id} className="enterprise-list-row">
                  <span>
                    {m.name}
                    <small>
                      ₹{Number(m.rate || 0).toFixed(2)} · {m.method_type}
                      {m.free_shipping_minimum
                        ? ' · Free above ₹' + Number(m.free_shipping_minimum).toFixed(2)
                        : ''}
                    </small>
                  </span>
                  <span>{m.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="workspace-empty">Create or select a zone.</div>
        )}
        {msg && <p className="form-success">{msg}</p>}
      </div>
    </section>
  )
}
function Fulfillment() {
  const [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    const r = await db('order_fulfillments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (r.error) {
      setRows([])
      setLoading(false)
      return
    }
    const ids = (r.data || []).map((x: any) => x.order_id).filter(Boolean)
    const o = ids.length ? await db('orders').select('id,order_number').in('id', ids) : { data: [] }
    const names = new Map((o.data || []).map((x: any) => [x.id, x.order_number]))
    setRows(
      (r.data || []).map((x: any) => ({ ...x, order_number: names.get(x.order_id) || x.order_id })),
    )
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])
  const setStatus = async (id: string, status: string) => {
    await db('order_fulfillments')
      .update({
        status,
        ...(status === 'packed' ? { packed_at: new Date().toISOString() } : {}),
        ...(status === 'shipped' ? { shipped_at: new Date().toISOString() } : {}),
        ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
      })
      .eq('id', id)
    void load()
  }
  return (
    <section className="enterprise-card">
      <div className="enterprise-card-head">
        <div>
          <h3>
            <PackageCheck size={17} /> Order Fulfillment
          </h3>
          <span>Pack, ship, deliver and track orders independently from payment status.</span>
        </div>
      </div>
      {loading ? (
        <div className="workspace-empty">Loading fulfillment...</div>
      ) : (
        <div className="enterprise-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Carrier</th>
                <th>Tracking</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td>{x.order_number || x.order_id}</td>
                  <td>{x.status}</td>
                  <td>
                    <input
                      className="admin-mini-input"
                      value={x.carrier || ''}
                      placeholder="Carrier"
                      onChange={(e) =>
                        setRows((v) =>
                          v.map((r) => (r.id === x.id ? { ...r, carrier: e.target.value } : r)),
                        )
                      }
                      onBlur={() =>
                        void db('order_fulfillments')
                          .update({ carrier: x.carrier || null })
                          .eq('id', x.id)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="admin-mini-input"
                      value={x.tracking_number || ''}
                      placeholder="Tracking #"
                      onChange={(e) =>
                        setRows((v) =>
                          v.map((r) =>
                            r.id === x.id ? { ...r, tracking_number: e.target.value } : r,
                          ),
                        )
                      }
                      onBlur={() =>
                        void db('order_fulfillments')
                          .update({ tracking_number: x.tracking_number || null })
                          .eq('id', x.id)
                      }
                    />
                  </td>
                  <td>
                    <select value={x.status} onChange={(e) => void setStatus(x.id, e.target.value)}>
                      <option>pending</option>
                      <option>processing</option>
                      <option>packed</option>
                      <option>shipped</option>
                      <option>delivered</option>
                      <option>cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Returns() {
  const [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [status, setStatus] = useState('')
  const load = async () => {
    setLoading(true)
    const r = await db('returns').select('*').order('created_at', { ascending: false }).limit(100)
    if (r.error) {
      setRows([])
      setLoading(false)
      return
    }
    const ids = (r.data || []).map((x: any) => x.order_id).filter(Boolean)
    const o = ids.length ? await db('orders').select('id,order_number').in('id', ids) : { data: [] }
    const names = new Map((o.data || []).map((x: any) => [x.id, x.order_number]))
    setRows(
      (r.data || []).map((x: any) => ({ ...x, order_number: names.get(x.order_id) || x.order_id })),
    )
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])
  const update = async (id: string, next: string) => {
    const r = await db('returns')
      .update({
        status: next,
        ...(['refunded', 'exchanged', 'rejected', 'cancelled'].includes(next)
          ? { resolved_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', id)
    if (r.error) setStatus(r.error.message)
    else {
      setStatus('Return updated.')
      await audit('return.status_changed', 'returns', id, { status: next })
      void load()
    }
  }
  return (
    <section className="enterprise-card">
      <div className="enterprise-card-head">
        <div>
          <h3>
            <RotateCcw size={17} /> Returns & Refunds
          </h3>
          <span>
            Structured return requests with approval, inspection and refund/exchange states.
          </span>
        </div>
      </div>
      {status && <p className="form-success">{status}</p>}
      {loading ? (
        <div className="workspace-empty">Loading returns...</div>
      ) : (
        <div className="enterprise-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Order</th>
                <th>Reason</th>
                <th>Refund</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td>{x.request_number}</td>
                  <td>{x.order_number || x.order_id}</td>
                  <td>{x.reason || '—'}</td>
                  <td>₹{Number(x.refund_amount || 0).toFixed(2)}</td>
                  <td>{x.status}</td>
                  <td>
                    <select value={x.status} onChange={(e) => void update(x.id, e.target.value)}>
                      <option>requested</option>
                      <option>approved</option>
                      <option>rejected</option>
                      <option>received</option>
                      <option>inspecting</option>
                      <option>refund_pending</option>
                      <option>refunded</option>
                      <option>exchange_pending</option>
                      <option>exchanged</option>
                      <option>cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Invoices() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true)
    setError('')
    const r = await db('invoices').select('*').order('issued_at', { ascending: false }).limit(100)
    if (r.error) {
      setRows([])
      setError(r.error.message)
      setLoading(false)
      return
    }
    const ids = (r.data || []).map((x: any) => x.order_id).filter(Boolean)
    const o = ids.length
      ? await db('orders')
          .select('id,order_number,grand_total,shipping_address,customer_user_id,created_at')
          .in('id', ids)
      : { data: [] }
    const items = ids.length
      ? await db('order_items')
          .select('id,order_id,quantity,unit_price,item_name_snapshot')
          .in('order_id', ids)
          .order('created_at')
      : { data: [] }
    const orders = new Map((o.data || []).map((x: any) => [x.id, x]))
    const itemMap = new Map<string, any[]>()
    ;(items.data || []).forEach((item: any) =>
      itemMap.set(item.order_id, [...(itemMap.get(item.order_id) || []), item]),
    )
    setRows(
      (r.data || []).map((x: any) => ({
        ...x,
        orders: orders.get(x.order_id) || null,
        order_items: itemMap.get(x.order_id) || [],
      })),
    )
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])
  const visible = useMemo(
    () =>
      rows.filter(
        (x) =>
          !search ||
          String(x.invoice_number).toLowerCase().includes(search.toLowerCase()) ||
          String(x.orders?.order_number || '')
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [rows, search],
  )
  const printInvoice = (x: any) => {
    const address = x.orders?.shipping_address || {}
    const rowsHtml = (x.order_items || [])
      .map(
        (it: any) =>
          '<tr><td>' +
          String(it.item_name_snapshot || 'Item') +
          '</td><td>' +
          Number(it.quantity || 0) +
          '</td><td>₹' +
          Number(it.unit_price || 0).toFixed(2) +
          '</td><td>₹' +
          (Number(it.unit_price || 0) * Number(it.quantity || 0)).toFixed(2) +
          '</td></tr>',
      )
      .join('')
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(
      '<html><head><title>' +
        x.invoice_number +
        '</title><style>body{font-family:Arial;padding:40px}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:bold}</style></head><body><h1>INVOICE</h1><p><b>' +
        x.invoice_number +
        '</b></p><p>' +
        String(address.recipient_name || 'Customer') +
        '<br>' +
        String(address.address_line1 || '') +
        '<br>' +
        String(address.city || '') +
        ' ' +
        String(address.state || '') +
        ' ' +
        String(address.postal_code || '') +
        '</p><table><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>' +
        rowsHtml +
        '</table><p>Order: ' +
        String(x.orders?.order_number || '') +
        ' · Date: ' +
        new Date(x.issued_at).toLocaleDateString() +
        '</p><p class="total">Grand Total: ₹' +
        Number(x.orders?.grand_total || 0).toFixed(2) +
        '</p><script>window.print()</script></body></html>',
    )
    w.document.close()
  }
  return (
    <section className="enterprise-card">
      <div className="enterprise-card-head">
        <div>
          <h3>
            <FileText size={17} /> Invoices
          </h3>
          <span>Automatic invoice records with line-item printing and browser PDF.</span>
        </div>
        <div className="toolbar-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice/order"
          />
        </div>
      </div>
      {error && <p className="workspace-error">Unable to load invoices: {error}</p>}
      {loading ? (
        <div className="workspace-empty">Loading invoices...</div>
      ) : !visible.length ? (
        <div className="workspace-empty">No invoices found.</div>
      ) : (
        <div className="enterprise-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Order</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((x) => (
                <tr key={x.id}>
                  <td>{x.invoice_number}</td>
                  <td>{x.orders?.order_number || '—'}</td>
                  <td>₹{Number(x.orders?.grand_total || 0).toFixed(2)}</td>
                  <td>{x.status}</td>
                  <td>
                    <button className="secondary-button" onClick={() => printInvoice(x)}>
                      Print / PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
function Marketing() {
  const [promos, setPromos] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [promoMsg, setPromoMsg] = useState('')
  const [promoSaving, setPromoSaving] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('10')
  const [type, setType] = useState('percentage')
  const [minOrder, setMinOrder] = useState('0')
  const [usageLimit, setUsageLimit] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [branchId, setBranchId] = useState('')
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [relation, setRelation] = useState('related')
  const [msg, setMsg] = useState('')

  const resetPromoForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setValue('10')
    setType('percentage')
    setMinOrder('0')
    setUsageLimit('')
    setStartsAt('')
    setEndsAt('')
    setBranchId('')
  }

  const load = async () => {
    const [p, pr, b] = await Promise.all([
      db('promotions').select('*').order('created_at', { ascending: false }),
      db('products').select('id,name').eq('status', 'active').order('name'),
      db('branches').select('id,name,code,status').order('name'),
    ])
    setPromos(p.data ?? [])
    setProducts(pr.data ?? [])
    setBranches(b.data ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  const savePromo = async () => {
    if (!name.trim()) {
      setPromoMsg('Enter a promotion name.')
      return
    }
    const numericValue = Math.max(0, Number(value) || 0)
    if (type === 'percentage' && numericValue > 100) {
      setPromoMsg('Percentage promotions cannot exceed 100%.')
      return
    }
    setPromoMsg('')
    setPromoSaving(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      promotion_type: type,
      value: numericValue,
      min_order_value: Math.max(0, Number(minOrder) || 0),
      usage_limit: usageLimit.trim() ? Math.max(1, Number(usageLimit) || 1) : null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      branch_id: branchId || null,
      updated_at: new Date().toISOString(),
    }
    if (payload.starts_at && payload.ends_at && payload.ends_at < payload.starts_at) {
      setPromoMsg('End date must be after the start date.')
      setPromoSaving(false)
      return
    }
    const r = editingId
      ? await db('promotions').update(payload).eq('id', editingId)
      : await db('promotions').insert({ ...payload, enabled: true })
    if (r.error) {
      setPromoMsg(`Unable to save promotion: ${r.error.message}`)
    } else {
      setPromoMsg(editingId ? 'Promotion updated successfully.' : 'Promotion created successfully.')
      resetPromoForm()
      await load()
    }
    setPromoSaving(false)
  }

  const editPromo = (p: any) => {
    setEditingId(p.id)
    setName(p.name || '')
    setDescription(p.description || '')
    setValue(String(p.value ?? 0))
    setType(p.promotion_type || 'percentage')
    setMinOrder(String(p.min_order_value ?? 0))
    setUsageLimit(p.usage_limit == null ? '' : String(p.usage_limit))
    setStartsAt(p.starts_at ? new Date(p.starts_at).toISOString().slice(0, 16) : '')
    setEndsAt(p.ends_at ? new Date(p.ends_at).toISOString().slice(0, 16) : '')
    setBranchId(p.branch_id || '')
    setPromoMsg('')
  }

  const togglePromo = async (p: any) => {
    setPromoMsg('')
    const r = await db('promotions')
      .update({ enabled: !p.enabled, updated_at: new Date().toISOString() })
      .eq('id', p.id)
    setPromoMsg(
      r.error
        ? `Unable to change status: ${r.error.message}`
        : p.enabled
          ? 'Promotion deactivated.'
          : 'Promotion activated.',
    )
    if (!r.error) await load()
  }

  const deletePromo = async (p: any) => {
    if (!window.confirm(`Delete promotion "${p.name}" permanently?`)) return
    setPromoMsg('')
    const r = await db('promotions').delete().eq('id', p.id)
    setPromoMsg(r.error ? `Unable to delete promotion: ${r.error.message}` : 'Promotion deleted.')
    if (!r.error) {
      if (editingId === p.id) resetPromoForm()
      await load()
    }
  }

  const relate = async () => {
    if (!source || !target || source === target) {
      setMsg('Select two different products.')
      return
    }
    const r = await db('product_relations').upsert(
      { product_id: source, related_product_id: target, relation_type: relation, sort_order: 0 },
      { onConflict: 'product_id,related_product_id,relation_type' },
    )
    setMsg(r.error ? r.error.message : 'Product merchandising link saved.')
  }

  return (
    <section className="enterprise-grid">
      <div className="enterprise-card">
        <div className="enterprise-card-head">
          <div>
            <h3>
              <Plus size={17} /> Promotions
            </h3>
            <span>
              Automatic offers for the storefront. Coupons remain separate and can be entered
              manually at checkout.
            </span>
          </div>
        </div>
        <div className="cms-field-grid">
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Back to School Offer"
            />
          </label>
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </label>
          <label>
            Value
            <input
              type="number"
              min="0"
              max={type === 'percentage' ? 100 : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={type === 'free_shipping'}
            />
          </label>
          <label>
            Minimum Order
            <input
              type="number"
              min="0"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
          </label>
          <label>
            Usage Limit
            <input
              type="number"
              min="1"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="Unlimited"
            />
          </label>
          <label>
            Branch
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All Branches</option>
              {branches
                .filter((b) => b.status === 'active')
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.code}
                  </option>
                ))}
            </select>
          </label>
          <label className="full-field">
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Save 10% on eligible school uniform orders."
            />
          </label>
          <label>
            Starts
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label>
            Ends
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </label>
        </div>
        <div className="inline-form">
          <button
            className="primary-button"
            disabled={promoSaving}
            onClick={() => void savePromo()}
          >
            <Save size={15} />{' '}
            {promoSaving ? 'Saving...' : editingId ? 'Update Promotion' : 'Create Promotion'}
          </button>
          {editingId && (
            <button className="secondary-button" onClick={resetPromoForm}>
              Cancel Edit
            </button>
          )}
        </div>
        {promoMsg && (
          <p className={promoMsg.startsWith('Unable') ? 'workspace-error' : 'form-success'}>
            {promoMsg}
          </p>
        )}
        <div className="enterprise-list">
          {promos.map((p) => (
            <div className="enterprise-list-row" key={p.id}>
              <span>
                {p.name}
                <small>
                  {p.promotion_type} ·{' '}
                  {p.promotion_type === 'free_shipping' ? 'Free shipping' : p.value}
                  {Number(p.min_order_value || 0)
                    ? ` · Min ₹${Number(p.min_order_value).toFixed(0)}`
                    : ''}
                  {p.branch_id
                    ? ` · ${branches.find((b) => b.id === p.branch_id)?.name || 'Branch'}`
                    : ' · All branches'}
                </small>
              </span>
              <span className="inline-form">
                <strong>{p.enabled ? 'Active' : 'Inactive'}</strong>
                <button className="secondary-button" onClick={() => editPromo(p)}>
                  Edit
                </button>
                <button className="secondary-button" onClick={() => void togglePromo(p)}>
                  {p.enabled ? 'Deactivate' : 'Activate'}
                </button>
                <button className="secondary-button" onClick={() => void deletePromo(p)}>
                  Delete
                </button>
              </span>
            </div>
          ))}
          {!promos.length && <div className="workspace-empty">No promotions created yet.</div>}
        </div>
      </div>
      <div className="enterprise-card">
        <h3>
          <Archive size={17} /> Product Merchandising
        </h3>
        <p>Configure native related products, upsells and cross-sells.</p>
        <div className="cms-field-grid">
          <label>
            Product
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target Product
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Select target</option>
              {products
                .filter((p) => p.id !== source)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Relationship
            <select value={relation} onChange={(e) => setRelation(e.target.value)}>
              <option value="related">Related</option>
              <option value="upsell">Upsell</option>
              <option value="cross_sell">Cross-sell</option>
            </select>
          </label>
        </div>
        <button className="secondary-button" onClick={() => void relate()}>
          <Plus size={15} /> Save Relationship
        </button>
        {msg && <p className="form-success">{msg}</p>}
      </div>
    </section>
  )
}
function SparkleIcon() {
  return <Plus size={17} />
}

function Content() {
  const [pages, setPages] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [kind, setKind] = useState<'page' | 'post'>('page')
  const [msg, setMsg] = useState('')
  const load = async () => {
    const [p, b] = await Promise.all([
      db('site_pages').select('*').order('updated_at', { ascending: false }),
      db('site_posts').select('*').order('updated_at', { ascending: false }),
    ])
    setPages(p.data ?? [])
    setPosts(b.data ?? [])
  }
  useEffect(() => {
    void load()
  }, [])
  const openNew = () => {
    setEditing({
      title: '',
      slug: '',
      excerpt: '',
      body: '',
      status: 'draft',
      content: { blocks: [] },
    })
  }
  const openExisting = (row: any) => {
    const blocks = Array.isArray(row.content?.blocks) ? row.content.blocks : []
    setEditing({
      ...row,
      body: blocks
        .map((b: any) => b.text || '')
        .filter(Boolean)
        .join('\n\n'),
      slug: row.slug || '',
    })
  }
  const save = async (publish = false) => {
    if (!editing?.title?.trim()) return
    const slug = (editing.slug || editing.title)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const table = kind === 'post' ? 'site_posts' : 'site_pages'
    const content = { blocks: [{ text: String(editing.body || '').trim() }] }
    const payload: any = {
      title: editing.title.trim(),
      slug,
      excerpt: editing.excerpt?.trim() || null,
      content,
      status: publish ? 'published' : editing.status || 'draft',
      published_at: publish ? new Date().toISOString() : editing.published_at || null,
      updated_at: new Date().toISOString(),
    }
    if (kind === 'post') payload.author_user_id = editing.author_user_id || null
    const r = editing.id
      ? await db(table).update(payload).eq('id', editing.id)
      : await db(table).insert(payload)
    if (r.error) setMsg(r.error.message)
    else {
      setMsg(publish ? 'Published successfully.' : 'Saved as draft.')
      setEditing(null)
      void load()
    }
  }
  const remove = async () => {
    if (!editing?.id) return
    if (!window.confirm('Delete this content item?')) return
    const table = kind === 'post' ? 'site_posts' : 'site_pages'
    const r = await db(table).delete().eq('id', editing.id)
    if (r.error) setMsg(r.error.message)
    else {
      setEditing(null)
      setMsg('Content deleted.')
      void load()
    }
  }
  return (
    <section className="enterprise-grid">
      <div className="enterprise-card">
        <div className="enterprise-card-head">
          <div>
            <h3>
              <LayoutTemplate size={17} /> Pages & Blog
            </h3>
            <span>Create, edit, publish and unpublish native CMS content.</span>
          </div>
          <div className="inline-form">
            <select value={kind} onChange={(e) => setKind(e.target.value as 'page' | 'post')}>
              <option value="page">Page</option>
              <option value="post">Blog Post</option>
            </select>
            <button className="primary-button" onClick={openNew}>
              <Plus size={15} /> New
            </button>
          </div>
        </div>
        {msg && <p className="form-success">{msg}</p>}
        <div className="enterprise-list">
          {[
            ...pages.map((x) => ({ ...x, _kind: 'Page' })),
            ...posts.map((x) => ({ ...x, _kind: 'Post' })),
          ].map((x) => (
            <button
              key={x.id}
              onClick={() => {
                setKind(x._kind === 'Post' ? 'post' : 'page')
                openExisting(x)
              }}
            >
              <span>
                {x.title}
                <small>
                  {x._kind} · {x.status} · /{x.slug}
                </small>
              </span>
              <span>Edit</span>
            </button>
          ))}
        </div>
      </div>
      <div className="enterprise-card">
        {editing ? (
          <>
            <div className="enterprise-card-head">
              <div>
                <h3>Edit {kind === 'post' ? 'Blog Post' : 'Page'}</h3>
                <span>Changes are stored in Supabase.</span>
              </div>
              <button className="secondary-button" onClick={() => setEditing(null)}>
                Close
              </button>
            </div>
            <div className="cms-field-grid">
              <label>
                Title
                <input
                  value={editing.title || ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </label>
              <label>
                Slug
                <input
                  value={editing.slug || ''}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
              </label>
              <label className="full-field">
                Excerpt
                <textarea
                  value={editing.excerpt || ''}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                />
              </label>
              <label className="full-field">
                Content
                <textarea
                  rows={12}
                  value={editing.body || ''}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  placeholder="Write the page content here..."
                />
              </label>
            </div>
            <div className="inline-form">
              <button className="primary-button" onClick={() => void save(false)}>
                <Save size={15} /> Save Draft
              </button>
              <button className="primary-button" onClick={() => void save(true)}>
                <CheckCircle2 size={15} /> Publish
              </button>
              {editing.id && (
                <button className="secondary-button" onClick={() => void remove()}>
                  <XCircle size={15} /> Delete
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h3>Content Editor</h3>
            <p>
              Select an existing page/post or click New. Published pages are available at{' '}
              <code>/page/slug</code> and blog posts at <code>/blog/slug</code>.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
function SeoMenus() {
  const [menus, setMenus] = useState<any[]>([])
  const [pages, setPages] = useState<any[]>([])
  const [seo, setSeo] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const load = async () => {
    const [m, p, s] = await Promise.all([
      db('nav_menus').select('*').order('name'),
      db('site_pages').select('id,title,slug').order('title'),
      db('seo_meta').select('*').order('updated_at', { ascending: false }),
    ])
    setMenus(m.data ?? [])
    setPages(p.data ?? [])
    setSeo(s.data ?? [])
  }
  useEffect(() => {
    void load()
  }, [])
  const editSeo = (page: any) => {
    const existing = seo.find((x) => x.object_type === 'page' && x.object_id === page.id)
    setEditing(
      existing || {
        object_type: 'page',
        object_id: page.id,
        meta_title: page.title,
        meta_description: '',
        canonical_url: '/page/' + page.slug,
        robots: 'index,follow',
        og_title: page.title,
        og_description: '',
        og_image_url: '',
        schema_json: {},
      },
    )
  }
  const saveSeo = async () => {
    if (!editing?.object_id) return
    const payload = {
      object_type: editing.object_type,
      object_id: editing.object_id,
      meta_title: editing.meta_title || null,
      meta_description: editing.meta_description || null,
      canonical_url: editing.canonical_url || null,
      robots: editing.robots || 'index,follow',
      og_title: editing.og_title || null,
      og_description: editing.og_description || null,
      og_image_url: editing.og_image_url || null,
      schema_json: editing.schema_json || {},
      updated_at: new Date().toISOString(),
    }
    const r = await db('seo_meta').upsert(payload, { onConflict: 'object_type,object_id' })
    if (r.error) setMsg(r.error.message)
    else {
      setMsg('SEO metadata saved.')
      setEditing(null)
      void load()
    }
  }
  const addItem = async (menu: any, page: any) => {
    const r = await db('nav_menu_items').insert({
      menu_id: menu.id,
      label: page.title,
      url: '/page/' + page.slug,
      sort_order: 999,
    })
    setMsg(r.error ? r.error.message : 'Menu item added.')
  }
  return (
    <section className="enterprise-grid">
      <div className="enterprise-card">
        <h3>
          <Globe2 size={17} /> Navigation Menus
        </h3>
        <p>Manage header/footer menus independently from the React shell.</p>
        {menus.map((m) => (
          <div className="enterprise-list-row" key={m.id}>
            <span>
              {m.name}
              <small>{m.location}</small>
            </span>
            {pages[0] ? (
              <button className="secondary-button" onClick={() => void addItem(m, pages[0])}>
                Add page
              </button>
            ) : null}
          </div>
        ))}
        {msg && <p className="form-success">{msg}</p>}
      </div>
      <div className="enterprise-card">
        <div className="enterprise-card-head">
          <div>
            <h3>SEO Manager</h3>
            <span>Edit metadata per page and publish-ready content.</span>
          </div>
        </div>
        <div className="enterprise-list">
          {pages.map((p) => (
            <button key={p.id} onClick={() => editSeo(p)}>
              <span>
                {p.title}
                <small>/{p.slug}</small>
              </span>
              <span>Edit SEO</span>
            </button>
          ))}
        </div>
        {editing && (
          <div className="cms-field-grid" style={{ marginTop: 16 }}>
            <label>
              Meta Title
              <input
                value={editing.meta_title || ''}
                onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })}
              />
            </label>
            <label>
              Canonical URL
              <input
                value={editing.canonical_url || ''}
                onChange={(e) => setEditing({ ...editing, canonical_url: e.target.value })}
              />
            </label>
            <label className="full-field">
              Meta Description
              <textarea
                value={editing.meta_description || ''}
                onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
              />
            </label>
            <label>
              Robots
              <input
                value={editing.robots || ''}
                onChange={(e) => setEditing({ ...editing, robots: e.target.value })}
              />
            </label>
            <label>
              OG Image
              <input
                value={editing.og_image_url || ''}
                onChange={(e) => setEditing({ ...editing, og_image_url: e.target.value })}
              />
            </label>
            <div className="inline-form">
              <button className="primary-button" onClick={() => void saveSeo()}>
                <Save size={15} /> Save SEO
              </button>
              <button className="secondary-button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
function AccessAudit() {
  const [roles, setRoles] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [rolePermissions, setRolePermissions] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState('')
  const [msg, setMsg] = useState('')
  const load = async () => {
    const [r, p, u, rp, l] = await Promise.all([
      db('admin_roles').select('*').order('name'),
      db('admin_permissions').select('*').order('permission_key'),
      db('profiles').select('id,full_name,login_id,role,status').order('full_name'),
      db('admin_role_permissions').select('*'),
      db('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setRoles(r.data ?? [])
    setPermissions(p.data ?? [])
    setProfiles(u.data ?? [])
    setRolePermissions(rp.data ?? [])
    setLogs(l.data ?? [])
  }
  useEffect(() => {
    void load()
  }, [])
  const addRole = async () => {
    const name = window.prompt('Role name')
    if (!name?.trim()) return
    const r = await db('admin_roles').insert({
      name: name.trim(),
      description: 'Custom administrator role',
      is_system: false,
    })
    setMsg(r.error ? r.error.message : 'Role created.')
    void load()
  }
  const togglePermission = async (permissionId: string) => {
    if (!selectedRole) return
    const exists = rolePermissions.some(
      (x) => x.role_id === selectedRole.id && x.permission_id === permissionId,
    )
    const r = exists
      ? await db('admin_role_permissions')
          .delete()
          .eq('role_id', selectedRole.id)
          .eq('permission_id', permissionId)
      : await db('admin_role_permissions').insert({
          role_id: selectedRole.id,
          permission_id: permissionId,
        })
    if (r.error) setMsg(r.error.message)
    else {
      setMsg('Permissions updated.')
      void load()
    }
  }
  const assignUser = async () => {
    if (!selectedRole || !selectedUser) return
    const r = await db('admin_user_roles').upsert(
      { user_id: selectedUser, role_id: selectedRole.id },
      { onConflict: 'user_id,role_id' },
    )
    if (r.error) setMsg(r.error.message)
    else {
      setMsg('User assigned to role.')
      setSelectedUser('')
      void load()
    }
  }
  return (
    <section className="enterprise-grid">
      <div className="enterprise-card">
        <h3>
          <ShieldCheck size={17} /> Roles & Permissions
        </h3>
        <p>
          Create administrator roles and control individual capabilities without exposing passwords.
        </p>
        <button className="primary-button" onClick={() => void addRole()}>
          <Users size={15} /> Add Role
        </button>
        <div className="enterprise-list">
          {roles.map((r) => (
            <button
              key={r.id}
              className={selectedRole?.id === r.id ? 'selected' : ''}
              onClick={() => setSelectedRole(r)}
            >
              <span>
                {r.name}
                <small>{r.description || '—'}</small>
              </span>
              <span>{r.is_system ? 'System' : 'Custom'}</span>
            </button>
          ))}
        </div>
        {selectedRole && (
          <div style={{ marginTop: 16 }}>
            <strong>Permissions for {selectedRole.name}</strong>
            <div className="enterprise-list">
              {permissions.map((p) => {
                const checked = rolePermissions.some(
                  (x) => x.role_id === selectedRole.id && x.permission_id === p.id,
                )
                return (
                  <label className="enterprise-list-row" key={p.id}>
                    <span>
                      {p.permission_key}
                      <small>{p.description || ''}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => void togglePermission(p.id)}
                    />
                  </label>
                )
              })}
            </div>
            <div className="inline-form">
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                <option value="">Select user to assign</option>
                {profiles
                  .filter((p) => p.status === 'active')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.login_id || p.id} · {p.role}
                    </option>
                  ))}
              </select>
              <button
                className="secondary-button"
                disabled={!selectedUser}
                onClick={() => void assignUser()}
              >
                Assign Role
              </button>
            </div>
          </div>
        )}
        {msg && <p className="form-success">{msg}</p>}
      </div>
      <div className="enterprise-card">
        <h3>
          <Archive size={17} /> Audit Log
        </h3>
        <p>
          Administrative actions are recorded with actor, entity, branch and JSON details for
          traceability.
        </p>
        <div className="enterprise-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.action}</td>
                  <td>{l.entity_type || '—'}</td>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
async function audit(
  action: string,
  entity_type: string,
  entity_id: string,
  details: Record<string, unknown>,
) {
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  await db('audit_logs').insert({
    actor_user_id: data.user.id,
    action,
    entity_type,
    entity_id,
    details,
  })
}
