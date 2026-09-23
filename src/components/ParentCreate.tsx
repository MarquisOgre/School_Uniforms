import { useState } from 'react'
import { LoaderCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ParentCreate({schoolId,branchId,onBack}:{schoolId:string;branchId:string;onBack:()=>void}) {
  const [parentName,setParentName]=useState('')
  const [loginId,setLoginId]=useState('')
  const [password,setPassword]=useState('')
  const [phone,setPhone]=useState('')
  const [studentCode,setStudentCode]=useState('')
  const [studentName,setStudentName]=useState('')
  const [dob,setDob]=useState('')
  const [className,setClassName]=useState('')
  const [section,setSection]=useState('')
  const [gender,setGender]=useState('boys')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [done,setDone]=useState(false)

  async function create() {
    if(!supabase||busy)return
    setBusy(true);setError('');setDone(false)
    const {data,error:e}=await supabase.functions.invoke('create-parent-login',{body:{
      school_id:schoolId,branch_id:branchId,parent_name:parentName,login_id:loginId,password,parent_phone:phone,
      student_code:studentCode,student_name:studentName,dob,class_name:className,section,gender
    }})
    if(e||!data?.success){setError(data?.error??e?.message??'Unable to create Parent Login.');setBusy(false);return}
    setDone(true);setBusy(false)
  }

  return <div className="admin-import-page"><div className="import-header"><div><p className="eyebrow">ADMIN • CREATE PARENT</p><h1>Create Parent Login</h1><p>Create one parent account and link it to a student.</p></div><button className="secondary-button" onClick={onBack}>Back</button></div>
    <div className="import-card"><div className="admin-form-grid">
      <label>Parent Name<input value={parentName} onChange={e=>setParentName(e.target.value)}/></label>
      <label>Parent Login ID<input value={loginId} onChange={e=>setLoginId(e.target.value.toUpperCase())}/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <label>Parent Phone<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Optional"/></label>
      <label>Student ID<input value={studentCode} onChange={e=>setStudentCode(e.target.value)}/></label>
      <label>Student Name<input value={studentName} onChange={e=>setStudentName(e.target.value)}/></label>
      <label>Date of Birth<input type="date" value={dob} onChange={e=>setDob(e.target.value)}/></label>
      <label>Class<input value={className} onChange={e=>setClassName(e.target.value)}/></label>
      <label>Section<input value={section} onChange={e=>setSection(e.target.value)}/></label>
      <label>Gender<select value={gender} onChange={e=>setGender(e.target.value)}><option value="boys">Boys</option><option value="girls">Girls</option><option value="unisex">Unisex</option></select></label>
    </div>
    {error&&<p className="login-error"><AlertCircle size={16}/>{error}</p>}
    {done&&<div className="result-card"><CheckCircle2 size={18}/><strong>Parent Login created successfully.</strong><span>Login ID: {loginId}</span><span>The parent is linked to student {studentCode}.</span></div>}
    <button className="primary-button import-button" disabled={busy||!parentName||!loginId||!password||!studentCode||!studentName||!dob} onClick={()=>void create()}>{busy?<><LoaderCircle className="spin" size={18}/> CREATING...</>:'CREATE PARENT LOGIN'}</button>
    </div></div>
}