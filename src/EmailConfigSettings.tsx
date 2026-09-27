import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { supabase } from './lib/supabase'

function Loading() {
  return (
    <div style={{ padding: '28px 8px', color: '#6d7780', fontSize: 13 }}>
      Loading email settings...
    </div>
  )
}

export default function EmailConfigSettings() {
  const [fromName, setFromName] = useState('School Uniforms')
  const [fromEmail, setFromEmail] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [smtpHost, setSmtpHost] = useState('smtp.zoho.com')
  const [smtpPort, setSmtpPort] = useState('465')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpSecure, setSmtpSecure] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    if (!supabase) return
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.functions.invoke('email-admin-settings', {
      method: 'GET',
    })
    if (error) setMessage(error.message)
    else {
      setFromName(data?.from_name || 'School Uniforms')
      setFromEmail(data?.from_email || '')
      setReplyTo(data?.reply_to || '')
      setSmtpHost(data?.smtp_host || 'smtp.zoho.com')
      setSmtpPort(String(data?.smtp_port || 465))
      setSmtpUser(data?.smtp_user || '')
      setSmtpSecure(data?.smtp_secure !== false)
      setConfigured(!!data?.smtp_password_configured)
      setEnabled(data?.enabled !== false)
    }
    setLoading(false)
  }

  async function save() {
    if (!supabase) return
    if (!fromEmail.trim()) {
      setMessage('From Email is required.')
      return
    }
    if (!smtpHost.trim()) {
      setMessage('SMTP Host is required.')
      return
    }
    if (!smtpUser.trim()) {
      setMessage('SMTP Username is required.')
      return
    }
    const port = Number(smtpPort)
    if (![465, 587].includes(port)) {
      setMessage('SMTP Port must be 465 or 587.')
      return
    }
    if (!configured && !smtpPassword.trim()) {
      setMessage('SMTP Password / App Password is required.')
      return
    }

    setSaving(true)
    setMessage('')
    const { data, error } = await supabase.functions.invoke('email-admin-settings', {
      method: 'POST',
      body: {
        provider: 'zoho_smtp',
        from_name: fromName.trim() || 'School Uniforms',
        from_email: fromEmail.trim(),
        reply_to: replyTo.trim() || undefined,
        smtp_host: smtpHost.trim(),
        smtp_port: port,
        smtp_user: smtpUser.trim(),
        smtp_password: smtpPassword.trim() || undefined,
        smtp_secure: port === 465 ? true : smtpSecure,
        enabled,
      },
    })

    if (error) setMessage(error.message)
    else if (data?.error) setMessage(data.error)
    else {
      setConfigured(!!data?.smtp_password_configured)
      setSmtpPassword('')
      setMessage('Zoho SMTP settings saved successfully.')
    }
    setSaving(false)
  }

  return (
    <section className="workspace-panel">
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="panel-heading">
            <div>
              <h2>Email Settings</h2>
              <p className="workspace-muted">
                Configure Zoho Mail SMTP for all application system emails. SMTP credentials are
                stored securely in Supabase Vault.
              </p>
            </div>
            <span
              className="workspace-status"
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '7px 10px',
                borderRadius: 999,
                background: configured && fromEmail ? '#eaf8ef' : '#fff5e6',
                color: configured && fromEmail ? '#16743a' : '#9a5a00',
              }}
            >
              {configured && fromEmail ? 'Configured' : 'Setup Required'}
            </span>
          </div>

          <div className="workspace-form-row">
            <label className="workspace-field">
              <span>Email Provider</span>
              <input value="Zoho SMTP" readOnly />
            </label>
            <label className="workspace-field">
              <span>From Name</span>
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="School Uniforms"
              />
            </label>
          </div>

          <div className="workspace-form-row">
            <label className="workspace-field">
              <span>From Email</span>
              <input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="orders@yourdomain.com"
                type="email"
              />
            </label>
            <label className="workspace-field">
              <span>Reply-To Email</span>
              <input
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="support@yourdomain.com"
                type="email"
              />
            </label>
          </div>

          <div className="workspace-form-row">
            <label className="workspace-field">
              <span>SMTP Host</span>
              <input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.zoho.com"
              />
            </label>
            <label className="workspace-field">
              <span>SMTP Port</span>
              <select value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)}>
                <option value="465">465 — SSL</option>
                <option value="587">587 — STARTTLS</option>
              </select>
            </label>
          </div>

          <div className="workspace-form-row">
            <label className="workspace-field">
              <span>SMTP Username</span>
              <input
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="your Zoho email address"
                autoComplete="username"
              />
            </label>
            <label className="workspace-field">
              <span>SMTP Password / App Password</span>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={configured ? '••••••••••••••••  (configured)' : 'Enter Zoho password'}
                autoComplete="new-password"
              />
            </label>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: '14px 0',
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
              disabled={smtpPort === '465'}
            />
            Use secure SMTP connection (SSL/TLS)
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: '14px 0',
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enable system emails
          </label>

          <div className="workspace-note">
            <strong>Zoho:</strong> Port 465 uses SSL. Port 587 uses STARTTLS. If your Zoho account
            has two-factor authentication enabled, use a Zoho application-specific password.
          </div>

          <div className="workspace-note" style={{ marginTop: 10 }}>
            <strong>Security:</strong> The SMTP password is never returned to the browser after
            saving. Leaving it blank keeps the stored password unchanged.
          </div>

          {message && (
            <div
              className={message.includes('successfully') ? 'workspace-note' : 'workspace-error'}
              style={{ marginTop: 12 }}
            >
              {message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="primary-button" disabled={saving} onClick={() => void save()}>
              <Save size={15} />
              {saving ? 'Saving...' : 'Save Email Settings'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
