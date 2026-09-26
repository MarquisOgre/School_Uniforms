import { useEffect, useMemo, useState } from 'react'
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
          <div className="workspace-modal-backdrop">
            <div className="workspace-modal" style={{ maxWidth: 1100, width: '94vw' }}>
              <div className="panel-heading">
                <div>
                  <h2>{editing.id ? 'Edit Email Template' : 'Add Email Template'}</h2>
                  <p className="workspace-muted">
                    Use double braces for dynamic values, for example {'{{customer_name}}'}.
                  </p>
                </div>
                <button className="icon-button" onClick={() => setEditing(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="workspace-form-row">
                <label className="workspace-field">
                  <span>Template Key</span>
                  <input
                    value={editing.template_key}
                    disabled={!!editing.id}
                    onChange={(e) => setEditing({ ...editing, template_key: e.target.value })}
                    placeholder="order_received"
                  />
                </label>
                <label className="workspace-field">
                  <span>Template Name</span>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="New Order"
                  />
                </label>
              </div>

              <label className="workspace-field">
                <span>Description</span>
                <input
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </label>

              <label className="workspace-field">
                <span>Email Subject</span>
                <input
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                />
              </label>

              <div className="workspace-form-row">
                <label className="workspace-field">
                  <span>HTML Body</span>
                  <textarea
                    value={editing.html_body}
                    onChange={(e) => setEditing({ ...editing, html_body: e.target.value })}
                    rows={16}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </label>
                <label className="workspace-field">
                  <span>Plain Text Fallback</span>
                  <textarea
                    value={editing.text_body || ''}
                    onChange={(e) => setEditing({ ...editing, text_body: e.target.value })}
                    rows={16}
                  />
                </label>
              </div>

              <label className="workspace-field">
                <span>Variables (comma separated)</span>
                <input
                  value={editing.variables.join(', ')}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      variables: e.target.value
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="site_name, customer_name, order_number"
                />
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  margin: '12px 0',
                  fontWeight: 700,
                }}
              >
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                />
                Template enabled
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="secondary-button" onClick={() => setPreview((x) => !x)}>
                  <Eye size={15} /> {preview ? 'Hide Preview' : 'Preview'}
                </button>
                <button className="secondary-button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="primary-button" disabled={saving} onClick={() => void save()}>
                  <Save size={15} /> {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>

              {preview && (
                <div style={{ marginTop: 18, borderTop: '1px solid #eee', paddingTop: 18 }}>
                  <div className="workspace-muted" style={{ marginBottom: 8 }}>
                    Subject Preview
                  </div>
                  <div style={{ fontWeight: 800, marginBottom: 14 }}>
                    {replacePreview(editing.subject, editing.variables)}
                  </div>
                  <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={replacePreview(editing.html_body, editing.variables)}
                    style={{
                      width: '100%',
                      minHeight: 420,
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      background: '#fff',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
