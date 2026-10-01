import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { supabase } from './lib/supabase'

const dbFrom = (table: string): any => (supabase as any)?.from(table)

type ClassRow = { id: string; school_id: string; name: string; normalized_name: string; sort_order: number; status: string }
type ProductRow = { id: string; name: string; gender: string; status: string }
type VariantRow = { id: string; product_id: string; sku: string; size_label: string | null; variant_name: string | null; status: string }
type Measurement = { id?: string; variant_id: string; measurement_type: string; min_value: string; ideal_value: string; max_value: string; unit: string }

const TYPES = ['height','chest','waist','hip','shoulder','inseam','foot_length','age'] as const

export default function AIUniformSetup() {
  const [branches, setBranches] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [assigned, setAssigned] = useState<Set<string>>(new Set())
  const [productId, setProductId] = useState('')
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [measurements, setMeasurements] = useState<Record<string, Measurement[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newClass, setNewClass] = useState('')

  const schoolId = useMemo(() => branches.find((b) => b.id === branchId)?.school_id || '', [branches, branchId])

  const load = async () => {
    if (!supabase) return
    setLoading(true); setError('')
    const b = await dbFrom('branches').select('id,name,code,school_id,status').eq('status','active').order('name')
    if (b.error) { setError(b.error.message); setLoading(false); return }
    setBranches(b.data || [])
    const stored = window.localStorage.getItem('admin:selectedBranchId')
    const next = (b.data || []).some((x: any) => x.id === stored) ? stored : b.data?.[0]?.id || ''
    setBranchId(next)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!schoolId || !supabase) return
    const run = async () => {
      const [c,p] = await Promise.all([
        dbFrom('uniform_classes').select('*').eq('school_id',schoolId).order('sort_order').order('name'),
        dbFrom('products').select('id,name,gender,status').eq('status','active').order('name'),
      ])
      if (c.error || p.error) { setError(c.error?.message || p.error?.message || 'Unable to load setup data.'); return }
      setClasses(c.data || []); setProducts(p.data || [])
      if (!selectedClass || !c.data?.some((x: any) => x.id === selectedClass.id)) setSelectedClass(c.data?.[0] || null)
    }
    void run()
  }, [schoolId])

  useEffect(() => {
    if (!selectedClass || !branchId || !supabase) return
    const run = async () => {
      const [a,v] = await Promise.all([
        dbFrom('product_class_assignments').select('product_id').eq('branch_id',branchId).eq('class_id',selectedClass.id),
        productId ? dbFrom('product_variants').select('id,product_id,sku,size_label,variant_name,status').eq('product_id',productId).order('size_label') : Promise.resolve({data:[],error:null}),
      ])
      if (a.error || v.error) { setError(a.error?.message || v.error?.message || 'Unable to load mappings.'); return }
      setAssigned(new Set((a.data || []).map((x:any)=>x.product_id)))
      setVariants(v.data || [])
      if (v.data?.length) {
        const ids = v.data.map((x:any)=>x.id)
        const m = await dbFrom('variant_measurements').select('*').in('variant_id',ids)
        if (m.error) setError(m.error.message)
        const grouped: Record<string, Measurement[]> = {}
        for (const row of m.data || []) (grouped[row.variant_id] ||= []).push({
          ...row, min_value: row.min_value == null ? '' : String(row.min_value),
          ideal_value: row.ideal_value == null ? '' : String(row.ideal_value),
          max_value: row.max_value == null ? '' : String(row.max_value),
        })
        setMeasurements(grouped)
      } else setMeasurements({})
    }
    void run()
  }, [selectedClass, branchId, productId])

  const addClass = async () => {
    const name = newClass.trim()
    if (!name || !schoolId || !supabase) return
    const r = await dbFrom('uniform_classes').insert({
      school_id: schoolId, name, normalized_name: name.toLowerCase().replace(/[^a-z0-9]+/g,''), sort_order: classes.length, status:'active'
    }).select('*').single()
    if (r.error) setError(r.error.message)
    else { setClasses((x)=>[...x,r.data]); setSelectedClass(r.data); setNewClass('') }
  }

  const toggleProduct = async (id:string, value:boolean) => {
    if (!selectedClass || !branchId || !supabase) return
    setError('')
    const r = value
      ? await dbFrom('product_class_assignments').upsert({branch_id:branchId,product_id:id,class_id:selectedClass.id},{onConflict:'branch_id,product_id,class_id'})
      : await dbFrom('product_class_assignments').delete().eq('branch_id',branchId).eq('product_id',id).eq('class_id',selectedClass.id)
    if (r.error) setError(r.error.message)
    else setAssigned((current)=>{const n=new Set(current); value?n.add(id):n.delete(id); return n})
  }

  const saveMeasurements = async (variantId:string) => {
    if (!supabase || saving) return
    setSaving(true); setError('')
    const rows = (measurements[variantId] || []).filter((m)=>m.measurement_type).map((m)=>({
      ...(m.id ? {id:m.id}:{ }),
      variant_id:variantId, measurement_type:m.measurement_type,
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
    setSaving(false)
    const m=await dbFrom('variant_measurements').select('*').eq('variant_id',variantId)
    const grouped={...measurements}; grouped[variantId]=(m.data||[]).map((row:any)=>({...row,min_value:row.min_value==null?'':String(row.min_value),ideal_value:row.ideal_value==null?'':String(row.ideal_value),max_value:row.max_value==null?'':String(row.max_value)})); setMeasurements(grouped)
  }

  const addMeasurement = (variantId:string) => {
    setMeasurements((current)=>({...current,[variantId]:[...(current[variantId]||[]),{variant_id:variantId,measurement_type:'chest',min_value:'',ideal_value:'',max_value:'',unit:'cm'}]}))
  }

  const updateMeasurement = (variantId:string,index:number,key:string,value:string) => {
    setMeasurements((current)=>({...current,[variantId]:(current[variantId]||[]).map((m,i)=>i===index?{...m,[key]:value}:m)}))
  }

  return <div className="workspace-body">
    <div className="workspace-heading" style={{display:'flex',justifyContent:'space-between',gap:20}}>
      <div><h1>AI Uniform Setup</h1><p>Configure class eligibility and real measurement ranges used by the AI assistant. Nothing is guessed.</p></div>
      <button className="secondary-button" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button>
    </div>
    {error && <div className="workspace-error">{error}</div>}
    <section className="workspace-panel">
      <div className="workspace-toolbar">
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <label>Branch <select value={branchId} onChange={e=>{setBranchId(e.target.value);window.localStorage.setItem('admin:selectedBranchId',e.target.value)}}>{branches.map(b=><option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}</select></label>
          <input value={newClass} onChange={e=>setNewClass(e.target.value)} placeholder="New class e.g. Class 5"/>
          <button className="primary-button" onClick={()=>void addClass()} disabled={!newClass.trim()}><Plus size={15}/> Add Class</button>
        </div>
      </div>
      {loading ? <div className="workspace-empty">Loading...</div> : <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:20}}>
        <div>
          <h3>Classes</h3>
          <div style={{display:'grid',gap:6}}>{classes.map(c=><button key={c.id} type="button" className={selectedClass?.id===c.id?'primary-button':'secondary-button'} onClick={()=>{setSelectedClass(c);setProductId('')}} style={{textAlign:'left'}}>{c.name}</button>)}</div>
          {!classes.length && <div className="workspace-empty">No classes configured.</div>}
        </div>
        <div>
          {!selectedClass ? <div className="workspace-empty">Add a class to begin.</div> : <>
            <h3>{selectedClass.name} — Eligible Products</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:8}}>
              {products.map(p=><label key={p.id} style={{display:'flex',gap:10,alignItems:'center',padding:10,border:'1px solid #e5e7eb',borderRadius:8}}>
                <input type="checkbox" checked={assigned.has(p.id)} onChange={e=>void toggleProduct(p.id,e.target.checked)}/>
                <span style={{flex:1}}>{p.name}</span><small>{p.gender}</small>
              </label>)}
            </div>
            <div style={{marginTop:24}}>
              <label><strong>Configure Size Chart</strong><select value={productId} onChange={e=>setProductId(e.target.value)} style={{marginLeft:10,minWidth:280}}>
                <option value="">Select a product...</option>{products.filter(p=>assigned.has(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select></label>
            </div>
            {productId && variants.map(v=><div key={v.id} className="workspace-note" style={{marginTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                <strong>{v.size_label || v.variant_name || v.sku}</strong><span>{v.sku}</span>
              </div>
              {(measurements[v.id]||[]).map((m,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'1.2fr .8fr .8fr .8fr .7fr auto',gap:6,marginTop:8,alignItems:'center'}}>
                <select value={m.measurement_type} onChange={e=>updateMeasurement(v.id,i,'measurement_type',e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
                <input type="number" value={m.min_value} onChange={e=>updateMeasurement(v.id,i,'min_value',e.target.value)} placeholder="Min"/>
                <input type="number" value={m.ideal_value} onChange={e=>updateMeasurement(v.id,i,'ideal_value',e.target.value)} placeholder="Ideal"/>
                <input type="number" value={m.max_value} onChange={e=>updateMeasurement(v.id,i,'max_value',e.target.value)} placeholder="Max"/>
                <select value={m.unit} onChange={e=>updateMeasurement(v.id,i,'unit',e.target.value)}><option value="cm">cm</option><option value="in">in</option><option value="years">years</option></select>
                <button className="secondary-button" onClick={()=>setMeasurements(c=>({...c,[v.id]:(c[v.id]||[]).filter((_,idx)=>idx!==i)}))}><Trash2 size={14}/></button>
              </div>)}
              <div style={{display:'flex',gap:8,marginTop:10}}><button className="secondary-button" onClick={()=>addMeasurement(v.id)}><Plus size={14}/> Measurement</button><button className="primary-button" onClick={()=>void saveMeasurements(v.id)} disabled={saving}><Save size={14}/> Save Size Chart</button></div>
            </div>)}
          </>}
        </div>
      </div>}
    </section>
  </div>
}
