import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Save, X } from 'lucide-react'
import { supabase } from './lib/supabase'

const dbFrom = (table: string): any => (supabase as any)?.from(table)

type TaxClass = { id: string; name: string; slug: string; description: string | null; is_default: boolean; is_exempt: boolean; is_zero_rated: boolean; status: string }
type TaxRate = { id: string; tax_class_id: string; branch_id: string | null; state_code: string | null; rate: number; cgst_rate: number; sgst_rate: number; igst_rate: number; cess_rate: number; hsn_prefix: string | null; effective_from: string; effective_to: string | null; priority: number; status: string; tax_classes?: { name: string } }

export default function TaxSettings() {
  const [classes, setClasses] = useState<TaxClass[]>([])
  const [rates, setRates] = useState<TaxRate[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null)
  const [form, setForm] = useState({
    tax_class_id: '', branch_id: '', state_code: '', rate: '', cgst_rate: '', sgst_rate: '', igst_rate: '', cess_rate: '', hsn_prefix: '', priority: '0',
  })

  const load = async () => {
    if (!supabase) return
    setLoading(true); setError('')
    const [c, r, b] = await Promise.all([
      dbFrom('tax_classes').select('*').order('name'),
      dbFrom('tax_rates').select('*, tax_classes(name)').order('priority', { ascending: false }).order('state_code'),
      dbFrom('branches').select('id,name').order('name'),
    ])
    if (c.error || r.error || b.error) setError(c.error?.message || r.error?.message || b.error?.message || 'Unable to load tax settings.')
    setClasses(c.data || []); setRates(r.data || []); setBranches(b.data || []); setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const reset = () => {
    setEditingRate(null)
    const standard = classes.find(x => x.is_default) || classes[0]
    setForm({ tax_class_id: standard?.id || '', branch_id: '', state_code: '', rate: '', cgst_rate: '', sgst_rate: '', igst_rate: '', cess_rate: '', hsn_prefix: '', priority: '0' })
  }

  useEffect(() => { if (!editingRate && classes.length) reset() }, [classes])

  const edit = (r: TaxRate) => {
    setEditingRate(r)
    setForm({ tax_class_id: r.tax_class_id, branch_id: r.branch_id || '', state_code: r.state_code || '', rate: String(r.rate), cgst_rate: String(r.cgst_rate), sgst_rate: String(r.sgst_rate), igst_rate: String(r.igst_rate), cess_rate: String(r.cess_rate), hsn_prefix: r.hsn_prefix || '', priority: String(r.priority || 0) })
  }

  const save = async () => {
    if (!supabase || !form.tax_class_id) return
    const payload = {
      tax_class_id: form.tax_class_id,
      branch_id: form.branch_id || null,
      state_code: form.state_code.trim().toUpperCase() || null,
      rate: Number(form.rate || 0), cgst_rate: Number(form.cgst_rate || 0), sgst_rate: Number(form.sgst_rate || 0), igst_rate: Number(form.igst_rate || 0), cess_rate: Number(form.cess_rate || 0),
      hsn_prefix: form.hsn_prefix.trim() || null, priority: Number(form.priority || 0), status: 'active',
    }
    if ([payload.rate, payload.cgst_rate, payload.sgst_rate, payload.igst_rate, payload.cess_rate].some(x => x < 0 || x > 100)) { setError('Tax rates must be between 0 and 100.'); return }
    setSaving(true); setError('')
    const result = editingRate ? await dbFrom('tax_rates').update(payload).eq('id', editingRate.id) : await dbFrom('tax_rates').insert(payload)
    if (result.error) setError(result.error.message)
    else { reset(); await load() }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this tax rate? Historical order tax lines are preserved.')) return
    const { error: e } = await dbFrom('tax_rates').delete().eq('id', id)
    if (e) setError(e.message); else await load()
  }

  return <div>
    <div className="panel-heading">
      <div><h2>GST / Tax Engine</h2><p className="workspace-muted">Configure tax classes and GST rates. Order tax lines store snapshots so historical orders do not change when rates are updated.</p></div>
      <button className="secondary-button" onClick={() => void load()}><RefreshCw size={15}/> Refresh</button>
    </div>
    {error && <div className="workspace-note" style={{ color: '#9a2d2d' }}>{error}</div>}
    {loading ? <div className="workspace-muted">Loading tax configuration...</div> : <>
      <div className="workspace-form-row">
        <div className="workspace-field"><span>Tax Classes</span><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{classes.map(c => <span key={c.id} className="workspace-status" style={{ padding: '7px 10px' }}>{c.name}{c.is_default ? ' • Default' : ''}</span>)}</div></div>
        <div className="workspace-note"><strong>GST logic:</strong> same-state orders use CGST + SGST; inter-state orders use IGST. The destination state comes from the order shipping address and the branch is used as the origin scope.</div>
      </div>
      <div className="panel-heading" style={{ marginTop: 18 }}><div><h3>{editingRate ? 'Edit Tax Rate' : 'Add Tax Rate'}</h3></div>{editingRate && <button className="secondary-button" onClick={reset}><X size={15}/> Cancel</button>}</div>
      <div className="workspace-form-row">
        <label className="workspace-field"><span>Tax Class</span><select value={form.tax_class_id} onChange={e => setForm({ ...form, tax_class_id: e.target.value })}>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="workspace-field"><span>Branch Scope</span><select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}><option value="">All branches</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="workspace-field"><span>Destination State</span><input value={form.state_code} onChange={e => setForm({ ...form, state_code: e.target.value })} placeholder="e.g. TS" maxLength={3}/></label>
      </div>
      <div className="workspace-form-row">
        <Field label="Total Rate %" value={form.rate} onChange={v => setForm({ ...form, rate: v })}/>
        <Field label="CGST %" value={form.cgst_rate} onChange={v => setForm({ ...form, cgst_rate: v })}/>
        <Field label="SGST %" value={form.sgst_rate} onChange={v => setForm({ ...form, sgst_rate: v })}/>
        <Field label="IGST %" value={form.igst_rate} onChange={v => setForm({ ...form, igst_rate: v })}/>
      </div>
      <div className="workspace-form-row">
        <Field label="Cess %" value={form.cess_rate} onChange={v => setForm({ ...form, cess_rate: v })}/>
        <TextField label="HSN Prefix (optional)" value={form.hsn_prefix} onChange={v => setForm({ ...form, hsn_prefix: v })}/>
        <Field label="Priority" value={form.priority} onChange={v => setForm({ ...form, priority: v })}/>
        <div style={{ display: 'flex', alignItems: 'end' }}><button className="primary-button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : <><Save size={15}/> Save Rate</>}</button></div>
      </div>
      <div className="workspace-table-wrap" style={{ marginTop: 18 }}><table className="workspace-table"><thead><tr><th>Class</th><th>Branch</th><th>State</th><th>Rate</th><th>CGST</th><th>SGST</th><th>IGST</th><th>HSN</th><th></th></tr></thead><tbody>{rates.map(r => <tr key={r.id}><td>{r.tax_classes?.name || '—'}</td><td>{branches.find(b => b.id === r.branch_id)?.name || 'All'}</td><td>{r.state_code || 'All'}</td><td>{r.rate}%</td><td>{r.cgst_rate}%</td><td>{r.sgst_rate}%</td><td>{r.igst_rate}%</td><td>{r.hsn_prefix || '—'}</td><td><button className="icon-button" onClick={() => edit(r)} title="Edit"><Pencil size={15}/></button><button className="icon-button" onClick={() => void remove(r.id)} title="Delete"><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>
      {!rates.length && <div className="workspace-empty">No tax rates configured yet. Add the applicable GST rates for your catalogue.</div>}
    </>}
  </div>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="workspace-field"><span>{label}</span><input type="number" min="0" step="0.01" value={value} onChange={e => onChange(e.target.value)} /></label>
}
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="workspace-field"><span>{label}</span><input value={value} onChange={e => onChange(e.target.value)} /></label>
}
