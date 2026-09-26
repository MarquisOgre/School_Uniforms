import { useEffect, useState } from 'react'
import { Mail, Save } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function EmailConfigSettings() {
  const [fromName,setFromName]=useState('School Uniforms')
  const [fromEmail,setFromEmail]=useState('')
  const [replyTo,setReplyTo]=useState('')
  const [apiKey,setApiKey]=useState('')
  const [configured,setConfigured]=useState(false)
  const [enabled,setEnabled]=useState(true)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')

  useEffect(()=>{ void load() },[])
  async function load(){
    if(!supabase)return
    setLoading(true); setMessage('')
    const {data,error}=await supabase.functions.invoke('email-admin-settings',{method:'GET'})
    if(error)setMessage(error.message)
    else {
      setFromName(data?.from_name || 'School Uniforms')
      setFromEmail(data?.from_email || '')
      setReplyTo(data?.reply_to || '')
      setConfigured(!!data?.api_key_configured)
      setEnabled(data?.enabled !== false)
    }
    setLoading(false)
  }
  async function save(){
    if(!supabase)return
    if(!fromEmail.trim()){setMessage('From Email is required.');return}
    setSaving(true);setMessage('')
    const {data,error}=await supabase.functions.invoke('email-admin-settings',{
      method:'POST',
      body:{provider:'resend',from_name:fromName.trim()||'School Uniforms',from_email:fromEmail.trim(),reply_to:replyTo.trim()||undefined,api_key:apiKey.trim()||undefined,enabled}
    })
    if(error)setMessage(error.message)
    else if(data?.error)setMessage(data.error)
    else {setConfigured(!!data?.api_key_configured);setApiKey('');setMessage('Email settings saved successfully.')}
    setSaving(false)
  }
  return <Panel title="Email Settings" icon={<Mail size={16}/>}>
    {loading ? <Loading/> : <>
      <div className="panel-heading">
        <div>
          <h2>Email Settings</h2>
          <p className="workspace-muted">Configure Resend for all system emails. The API key is stored securely in Supabase Vault.</p>
        </div>
        <span className="workspace-status" style={{fontSize:10,fontWeight:800,padding:'7px 10px',borderRadius:999,background:configured&&fromEmail?'#eaf8ef':'#fff5e6',color:configured&&fromEmail?'#16743a':'#9a5a00'}}>
          {configured&&fromEmail?'Configured':'Setup Required'}
        </span>
      </div>
      <div className="workspace-form-row">
        <Select label="Email Provider" value="resend" options={['resend']} labels={{resend:'Resend'}} onChange={()=>{}}/>
        <Field label="From Name" value={fromName} onChange={setFromName} placeholder="School Uniforms"/>
      </div>
      <div className="workspace-form-row">
        <Field label="From Email" value={fromEmail} onChange={setFromEmail} placeholder="orders@yourdomain.com"/>
        <Field label="Reply-To Email" value={replyTo} onChange={setReplyTo} placeholder="support@yourdomain.com"/>
      </div>
      <label className="workspace-field">
        <span>Resend API Key</span>
        <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={configured?'••••••••••••••••  (configured)':'re_...'} autoComplete="new-password"/>
      </label>
      <label style={{display:'flex',alignItems:'center',gap:10,margin:'14px 0',fontWeight:700}}>
        <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>
        Enable system emails
      </label>
      <div className="workspace-note"><strong>Security:</strong> The Resend API key is never returned to the browser after saving. Leaving it blank keeps the stored key unchanged.</div>
      {message && <div className={message.includes('successfully')?'workspace-note':'workspace-error'} style={{marginTop:12}}>{message}</div>}
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
        <button className="primary-button" disabled={saving} onClick={()=>void save()}><Save size={15}/>{saving?'Saving...':'Save Email Settings'}</button>
      </div>
    </>}
  </Panel>
}
