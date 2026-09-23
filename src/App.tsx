import { useMemo, useState } from 'react'
import { Building2, LockKeyhole, UserRound, ChevronDown, Eye, EyeOff, MapPin } from 'lucide-react'
import type { PortalMode } from './types'

const demoSchools = [
  {
    id: 'demo-1',
    name: 'ABC International School',
    branches: [
      { id: 'branch-1', name: 'Main Campus' },
      { id: 'branch-2', name: 'Jubilee Hills Branch' },
      { id: 'branch-3', name: 'Gachibowli Branch' },
    ],
  },
  {
    id: 'demo-2',
    name: 'Delhi Public School',
    branches: [
      { id: 'branch-4', name: 'North Campus' },
      { id: 'branch-5', name: 'South Campus' },
    ],
  },
  {
    id: 'demo-3',
    name: 'Oakridge International School',
    branches: [{ id: 'branch-6', name: 'Main Campus' }],
  },
]

function App() {
  const [mode, setMode] = useState<PortalMode>('login')
  const [school, setSchool] = useState('')
  const [branch, setBranch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const selectedSchool = useMemo(() => demoSchools.find(s => s.id === school), [school])
  const branches = selectedSchool?.branches ?? []
  const canLogin = Boolean(school && branch && studentId.trim() && password)

  function handleSchoolChange(value: string) {
    setSchool(value)
    setBranch('')
    setStudentId('')
    setPassword('')
  }

  function handleBranchChange(value: string) {
    setBranch(value)
    setStudentId('')
    setPassword('')
  }

  function handleLogin() {
    if (!canLogin) return
    setMode('store')
  }

  if (mode === 'admin') return <AdminPlaceholder onBack={() => setMode('login')} />
  if (mode === 'store') {
    return <StorePlaceholder school={school} branch={branch} studentId={studentId} onLogout={() => setMode('login')} />
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark"><Building2 size={28} /></div>
        <p className="eyebrow">SCHOOL UNIFORM PORTAL</p>
        <h1>Welcome back</h1>
        <p className="subtitle">Select your school and branch, then sign in with the credentials provided to you.</p>

        <label htmlFor="school">School</label>
        <div className="input-wrap select-wrap">
          <Building2 size={18} />
          <select id="school" value={school} onChange={e => handleSchoolChange(e.target.value)}>
            <option value="">Select your school</option>
            {demoSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={17} />
        </div>

        <label htmlFor="branch">Branch</label>
        <div className={`input-wrap select-wrap ${!school ? 'is-disabled' : ''}`}>
          <MapPin size={18} />
          <select
            id="branch"
            value={branch}
            disabled={!school}
            onChange={e => handleBranchChange(e.target.value)}
          >
            <option value="">{school ? 'Select your branch' : 'Select school first'}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown size={17} />
        </div>

        <label htmlFor="student-id">Student / Parent ID</label>
        <div className={`input-wrap ${!branch ? 'is-disabled' : ''}`}>
          <UserRound size={18} />
          <input
            id="student-id"
            value={studentId}
            disabled={!branch}
            onChange={e => setStudentId(e.target.value)}
            placeholder={branch ? 'Enter your ID' : 'Select branch first'}
          />
        </div>

        <label htmlFor="password">Password</label>
        <div className={`input-wrap ${!branch ? 'is-disabled' : ''}`}>
          <LockKeyhole size={18} />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            disabled={!branch}
            onChange={e => setPassword(e.target.value)}
            placeholder={branch ? 'Enter your password' : 'Select branch first'}
          />
          <button className="icon-button" type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility" disabled={!branch}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button className="primary-button" disabled={!canLogin} onClick={handleLogin}>LOGIN</button>
        <button className="text-button" type="button">Forgot Password?</button>
        <button className="admin-link" type="button" onClick={() => setMode('admin')}>Admin Portal</button>
      </section>
    </main>
  )
}

function StorePlaceholder({ school, branch, studentId, onLogout }: { school: string; branch: string; studentId: string; onLogout: () => void }) {
  const selectedSchool = demoSchools.find(s => s.id === school)
  const branchName = selectedSchool?.branches.find(b => b.id === branch)?.name ?? 'Your Branch'
  const schoolName = selectedSchool?.name ?? 'Your School'

  return (
    <div className="app-shell">
      <header>
        <div>
          <strong>{schoolName}</strong>
          <span className="header-branch">{branchName}</span>
        </div>
        <button onClick={onLogout}>Logout</button>
      </header>
      <div className="content">
        <p className="eyebrow">STUDENT / PARENT PORTAL</p>
        <h1>Welcome, {studentId}</h1>
        <p>Your school and branch-specific uniform store will appear here. Access is restricted by the authenticated account.</p>
      </div>
    </div>
  )
}

function AdminPlaceholder({ onBack }: { onBack: () => void }) {
  return (
    <div className="app-shell">
      <header><strong>School Uniform Admin</strong><button onClick={onBack}>Back to Login</button></header>
      <div className="content">
        <p className="eyebrow">ADMIN PORTAL</p>
        <h1>Foundation ready</h1>
        <p>Next we will connect Supabase authentication, schools, student/parent accounts, catalog, packages, inventory and RLS.</p>
      </div>
    </div>
  )
}

export default App
