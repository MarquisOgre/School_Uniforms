import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, RefreshCw, Save, Trash2, WandSparkles } from 'lucide-react'
import { supabase } from './lib/supabase'

const dbFrom = (table: string): any => (supabase as any)?.from(table)
const TYPES = ['height','chest','waist','hip','shoulder','inseam','foot_length','age'] as const

type GroupRow = { id: string; school_id: string; code: string; name: string; level_code: string; gender: string; sort_order: number }
type ClassRow = { id: string; name: string }
type ProductRow = { id: string; name: string; gender: string; status: string }
type VariantRow = { id: string; product_id: string; sku: string; size_label: string | null; variant_name: string | null; status: string }
type Measurement = { id?: string; variant_id: string; measurement_type: string; min_value: string; ideal_value: string; max_value: string; unit: string }

const LEVELS: Record<string,string> = {
  early_years: 'Early Years · Nursery, LKG & UKG',
  primary: 'Primary · Class 1–5',
  secondary: 'Secondary · Class 6–10',
}

export default function AIUniformSetup() {
  const [branches, setBranches] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [groupClassIds, setGroupClassIds] = useState<Set<string>>(new Set())
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [assignedProducts, setAssignedProducts] = useState<Set<string>>(new Set())
  const [productId, setProductId] = useState('')
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [assignedVariants, setAssignedVariants] = useState<Set<string>>(new Set())
  const [measurements, setMeasurements] = useState<Record<string, Measurement[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const schoolId = useMemo(() => branches.find((b) => b.id === branchId)?.school_id || '', [branches, branchId])

  const loadBranches = async () => {
    if (!supabase) return
    setLoading(true); setError(''); setNotice('')
    const b = await dbFrom('branches').select('id,name,code,school_id,status').eq('status','active').order('name')
    if (b.error) { setError(b.error.message); setLoading(false); return }
    setBranches(b.data || [])
    const stored = window.localStorage.getItem('admin:selectedBranchId')
    const next = (b.data || []).some((x: any) => x.id === stored) ? stored : b.data?.[0]?.id || ''
    setBranchId(next)
    setLoading(false)
  }

  useEffect(() => { void loadBranches() }, [])

  const loadSchool = async () => {
    if (!schoolId || !supabase) return
    setError('')
    const [g,c,p] = await Promise.all([
      dbFrom('uniform_groups').select('*').eq('school_id',schoolId).eq('status','active').order('sort_order'),
      dbFrom('uniform_classes').select('id,name').eq('school_id',schoolId).eq('status','active').order('sort_order').order('name'),
      dbFrom('products').select('id,name,gender,status').eq('status','active').order('name'),
    ])
    if (g.error || c.error || p.error) { setError(g.error?.message || c.error?.message || p.error?.message || 'Unable to load setup data.'); return }
    setGroups(g.data || []); setClasses(c.data || []); setProducts(p.data || [])
    setSelectedGroup((current) => current && (g.data || []).some((x:any)=>x.id===current.id) ? current : g.data?.[0] || null)
  }

  useEffect(() => { void loadSchool() }, [schoolId])

  const initializeTemplate = async () => {
    if (!schoolId || !supabase || initializing) return
    setInitializing(true); setError(''); setNotice('')
    const r = await (supabase as any).rpc('initialize_uniform_group_template', { p_school_id: schoolId })
    if (r.error) setError(r.error.message)
    else { setNotice('Standard 3-level × Boys/Girls template is ready for this school.'); await loadSchool() }
    setInitializing(false)
  }

  useEffect(() => {
    if (!selectedGroup || !branchId || !supabase) return
    const run = async () => {
      setError('')
      const a = await dbFrom('product_group_assignments').select('product_id').eq('branch_id',branchId).eq('group_id',selectedGroup.id)
      const cls = await dbFrom('uniform_group_classes').select('class_id').eq('group_id',selectedGroup.id)
      if (a.error || cls.error) { setError(a.error?.message || cls.error?.message || 'Unable to load group mappings.'); return }
      setAssignedProducts(new Set((a.data || []).map((x:any)=>x.product_id)))
      const ids = (cls.data || []).map((x:any)=>x.class_id)
      setClasses((current) => current.map(c => c))
      setProductId('')
      setVariants([]); setAssignedVariants(new Set()); setMeasurements({})
      ;(window as any).__uniformGroupClassIds = ids
    }
    void run()
  }, [selectedGroup, branchId])

  useEffect(() => {
    if (!productId || !selectedGroup || !supabase) { setVariants([]); setAssignedVariants(new Set()); return }
    const run = async () => {
      const [v,a] = await Promise.all([
        dbFrom('product_variants').select('id,product_id,sku,size_label,variant_name,status').eq('product_id',productId).eq('status','active').order('size_label'),
        dbFrom('variant_group_assignments').select('variant_id').eq('group_id',selectedGroup.id),
      ])
      if (v.error || a.error) { setError(v.error?.message || a.error?.message || 'Unable to load variants.'); return }
      setVariants(v.data || [])
      setAssignedVariants(new Set((a.data || []).map((x:any)=>x.variant_id)))
      const ids = (v.data || []).map((x:any)=>x.id)
      if (!ids.length) { setMeasurements({}); return }
      const m = await dbFrom('variant_measurements').select('*').in('variant_id',ids)
      if (m.error) { setError(m.error.message); return }
      const grouped: Record<string, Measurement[]> = {}
      for (const row of m.data || []) (grouped[row.variant_id] ||= []).push({
        ...row, min_value: row.min_value == null ? '' : String(row.min_value),
        ideal_value: row.ideal_value == null ? '' : String(row.ideal_value),
        max_value: row.max_value == null ? '' : String(row.max_value),
      })
      setMeasurements(grouped)
    }
    void run()
  }, [productId, selectedGroup])

  const toggleProduct = async (id:string, value:boolean) => {
    if (!selectedGroup || !branchId || !supabase) return
    setError('')
    const r = value
      ? await dbFrom('product_group_assignments').upsert({branch_id:branchId,product_id:id,group_id:selectedGroup.id},{onConflict:'branch_id,product_id,group_id'})
      : await dbFrom('product_group_assignments').delete().eq('branch_id',branchId).eq('product_id',id).eq('group_id',selectedGroup.id)
    if (r.error) setError(r.error.message)
    else setAssignedProducts(current => { const n=new Set(current); value?n.add(id):n.delete(id); return n })
  }

  const toggleVariant = async (id:string, value:boolean) => {
    if (!selectedGroup || !supabase) return
    setError('')
    const r = value
      ? await dbFrom('variant_group_assignments').upsert({variant_id:id,group_id:selectedGroup.id},{onConflict:'variant_id,group_id'})
      : await dbFrom('variant_group_assignments').delete().eq('variant_id',id).eq('group_id',selectedGroup.id)
    if (r.error) setError(r.error.message)
    else setAssignedVariants(current => { const n=new Set(current); value?n.add(id):n.delete(id); return n })
  }

  const saveMeasurements = async (variantId:string) => {
    if (!supabase || saving) return
    setSaving(true); setError('')
    const rows = (measurements[variantId] || []).filter(m=>m.measurement_type).map(m=>({
      ...(m.id ? {id:m.id}:{}), variant_id:variantId, measurement_type:m.measurement_type,
      min_value:m.min_value === '' ? null : Number(m.min_value),
      ideal_value:m.ideal_value === '' ? null : Number(m.ideal_value),
      max_value:m.max_value === '' ? null : Number(m.max_value),
      unit:m.unit || (m.measurement_type==='age'?'years':'cm')
    }))
    const existing = await dbFrom('variant_measurements').select('id').eq('variant_id',variantId)
    if (existing.error) { setError(existing.error.message); setSaving(false); return }
    const keep = new Set(rows.filter((x:any)=>x.id).map((x:any)=>x.id))
    const remove = (existing.data||[]).map((x:any)=>x.id).filter((id:string)=>!keep.has(id))
    if (remove.length) { const d=await dbFrom('variant_measurements').delete().in('id',remove); if(d.error){setError(d.error.message);setSaving(false);return} }
    if (rows.length) { const u=await dbFrom('variant_measurements').upsert(rows); if(u.error){setError(u.error.message);setSaving(false);return} }
    const m=await dbFrom('variant_measurements').select('*').eq('variant_id',variantId)
    if (m.error) setError(m.error.message)
    else setMeasurements(current=>({...current,[variantId]:(m.data||[]).map((row:any)=>({...row,min_value:row.min_value==null?'':String(row.min_value),ideal_value:row.ideal_value==null?'':String(row.ideal_value),max_value:row.max_value==null?'':String(row.max_value)}))}))
    setSaving(false)
  }

  const addMeasurement = (variantId:string) => {
    setMeasurements(current=>({...current,[variantId]:[...(current[variantId]||[]),{variant_id:variantId,measurement_type:'chest',min_value:'',ideal_value:'',max_value:'',unit:'cm'}]}))
  }

  const updateMeasurement = (variantId:string,index:number,key:string,value:string) => {
    setMeasurements(current=>({...current,[variantId]:(current[variantId]||[]).map((m,i)=>i===index?{...m,[key]:value}:m)}))
  }

  const groupClasses = selectedGroup ? classes.filter(c => groupClassIds.has(c.id)) : []

  return <div className="workspace-body">
    <div className="workspace-heading" style={{display:'flex',justifyContent:'space-between',gap:20}}>
      <div><h1>AI Uniform Setup</h1><p>Reusable school template: Early Years, Primary and Secondary, each split into Boys and Girls. Only assigned variants can be recommended.</p></div>
      <button className="secondary-button" onClick={()=>void loadBranches()}><RefreshCw size={15}/> Refresh</button>
    </div>
    {error && <div className="workspace-error">{error}</div>}
    {notice && <div className="workspace-note"><Check size={15}/> {notice}</div>}
    <section className="workspace-panel">
      <div className="workspace-toolbar">
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <label>Branch <select value={branchId} onChange={e=>{setBranchId(e.target.value);window.localStorage.setItem('admin:selectedBranchId',e.target.value)}}>{branches.map(b=><option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}</select></label>
          <button className="primary-button" onClick={()=>void initializeTemplate()} disabled={!schoolId || initializing}><WandSparkles size={15}/> {initializing?'Applying...':'Apply Standard School Template'}</button>
        </div>
      </div>
      {loading ? <div className="workspace-empty">Loading...</div> : <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:20}}>
        <div>
          <h3>Uniform Groups</h3>
          <div style={{display:'grid',gap:7}}>
            {groups.map(g=><button key={g.id} type="button" className={selectedGroup?.id===g.id?'primary-button':'secondary-button'} onClick={()=>setSelectedGroup(g)} style={{textAlign:'left'}}>
              <strong>{g.name}</strong><br/><small>{LEVELS[g.level_code]}</small>
            </button>)}
          </div>
          {!groups.length && <div className="workspace-empty">Apply the standard template to create the 6 reusable groups.</div>}
        </div>
        <div>
          {!selectedGroup ? <div className="workspace-empty">Select a group to configure it.</div> : <>
            <h2>{selectedGroup.name}</h2>
            <p><strong>Classes:</strong> {groupClasses.length ? groupClasses.map(c=>c.name).join(' · ') : 'Template not initialized for this group.'}</p>
            <h3>Eligible Products</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:8}}>
              {products.map(p=><label key={p.id} style={{display:'flex',gap:10,alignItems:'center',padding:10,border:'1px solid #e5e7eb',borderRadius:8}}>
                <input type="checkbox" checked={assignedProducts.has(p.id)} onChange={e=>void toggleProduct(p.id,e.target.checked)}/>
                <span style={{flex:1}}>{p.name}</span><small>{p.gender}</small>
              </label>)}
            </div>
            <div style={{marginTop:24}}>
              <label><strong>Product Variants for this Group</strong><select value={productId} onChange={e=>setProductId(e.target.value)} style={{marginLeft:10,minWidth:300}}>
                <option value="">Select an eligible product...</option>{products.filter(p=>assignedProducts.has(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select></label>
            </div>
            {productId && <div style={{marginTop:12}}>
              <p className="workspace-note">Check only the sizes that belong to <strong>{selectedGroup.name}</strong>. These variants are the only sizes the AI/store may use for this group.</p>
              {variants.map(v=><div key={v.id} className="workspace-note" style={{marginTop:8}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <input type="checkbox" checked={assignedVariants.has(v.id)} onChange={e=>void toggleVariant(v.id,e.target.checked)}/>
                  <strong style={{flex:1}}>{v.size_label || v.variant_name || v.sku}</strong><span>{v.sku}</span>
                </div>
                {assignedVariants.has(v.id) && <div style={{marginTop:10}}>
                  {(measurements[v.id]||[]).map((m,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'1.2fr .8fr .8fr .8fr .7fr auto',gap:6,marginTop:8,alignItems:'center'}}>
                    <select value={m.measurement_type} onChange={e=>updateMeasurement(v.id,i,'measurement_type',e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
                    <input type="number" value={m.min_value} onChange={e=>updateMeasurement(v.id,i,'min_value',e.target.value)} placeholder="Min"/>
                    <input type="number" value={m.ideal_value} onChange={e=>updateMeasurement(v.id,i,'ideal_value',e.target.value)} placeholder="Ideal"/>
                    <input type="number" value={m.max_value} onChange={e=>updateMeasurement(v.id,i,'max_value',e.target.value)} placeholder="Max"/>
                    <select value={m.unit} onChange={e=>updateMeasurement(v.id,i,'unit',e.target.value)}><option value="cm">cm</option><option value="in">in</option><option value="years">years</option></select>
                    <button className="secondary-button" onClick={()=>setMeasurements(c=>({...c,[v.id]:(c[v.id]||[]).filter((_,idx)=>idx!==i)}))}><Trash2 size={14}/></button>
                  </div>)}
                  <div style={{display:'flex',gap:8,marginTop:10}}><button className="secondary-button" onClick={()=>addMeasurement(v.id)}><Plus size={14}/> Measurement</button><button className="primary-button" onClick={()=>void saveMeasurements(v.id)} disabled={saving}><Save size={14}/> Save Size Chart</button></div>
                </div>}
              </div>)}
            </div>}
          </>}
        </div>
      </div>}
    </section>
  </div>
}
