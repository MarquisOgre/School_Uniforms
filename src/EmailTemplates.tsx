import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Eye, Mail, Pencil, Plus, Save, X } from 'lucide-react'
import { supabase } from './lib/supabase'

type EmailTemplate = {
  id: string
  template_key: string
  name: string
  description: string | null
  subject: string
  html_body: string
  text_body: string | null
  variables: string[]
  enabled: boolean
  updated_at: string
}

const EMPTY: Omit<EmailTemplate, 'id' | 'updated_at'> = {
  template_key: '',
  name: '',
  description: '',
  subject: '',
  html_body:
    '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px"><h1>{{site_name}}</h1><p>Hello {{customer_name}},</p><p>Your message goes here.</p></div>',
  text_body: 'Hello {{customer_name}},\n\nYour message goes here.',
  variables: ['site_name', 'customer_name'],
  enabled: true,
}

function replacePreview(value: string, variables: string[]) {
  const sample: Record<string, string> = {
    site_name: 'School Uniforms',
    customer_name: 'Parent',
    login_url: '#',
    reset_url: '#',
    order_number: 'SU-10001',
    order_total: '₹2,499',
    order_url: '#',
    refund_amount: '₹1,000',
  }
  return variables.reduce(
    (result, key) => result.replaceAll('{{' + key + '}}', sample[key] || '[' + key + ']'),
    value,
  )
}

export default function EmailTemplates() {
  const [rows, setRows] = useState<EmailTemplate[]>([])
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [filter, setFilter] = useState('')

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error: e } = await supabase
      .from('email_templates')
      .select(
        'id,template_key,name,description,subject,html_body,text_body,variables,enabled,updated_at',
      )
      .order('name')
    if (e) setError(e.message)
    else setRows((data || []) as EmailTemplate[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(
    () =>
      rows.filter((x) =>
        (x.name + ' ' + x.template_key).toLowerCase().includes(filter.toLowerCase()),
      ),
    [rows, filter],
  )

  const startNew = () => {
    setError('')
    setPreview(false)
    setEditing({ ...EMPTY, id: '', updated_at: '' })
  }

  const save = async () => {
    if (!supabase || !editing) return
    if (!editing.template_key.trim() || !editing.name.trim() || !editing.subject.trim()) {
      setError('Template key, template name and subject are required.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      template_key: editing.template_key
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_'),
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      subject: editing.subject,
      html_body: editing.html_body,
      text_body: editing.text_body || null,
      variables: Array.from(new Set(editing.variables.map((x) => x.trim()).filter(Boolean))),
      enabled: editing.enabled,
      updated_at: new Date().toISOString(),
    }
    const query = editing.id
      ? supabase.from('email_templates').update(payload).eq('id', editing.id)
      : supabase.from('email_templates').insert(payload)
    const { error: e } = await query
    if (e) setError(e.message)
    else {
      setEditing(null)
      await load()
    }
    setSaving(false)
  }

  const toggle = async (row: EmailTemplate) => {
    if (!supabase) return
    const { error: e } = await supabase
      .from('email_templates')
      .update({ enabled: !row.enabled, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (e) setError(e.message)
    else
      setRows((current) =>
        current.map((x) => (x.id === row.id ? { ...x, enabled: !x.enabled } : x)),
      )
  }

  return (
    <div className="admin-shell">
      <div className="admin-content">
        <div className="admin-title">
          <div>
            <p className="eyebrow">EMAIL SYSTEM</p>
            <h1>Email Templates</h1>
            <p>
              Manage system emails like WordPress: subject, HTML content, text fallback, variables
              and status.
            </p>
          </div>
          <button className="primary-button" onClick={startNew}>
            <Plus size={15} /> Add Template
          </button>
        </div>

        {error && <div className="workspace-error">{error}</div>}

        <section className="workspace-panel">
          <div className="workspace-toolbar">
            <div className="toolbar-search">
              <Mail size={15} />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search email templates"
              />
            </div>
            <button className="secondary-button" onClick={() => void load()}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="workspace-empty">Loading email templates...</div>
          ) : (
            <div className="workspace-table">
              <div
                className="workspace-row admin-table-header"
                style={{ gridTemplateColumns: '1.4fr 2fr 110px 130px' }}
              >
                <strong>Template</strong>
                <span>Description</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {visible.map((row) => (
                <div
                  className="workspace-row"
                  key={row.id}
                  style={{ gridTemplateColumns: '1.4fr 2fr 110px 130px' }}
                >
                  <div>
                    <strong>{row.name}</strong>
                    <div className="workspace-muted" style={{ fontSize: 11 }}>
                      {row.template_key}
                    </div>
                  </div>
                  <span>{row.description || '—'}</span>
                  <button
                    type="button"
                    onClick={() => void toggle(row)}
                    style={{
                      border: 0,
                      borderRadius: 999,
                      padding: '6px 10px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: row.enabled ? '#eaf8ef' : '#f1f1f1',
                      color: row.enabled ? '#16743a' : '#777',
                    }}
                  >
                    {row.enabled ? 'Active' : 'Disabled'}
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setEditing({
                          ...row,
                          variables: Array.isArray(row.variables) ? row.variables : [],
                        })
                        setPreview(false)
                      }}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {editing && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-template-title"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(15, 23, 28, 0.62)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: 'min(1120px, 100%)',
                maxHeight: 'calc(100vh - 48px)',
                overflowY: 'auto',
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 24px 80px rgba(0,0,0,.28)',
                color: '#14252b',
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 20,
                  padding: '20px 24px',
                  background: '#fff',
                  borderBottom: '1px solid #e7e2d8',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#a27a16', textTransform: 'uppercase' }}>
                    Email System
                  </div>
                  <h2 id="email-template-title" style={{ margin: '5px 0 4px', fontSize: 25, lineHeight: 1.15 }}>
                    {editing.id ? 'Edit Email Template' : 'Add Email Template'}
                  </h2>
                  <p style={{ margin: 0, color: '#6d7780', fontSize: 13 }}>
                    Create a reusable system email with dynamic variables.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  aria-label="Close"
                  style={{
                    width: 38,
                    height: 38,
                    border: '1px solid #ddd8cf',
                    borderRadius: 9,
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#34434a',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 24 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <label style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>Template Key</span>
                    <input
                      value={editing.template_key}
                      disabled={!!editing.id}
                      onChange={(e) => setEditing({ ...editing, template_key: e.target.value })}
                      placeholder="order_received"
                      style={inputStyle}
                    />
                    <small style={hintStyle}>Unique internal key. Example: order_received</small>
                  </label>

                  <label style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>Template Name</span>
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      placeholder="New Order"
                      style={inputStyle}
                    />
                    <small style={hintStyle}>The name shown to administrators.</small>
                  </label>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <label style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>Description</span>
                    <input
                      value={editing.description || ''}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      placeholder="Sent after a new order is placed."
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>Email Subject</span>
                    <input
                      value={editing.subject}
                      onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                      placeholder="Order {{order_number}} received — {{site_name}}"
                      style={inputStyle}
                    />
                  </label>
                </div>

                <div
                  style={{
                    border: '1px solid #e4dfd6',
                    borderRadius: 12,
                    padding: 16,
                    background: '#faf9f6',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 850 }}>Email Content</div>
                      <div style={{ fontSize: 12, color: '#737d84', marginTop: 3 }}>
                        HTML is sent to modern email clients. Plain text is the fallback.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setPreview((x) => !x)}
                    >
                      <Eye size={15} /> {preview ? 'Hide Preview' : 'Preview Email'}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, .65fr)',
                      gap: 14,
                    }}
                  >
                    <label style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>HTML Body</span>
                      <textarea
                        value={editing.html_body}
                        onChange={(e) => setEditing({ ...editing, html_body: e.target.value })}
                        rows={18}
                        spellCheck={false}
                        style={{ ...textareaStyle, minHeight: 340 }}
                      />
                    </label>

                    <label style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>Plain Text Fallback</span>
                      <textarea
                        value={editing.text_body || ''}
                        onChange={(e) => setEditing({ ...editing, text_body: e.target.value })}
                        rows={18}
                        style={{ ...textareaStyle, minHeight: 340, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.55 }}
                      />
                    </label>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 16,
                    alignItems: 'end',
                  }}
                >
                  <label style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>Available Variables</span>
                    <input
                      value={editing.variables.join(', ')}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          variables: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                        })
                      }
                      placeholder="site_name, customer_name, order_number"
                      style={inputStyle}
                    />
                    <small style={hintStyle}>
                      Use variables inside the subject or body like <code>{'{{customer_name}}'}</code>.
                    </small>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '11px 14px',
                      border: '1px solid #e4dfd6',
                      borderRadius: 9,
                      background: '#fff',
                      fontSize: 13,
                      fontWeight: 750,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editing.enabled}
                      onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                    />
                    Template enabled
                  </label>
                </div>

                {preview && (
                  <div
                    style={{
                      marginTop: 18,
                      border: '1px solid #e4dfd6',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '12px 15px', background: '#f7f5f0', borderBottom: '1px solid #e4dfd6', fontWeight: 800, fontSize: 12 }}>
                      EMAIL PREVIEW
                    </div>
                    <div style={{ padding: 15, background: '#fff' }}>
                      <div style={{ fontSize: 12, color: '#737d84', marginBottom: 5 }}>Subject</div>
                      <div style={{ fontWeight: 800, marginBottom: 14 }}>
                        {replacePreview(editing.subject, editing.variables)}
                      </div>
                      <iframe
                        title="Email preview"
                        sandbox=""
                        srcDoc={replacePreview(editing.html_body, editing.variables)}
                        style={{ width: '100%', height: 440, border: '1px solid #ddd8cf', borderRadius: 8, background: '#fff', display: 'block' }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{ marginTop: 16, padding: '11px 13px', borderRadius: 8, background: '#fff1f1', color: '#a32929', border: '1px solid #efcaca', fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 10,
                    marginTop: 20,
                    paddingTop: 18,
                    borderTop: '1px solid #e7e2d8',
                  }}
                >
                  <button type="button" className="secondary-button" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                  <button type="button" className="primary-button" disabled={saving} onClick={() => void save()}>
                    <Save size={15} /> {saving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
