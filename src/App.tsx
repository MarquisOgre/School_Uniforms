import { useState } from 'react'
import { Building2, LockKeyhole, UserRound, ChevronDown, Eye, EyeOff } from 'lucide-react'
import type { PortalMode } from './types'

const demoSchools = [
  { id: 'demo-1', name: 'ABC International School' },
  { id: 'demo-2', name: 'Delhi Public School' },
  { id: 'demo-3', name: 'Oakridge International School' },
]

function App() {
  const [mode, setMode] = useState<PortalMode>('login')
  const [school, setSchool] = useState('')
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (mode === 'admin') return <AdminPlaceholder onBack={() => setMode('login')} />
  if (mode === 'store') return <StorePlaceholder school={school} studentId={studentId} onLogout={() => setMode('login')} />

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark"><Building2 size={28} /></div>
        <p className="eyebrow">SCHOOL UNIFORM PORTAL</p>
        <h1>Welcome back</h1>
        <p className="subtitle">Select your school and sign in with the credentials provided to you.</p>

        <label>School</label>
        <div className="input-wrap select-wrap">
          <Building2 size={18} />
          <select value={school} onChange={e => setSchool(e.target.value)}>
            <option value="">Select your school</option>
            {demoSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={17} />
        </div>

        <label>Student / Parent ID</label>
        <div className="input-wrap">
          <UserRound size={18} />
          <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Enter your ID" />
        </div>

        <label>Password</label>
        <div className="input-wrap">
          <LockKeyhole size={18} />
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
          <button className="icon-button" type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button className="primary-button" disabled={!school || !studentId || !password} onClick={() => setMode('store')}>LOGIN</button>
        <button className="text-button">Forgot Password?</button>
        <button className="admin-link" onClick={() => setMode('admin')}>Admin Portal</button>
      </section>
    </main>
  )
}

function StorePlaceholder({ school, studentId, onLogout }: { school: string; studentId: string; onLogout: () => void }) {
  const schoolName = demoSchools.find(s => s.id === school)?.name ?? 'Your School'
  return <div className="app-shell"><header><strong>{schoolName}</strong><button onClick={onLogout}>Logout</button></header><div className="content"><p className="eyebrow">STUDENT / PARENT PORTAL</p><h1>Welcome, {studentId}</h1><p>Your school-specific uniform store will appear here. Other schools will not be exposed.</p></div></div>
}

function AdminPlaceholder({ onBack }: { onBack: () => void }) {
  return <div className="app-shell"><header><strong>School Uniform Admin</strong><button onClick={onBack}>Back to Login</button></header><div className="content"><p className="eyebrow">ADMIN PORTAL</p><h1>Foundation ready</h1><p>Next we will connect Supabase authentication, schools, student/parent accounts, catalog, packages, inventory and RLS.</p></div></div>
}

export default App
