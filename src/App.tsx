import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import HomePage from './HomePage'
import AppPortal, { type CustomerPage } from './AppPortal'
import AdminPortal from './AdminPortal'

type PortalMode='home'|'store'|'admin'

function App(){
  const [mode,setMode]=useState<PortalMode>('home')
  const [school,setSchool]=useState(''),[branch,setBranch]=useState(''),[studentId,setStudentId]=useState('')
  const [schoolName,setSchoolName]=useState('Your School'),[branchName,setBranchName]=useState('Your Branch')
  const [customerPage,setCustomerPage]=useState<CustomerPage>('dashboard'),[sessionRestoring,setSessionRestoring]=useState(true)

  useEffect(()=>{
    if(!supabase){setSessionRestoring(false);return}
    let cancelled=false
    async function restore(){
      const {data}=await supabase.auth.getSession()
      if(cancelled)return
      const path=window.location.pathname
      if(data.session&&path.startsWith('/admin')){
        const {data:profile}=await supabase.from('profiles').select('role').eq('id',data.session.user.id).maybeSingle()
        if(profile&&['admin','super_admin'].includes(profile.role)){setMode('admin');setSessionRestoring(false);return}
      }
      if(data.session&&path.startsWith('/app')){
        const stored=localStorage.getItem('school_uniform_portal_context')
        if(stored){try{const ctx=JSON.parse(stored);if(ctx?.mode==='store'&&ctx.school&&ctx.branch){setSchool(ctx.school);setBranch(ctx.branch);setStudentId(ctx.studentId||'');setSchoolName(ctx.schoolName||'Your School');setBranchName(ctx.branchName||'Your Branch');const page=path==='/app/packages'?'packages':path==='/app/products'?'products':path==='/app/orders'?'orders':path==='/app/profile'?'profile':'dashboard';setCustomerPage(page);setMode('store');setSessionRestoring(false);return}}catch{localStorage.removeItem('school_uniform_portal_context')}}
      }
      if(path!=='/')window.history.replaceState({},'', '/')
      setMode('home');setSessionRestoring(false)
    }
    void restore();return()=>{cancelled=true}
  },[])

  if(sessionRestoring)return <div className="session-loading"><img src="/logo.png" alt="Artisan"/><span>Restoring your session...</span></div>
  if(mode==='store')return <AppPortal schoolId={school} schoolName={schoolName} branchName={branchName} branchId={branch} studentId={studentId} page={customerPage} setPage={setCustomerPage} onLogout={()=>{void supabase?.auth.signOut({scope:'local'});localStorage.removeItem('school_uniform_portal_context');window.history.replaceState({},'', '/');setMode('home')}}/>
  if(mode==='admin')return <AdminPortal onBack={()=>{window.history.replaceState({},'', '/');setMode('home')}}/>
  return <HomePage onLoginSuccess={(s,b,id,sn,bn)=>{setSchool(s);setBranch(b);setStudentId(id);setSchoolName(sn);setBranchName(bn);setCustomerPage('dashboard');window.history.pushState({schoolUniformApp:'customer',screen:'page:dashboard',page:'dashboard'},'', '/app');setMode('store')}} onAdmin={()=>setMode('admin')}/>
}

export default App
