import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { GlobalFooter, GlobalHeader } from './GlobalChrome'

type ImportRow = {
  student_code: string
  student_name: string
  dob: string
  class_name: string
  section: string
  gender: string
  parent_name: string
  parent_login_id: string
  parent_phone: string
}

function key(v: unknown) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s/-]+/g, '_')
}
function normalize(raw: Record<string, unknown>): ImportRow {
  const r: Record<string, string> = {}
  Object.entries(raw).forEach(([k, v]) => {
    r[key(k)] = String(v ?? '').trim()
  })
  return {
    student_code: r.student_code ?? '',
    student_name: r.student_name ?? '',
    dob: r.dob ?? '',
    class_name: r.class_name ?? '',
    section: r.section ?? '',
    gender: r.gender ?? '',
    parent_name: r.parent_name ?? '',
    parent_login_id: r.parent_login_id ?? '',
    parent_phone: r.parent_phone ?? '',
  }
}
function parseDate(v: string) {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(v)) {
    const [d, m, y] = v.split(/[/-]/)
    return `${y}-${m}-${d}`
  }
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? v : d.toISOString().slice(0, 10)
}

export default function StudentImport({
  schoolId,
  branchId,
  onBack,
}: {
  schoolId: string
  branchId: string
  onBack: () => void
}) {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const errors = useMemo(
    () =>
      rows.flatMap((r, i) =>
        [
          !r.student_code ? `Row ${i + 2}: Student ID is required` : '',
          !r.student_name ? `Row ${i + 2}: Student Name is required` : '',
          !r.dob ? `Row ${i + 2}: DOB is required` : '',
          !r.parent_login_id ? `Row ${i + 2}: Parent Login ID is required` : '',
        ].filter(Boolean),
      ),
    [rows],
  )
  async function readFile(file?: File) {
    if (!file) return
    setFileName(file.name)
    setError('')
    setResult(null)
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      setRows(data.map(normalize).map((r) => ({ ...r, dob: parseDate(r.dob) })))
    } catch {
      setRows([])
      setError('Could not read the file. Please upload a valid Excel or CSV file.')
    }
  }
  async function importRows() {
    if (!supabase || !rows.length || errors.length || busy) return
    setBusy(true)
    setError('')
    setResult(null)
    const { data, error: e } = await supabase.functions.invoke('bulk-import-students', {
      body: { school_id: schoolId, branch_id: branchId, rows },
    })
    if (e || !data) setError(data?.error ?? e?.message ?? 'Import failed.')
    else setResult(data)
    setBusy(false)
  }
  return (
    <div className="admin-import-page">
      <GlobalHeader
        portal="admin"
        title="Admin Portal"
        subtitle="School Uniform Store"
        onBack={onBack}
        backLabel="Dashboard"
      />
      <div className="import-header">
        <div>
          <p className="eyebrow">ADMIN • STUDENTS</p>
          <h1>Bulk Student Import</h1>
          <p>
            Upload Excel or CSV data to create students, parent accounts and parent-child links.
          </p>
        </div>
      </div>
      <div className="import-card">
        <div className="upload-zone">
          <FileSpreadsheet size={34} />
          <h2>Upload Student File</h2>
          <p>Supported: .xlsx, .xls, .csv</p>
          <label className="upload-button">
            <Upload size={17} /> Choose File
            <input
              hidden
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => void readFile(e.target.files?.[0])}
            />
          </label>
          {fileName && <span className="file-name">{fileName}</span>}
        </div>
        <div className="template-box">
          <strong>Required columns</strong>
          <code>
            student_code, student_name, dob, class_name, section, gender, parent_name,
            parent_login_id, parent_phone
          </code>
          <small>
            New parent passwords are generated from DOB as DDMMYYYY. Passwords are securely handled
            by Supabase Auth.
          </small>
        </div>
        {error && (
          <p className="login-error">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
        {rows.length > 0 && (
          <>
            <div className="import-summary">
              <strong>{rows.length}</strong> records loaded{' '}
              {errors.length > 0 && <span>{errors.length} validation errors</span>}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Student</th>
                    <th>DOB</th>
                    <th>Parent</th>
                    <th>Parent Login</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i}>
                      <td>{r.student_code}</td>
                      <td>{r.student_name}</td>
                      <td>{r.dob}</td>
                      <td>{r.parent_name}</td>
                      <td>{r.parent_login_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 20 && (
              <p className="table-note">Showing first 20 of {rows.length} records.</p>
            )}
            {errors.length > 0 && (
              <div className="validation-list">
                {errors.slice(0, 10).map((x) => (
                  <div key={x}>{x}</div>
                ))}
              </div>
            )}
            <button
              className="primary-button import-button"
              disabled={!!errors.length || busy}
              onClick={() => void importRows()}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={18} /> IMPORTING...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> IMPORT {rows.length} RECORDS
                </>
              )}
            </button>
          </>
        )}
        {result && (
          <div className="result-card">
            <strong>Import complete</strong>
            <span>Students created/updated: {result.created_students}</span>
            <span>Parent accounts created: {result.created_parents}</span>
            <span>Parent-child links created: {result.linked}</span>
            {result.errors?.map((x: string) => (
              <span className="result-error" key={x}>
                {x}
              </span>
            ))}
          </div>
        )}
      </div>
      <GlobalFooter portal="admin" />
    </div>
  )
}
