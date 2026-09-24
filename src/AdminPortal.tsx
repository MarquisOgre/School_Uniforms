import { useEffect, useState } from 'react'
import type React from 'react'
import { ArrowRight, BookOpen, Building2, CreditCard, FileSpreadsheet, Home, Package, ShoppingBag, Sparkles, UserRound, ClipboardList } from 'lucide-react'
import { supabase } from './lib/supabase'
import AdminWorkspace from './AdminWorkspace'
import ParentCreate from './components/ParentCreate'
import StudentImport from './components/StudentImport'
import { GlobalHeader, GlobalFooter } from './components/GlobalChrome'
import { DEFAULT_HOME } from './HomePage'

type SchoolOption={id:string;name:string}
type BranchOption={id:string;name:string}

function AdminModuleActive({icon,title,text,onClick}:{icon:React.ReactNode;title:string;text:string;onClick:()=>void}){return <button className="admin-module admin-module-active" onClick={onClick}><div className="feature-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><ArrowRight/></button>}

function AdminPortal({onBack}:{onBack:()=>void}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[admin,setAdmin]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('')
  const [schools,setSchools]=useState<SchoolOption[]>([]),[branches,setBranches]=useState<BranchOption[]>([]),[school,setSchool]=useState(''),[branch,setBranch]=useState(''),[tool,setTool]=useState<'menu'|'parent'|'import'|'home'|'schools'|'products'|'packages'|'orders'|'payments'|'inventory'|'students'|'reports'|'catalog'|'coupons'>('menu')
  useEffect(()=>{
    const onPopState=(event:PopStateEvent)=>{
      if(!window.location.pathname.startsWith('/admin')){
        onBack()
        return
      }
      const state=event.state
      if(state?.schoolUniformApp==='admin'){setTool(state.tool||'menu');return}
      setTool('menu')
      window.history.replaceState({schoolUniformApp:'admin',tool:'menu'},'', '/admin')
    }
    window.addEventListener('popstate',onPopState)
    return()=>window.removeEventListener('popstate',onPopState)
  },[onBack])
  useEffect(()=>{
    if(!window.location.pathname.startsWith('/admin'))return
    if(window.history.state?.schoolUniformApp==='admin'&&window.history.state?.tool===tool)return
    window.history.pushState({schoolUniformApp:'admin',tool},'', '/admin')
  },[tool])
  async function login(){const client=supabase;if(!client||!email.trim()||!password)return;setLoading(true);setError('');const {data,error}=await client.auth.signInWithPassword({email:email.trim(),password});if(error||!data.user){setError('Invalid admin email or password.');setLoading(false);return}const {data:p,error:pe}=await client.from('profiles').select('role').eq('id',data.user.id).single();if(pe||!p||!['admin','super_admin'].includes(p.role)){await client.auth.signOut({scope:'local'});setError('This account is not authorized for the Admin Portal.');setLoading(false);return}setAdmin(true);setLoading(false)}
  useEffect(()=>{const client=supabase;if(!client)return;void client.auth.getSession().then(async ({data})=>{if(!data.session)return;const {data:p}=await client.from('profiles').select('role').eq('id',data.session.user.id).maybeSingle();if(p&&['admin','super_admin'].includes(p.role))setAdmin(true)})},[])
  useEffect(()=>{const client=supabase;if(!admin||!client)return;void client.from('schools').select('id,name').eq('status','active').order('name').then(({data})=>setSchools(data??[]))},[admin])
  async function chooseSchool(v:string){setSchool(v);setBranch('');setBranches([]);const client=supabase;if(!v||!client)return;const {data}=await client.from('branches').select('id,name').eq('school_id',v).eq('status','active').order('name');setBranches(data??[])}
  if(!admin)return <div className="admin-login-page"><GlobalHeader portal="admin" title="Admin Portal" subtitle="Administrator Sign In" onBack={onBack} backLabel="Back"/><div className="admin-login-card"><div className="admin-login-logo"><img src="/logo.png" alt="Artisan"/></div><p className="eyebrow">ADMINISTRATION</p><h1>Administrator Sign In</h1><p>Manage schools, students, catalogs and orders from the secure admin portal.</p><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@gmail.com" autoComplete="username"/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void login()}} autoComplete="current-password"/>{error&&<p className="login-error">{error}</p>}<button className="primary-button" onClick={()=>void login()} disabled={loading||!email||!password}>{loading?'SIGNING IN...':'ADMIN LOGIN'}</button></div><GlobalFooter portal="admin"/></div>
  if(tool==='parent'&&school&&branch)return <ParentCreate schoolId={school} branchId={branch} onBack={()=>setTool('menu')}/>
  if(tool==='import'&&school&&branch)return <StudentImport schoolId={school} branchId={branch} onBack={()=>setTool('menu')}/>
  if(tool==='home')return <HomepageEditor onBack={()=>setTool('menu')}/>
  if(tool==='schools'||tool==='products'||tool==='packages'||tool==='orders'||tool==='payments'||tool==='inventory'||tool==='students'||tool==='reports'||tool==='catalog'||tool==='coupons')return <AdminWorkspace module={tool} onBack={()=>setTool('menu')}/>
  return <div className="admin-shell"><GlobalHeader portal="admin" title="Admin Dashboard" subtitle="School Uniform Store" onLogout={()=>{void supabase?.auth.signOut({scope:'local'});localStorage.removeItem('school_uniform_admin_context');setAdmin(false)}}/><div className="admin-content"><div className="admin-title"><div><p className="eyebrow">ADMIN DASHBOARD</p><h1>Student & Parent Management</h1><p>Create test accounts individually or import your student register in bulk.</p></div></div><div className="admin-scope-card"><div><span>School</span><strong>{schools.find(x=>x.id===school)?.name??'Select school'}</strong></div><div><span>Branch</span><strong>{branches.find(x=>x.id===branch)?.name??'Select branch'}</strong></div></div><div className="admin-selector-grid"><label>School<select value={school} onChange={e=>void chooseSchool(e.target.value)}><option value="">Select school</option>{schools.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Branch<select value={branch} disabled={!school} onChange={e=>{setBranch(e.target.value);setTool('menu')}}><option value="">Select branch</option>{branches.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div><div className="admin-action-grid"><button onClick={()=>setTool('home')}><Home/><div><strong>Homepage Editor</strong><span>Control hero, sections, images, text and footer.</span></div><ArrowRight/></button><button disabled={!school||!branch} onClick={()=>setTool('parent')}><UserRound/><div><strong>Create Parent Login</strong><span>Create one parent + student account for testing.</span></div><ArrowRight/></button><button disabled={!school||!branch} onClick={()=>setTool('import')}><FileSpreadsheet/><div><strong>Bulk Student Import</strong><span>Upload Excel or CSV student records.</span></div><ArrowRight/></button></div><div className="admin-module-grid"><AdminModuleActive icon={<Building2/>} title="Schools & Branches" text="Manage school campuses and branch details." onClick={()=>setTool('schools')}/><AdminModuleActive icon={<ShoppingBag/>} title="Products & Variants" text="Manage shirts, pants, shoes, sizes and SKUs." onClick={()=>setTool('products')}/><AdminModuleActive icon={<Package/>} title="Uniform Packages" text="Build boys and girls packages from individual products." onClick={()=>setTool('packages')}/><AdminModuleActive icon={<ClipboardList/>} title="Orders" text="Review orders, statuses and customer details." onClick={()=>setTool('orders')}/><AdminModuleActive icon={<CreditCard/>} title="Payments" text="Track payment status and transaction references." onClick={()=>setTool('payments')}/><AdminModuleActive icon={<ClipboardList/>} title="Inventory" text="Monitor stock and inventory movements." onClick={()=>setTool('inventory')}/><AdminModuleActive icon={<UserRound/>} title="Parents & Students" text="Manage student profiles and parent relationships." onClick={()=>setTool('students')}/><AdminModuleActive icon={<FileSpreadsheet/>} title="Reports" text="Sales, inventory and school-level reporting." onClick={()=>setTool('reports')}/><AdminModuleActive icon={<BookOpen/>} title="Catalog Rules" text="Configure school-specific products and pricing." onClick={()=>setTool('catalog')}/><AdminModuleActive icon={<Sparkles/>} title="Coupons" text="Manage branch-specific promotions and discounts." onClick={()=>setTool('coupons')}/></div></div>
    <GlobalFooter portal="admin"/>
  </div>
}



function CmsToggle({enabled,onChange,label='Enabled'}:{enabled?:boolean;onChange:(value:boolean)=>void;label?:string}){
  return <label className="cms-toggle"><span>{label}</span><button type="button" role="switch" aria-checked={enabled!==false} className={enabled!==false?'on':''} onClick={()=>onChange(enabled===false)}><span/></button></label>
}

function CmsSectionHeading({title,enabled,onChange}:{title:string;enabled?:boolean;onChange:(value:boolean)=>void}){
  return <div className="cms-section-heading"><h2>{title}</h2><CmsToggle enabled={enabled} onChange={onChange} label={enabled===false?'Disabled':'Enabled'}/></div>
}

function HomepageEditor({onBack}:{onBack:()=>void}){
  const [content,setContent]=useState<any>(DEFAULT_HOME),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('')
  useEffect(()=>{const client=supabase;if(!client)return;void (client as any).from('homepage_content').select('content').eq('slug','default').maybeSingle().then(({data,error}:{data:any;error:any})=>{if(error)setError(error.message);else if(data?.content)setContent((prev:any)=>({...prev,...data.content,sections:{...prev.sections,...(data.content.sections||{})}}))})},[])
  const save=async()=>{const client=supabase;if(!client)return;setSaving(true);setError('');setSaved(false);const {data:user}=await client.auth.getUser();const {error:e}=await (client as any).from('homepage_content').update({content,updated_by:user.user?.id,updated_at:new Date().toISOString()}).eq('slug','default');if(e)setError(e.message);else setSaved(true);setSaving(false)}
  const edit=(fn:(c:any)=>void)=>setContent((prev:any)=>{const n=structuredClone(prev);fn(n);return n})
  return <div className="admin-shell">
    <GlobalHeader portal="admin" title="Admin Portal" subtitle="Homepage Editor" onBack={onBack} backLabel="Dashboard"/>
    <div className="admin-content">
      <div className="admin-title"><div><p className="eyebrow">HOMEPAGE CMS</p><h1>Control the entire public homepage</h1><p>All homepage copy, imagery URLs, ordering and visibility are stored in Supabase.</p></div><button className="primary-button cms-save-button" onClick={()=>void save()} disabled={saving}>{saving?'SAVING...':'SAVE HOMEPAGE'}</button></div>
      {saved&&<p className="form-success">Homepage saved successfully.</p>}{error&&<p className="login-error">{error}</p>}

      <section className="home-edit-section ">
        <CmsSectionHeading title="Hero Slider" enabled={content.sections?.hero!==false} onChange={v=>edit(c=>{c.sections=c.sections||{};c.sections.hero=v})}/>
        {content.hero.slides.map((x:any,i:number)=><div className="home-edit-card" key={i}>
          <div className="cms-item-heading"><h3>Slide {i+1}</h3><CmsToggle enabled={x.enabled} onChange={v=>edit(c=>c.hero.slides[i].enabled=v)} label={x.enabled===false?'Disabled':'Enabled'}/></div>
          <label>Eyebrow<input value={x.eyebrow||''} onChange={e=>edit(c=>c.hero.slides[i].eyebrow=e.target.value)}/></label>
          <label>Title line 1<input value={x.title?.[0]||''} onChange={e=>edit(c=>c.hero.slides[i].title[0]=e.target.value)}/></label>
          <label>Title line 2<input value={x.title?.[1]||''} onChange={e=>edit(c=>c.hero.slides[i].title[1]=e.target.value)}/></label>
          <label>Title line 3<input value={x.title?.[2]||''} onChange={e=>edit(c=>c.hero.slides[i].title[2]=e.target.value)}/></label>
          <label>Description<textarea value={x.text||''} onChange={e=>edit(c=>c.hero.slides[i].text=e.target.value)}/></label>
          <label>Image URL<input value={x.image||''} onChange={e=>edit(c=>c.hero.slides[i].image=e.target.value)}/></label>
          <label>Primary button<input value={x.button||''} onChange={e=>edit(c=>c.hero.slides[i].button=e.target.value)}/></label>
          <label>Secondary button<input value={x.secondary||''} onChange={e=>edit(c=>c.hero.slides[i].secondary=e.target.value)}/></label>
        </div>)}
      </section>

      <section className="home-edit-section">
        <CmsSectionHeading title="Trust Strip" enabled={content.sections?.trust!==false} onChange={v=>edit(c=>{c.sections=c.sections||{};c.sections.trust=v})}/>
        {content.trust.items?content.trust.items.map((x:any,i:number)=><div className="home-edit-row" key={i}><CmsToggle enabled={x.enabled} onChange={v=>edit(c=>c.trust.items[i].enabled=v)}/><label>Title<input value={x.title||''} onChange={e=>edit(c=>c.trust.items[i].title=e.target.value)}/></label><label>Text<input value={x.text||''} onChange={e=>edit(c=>c.trust.items[i].text=e.target.value)}/></label></div>):content.trust.map((x:any,i:number)=><div className="home-edit-row" key={i}><CmsToggle enabled={x.enabled} onChange={v=>edit(c=>c.trust[i].enabled=v)}/><label>Title<input value={x.title||''} onChange={e=>edit(c=>c.trust[i].title=e.target.value)}/></label><label>Text<input value={x.text||''} onChange={e=>edit(c=>c.trust[i].text=e.target.value)}/></label></div>)}
      </section>

      <section className="home-edit-section">
        <CmsSectionHeading title="Shop by Category" enabled={content.sections?.categories!==false} onChange={v=>edit(c=>{c.sections=c.sections||{};c.sections.categories=v})}/>
        {content.categories.map((x:any,i:number)=><div className="home-edit-row" key={i}><CmsToggle enabled={x.enabled} onChange={v=>edit(c=>c.categories[i].enabled=v)}/><label>Title<input value={x.title||''} onChange={e=>edit(c=>c.categories[i].title=e.target.value)}/></label><label>Image URL<input value={x.image||''} onChange={e=>edit(c=>c.categories[i].image=e.target.value)}/></label><label>Target<input value={x.target||''} onChange={e=>edit(c=>c.categories[i].target=e.target.value)}/></label></div>)}
      </section>

      <section className="home-edit-section">
        <CmsSectionHeading title="Featured Collections" enabled={content.sections?.featured!==false} onChange={v=>edit(c=>{c.sections=c.sections||{};c.sections.featured=v})}/>
        {content.featured.map((x:any,i:number)=><div className="home-edit-card" key={i}><div className="cms-item-heading"><h3>Collection {i+1}</h3><CmsToggle enabled={x.enabled} onChange={v=>edit(c=>c.featured[i].enabled=v)} label={x.enabled===false?'Disabled':'Enabled'}/></div><label>Title<input value={x.title||''} onChange={e=>edit(c=>c.featured[i].title=e.target.value)}/></label><label>Description<textarea value={x.text||''} onChange={e=>edit(c=>c.featured[i].text=e.target.value)}/></label><label>Image URL<input value={x.image||''} onChange={e=>edit(c=>c.featured[i].image=e.target.value)}/></label><label>Target<input value={x.target||''} onChange={e=>edit(c=>c.featured[i].target=e.target.value)}/></label></div>)}
      </section>

      <section className="home-edit-section">
        <CmsSectionHeading title="After-Fold Feature" enabled={content.sections?.afterFold!==false} onChange={v=>edit(c=>{c.sections=c.sections||{};c.sections.afterFold=v})}/>
        <label>Eyebrow<input value={content.afterFold?.eyebrow||''} onChange={e=>edit(c=>c.afterFold.eyebrow=e.target.value)}/></label>
        <label>Title line 1<input value={content.afterFold?.title?.[0]||''} onChange={e=>edit(c=>c.afterFold.title[0]=e.target.value)}/></label>
        <label>Title line 2<input value={content.afterFold?.title?.[1]||''} onChange={e=>edit(c=>c.afterFold.title[1]=e.target.value)}/></label>
        <label>Text<textarea value={content.afterFold?.text||''} onChange={e=>edit(c=>c.afterFold.text=e.target.value)}/></label>
        <label>Image URL<input value={content.afterFold?.image||''} onChange={e=>edit(c=>c.afterFold.image=e.target.value)}/></label>
        <label>Button<input value={content.afterFold?.button||''} onChange={e=>edit(c=>c.afterFold.button=e.target.value)}/></label>
      </section>

      <section className="home-edit-section">
        <CmsSectionHeading title="Benefits Strip" enabled={content.sections?.benefits!==false} onChange={v=>edit(c=>{c.sections=c.sections||{};c.sections.benefits=v})}/>
        {content.benefits.map((x:any,i:number)=><div className="home-edit-row" key={i}><CmsToggle enabled={x.enabled} onChange={v=>edit(c=>c.benefits[i].enabled=v)}/><label>Title<input value={x.title||''} onChange={e=>edit(c=>c.benefits[i].title=e.target.value)}/></label><label>Text<input value={x.text||''} onChange={e=>edit(c=>c.benefits[i].text=e.target.value)}/></label></div>)}
      </section>

      <section className="home-edit-section">
        <CmsSectionHeading title="Call to Action" enabled={content.sections?.cta!==false} onChange={v=>edit(c=>{c.sections=c.sections||{};c.sections.cta=v})}/>
        <label>Eyebrow<input value={content.cta?.eyebrow||''} onChange={e=>edit(c=>c.cta.eyebrow=e.target.value)}/></label>
        <label>Title line 1<input value={content.cta?.title?.[0]||''} onChange={e=>edit(c=>c.cta.title[0]=e.target.value)}/></label>
        <label>Title line 2<input value={content.cta?.title?.[1]||''} onChange={e=>edit(c=>c.cta.title[1]=e.target.value)}/></label>
        <label>Button<input value={content.cta?.button||''} onChange={e=>edit(c=>c.cta.button=e.target.value)}/></label>
      </section>

      <section className="home-edit-section">
        <CmsSectionHeading title="Footer" enabled={content.sections?.footer!==false} onChange={v=>edit(c=>{c.sections=c.sections||{};c.sections.footer=v})}/>
        {['tagline','copyright','credit','secondary'].map((k:string)=><label key={k}>{k}<input value={content.footer?.[k]||''} onChange={e=>edit(c=>c.footer[k]=e.target.value)}/></label>)}
      </section>
    </div>
    <GlobalFooter portal="admin"/>
  </div>
}


export default AdminPortal
