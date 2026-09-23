import { useEffect, useMemo, useState } from 'react'
import { Building2, LockKeyhole, UserRound, ChevronDown, Eye, EyeOff, MapPin, LoaderCircle } from 'lucide-react'
import type { PortalMode } from './types'
import { supabase } from './lib/supabase'
import StudentImport from './components/StudentImport'

type SchoolOption = {
  id: string
  name: string
}

type BranchOption = {
  id: string
  name: string
}

type LoginUser = {
  id: string
  full_name: string | null
  role: string
  school_id: string | null
  branch_id: string | null
  login_id: string
}

function App() {
  const [mode, setMode] = useState<PortalMode>('login')
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [school, setSchool] = useState('')
  const [branch, setBranch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState('')

  const selectedSchoolName = useMemo(
    () => schools.find(item => item.id === school)?.name ?? 'Your School',
    [schools, school],
  )
  const selectedBranchName = useMemo(
    () => branches.find(item => item.id === branch)?.name ?? 'Your Branch',
    [branches, branch],
  )

  useEffect(() => {
    let cancelled = false

    async function loadSchools() {
      setLoadingSchools(true)
      setError('')

      if (!supabase) {
        setError('Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables.')
        setLoadingSchools(false)
        return
      }

      const { data, error: queryError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (cancelled) return

      if (queryError) {
        setError('Unable to load schools. Please try again.')
        setSchools([])
      } else {
        setSchools(data ?? [])
      }

      setLoadingSchools(false)
    }

    void loadSchools()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSchoolChange(value: string) {
    setSchool(value)
    setBranch('')
    setBranches([])
    setStudentId('')
    setPassword('')
    setError('')

    if (!value || !supabase) return

    setLoadingBranches(true)

    const { data, error: queryError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('school_id', value)
      .eq('status', 'active')
      .order('name')

    if (queryError) {
      setError('Unable to load branches for this school.')
      setBranches([])
      setLoadingBranches(false)
      return
    }

    const nextBranches = data ?? []
    setBranches(nextBranches)

    if (nextBranches.length === 1) {
      setBranch(nextBranches[0].id)
    }

    setLoadingBranches(false)
  }

  function handleBranchChange(value: string) {
    setBranch(value)
    setStudentId('')
    setPassword('')
    setError('')
  }

  async function handleLogin() {
    if (!supabase || !school || !branch || !studentId.trim() || !password || loggingIn) return

    setLoggingIn(true)
    setError('')

    const { data, error: loginError } = await supabase.functions.invoke('student-parent-login', {
      body: {
        school_id: school,
        branch_id: branch,
        login_id: studentId.trim(),
        password,
      },
    })

    if (loginError || !data?.session) {
      setError(data?.error ?? 'Invalid school, branch, ID, or password.')
      setLoggingIn(false)
      return
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) {
      setError('Login succeeded, but the session could not be created. Please try again.')
      setLoggingIn(false)
      return
    }

    setMode('store')
    setLoggingIn(false)
  }

  const canLogin = Boolean(school && branch && studentId.trim() && password && !loggingIn)

  if (mode === 'store') {
    return (
      <StorePlaceholder
        schoolName={selectedSchoolName}
        branchName={selectedBranchName}
        studentId={studentId}
        onLogout={async () => {
          await supabase?.auth.signOut({ scope: 'local' })
          setMode('login')
          setStudentId('')
          setPassword('')
        }}
      />
    )
  }

  if (mode === 'admin') return <AdminPlaceholder onBack={() => setMode('login')} />

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark"><Building2 size={28} /></div>
        <p className="eyebrow">SCHOOL UNIFORM PORTAL</p>
        <h1>Welcome back</h1>
        <p className="subtitle">Select your school and branch, then sign in with the credentials provided to you.</p>

        <label htmlFor="school">School</label>
        <div className={`input-wrap select-wrap ${loadingSchools ? 'is-disabled' : ''}`}>
          <Building2 size={18} />
          <select
            id="school"
            value={school}
            disabled={loadingSchools}
            onChange={e => void handleSchoolChange(e.target.value)}
          >
            <option value="">{loadingSchools ? 'Loading schools...' : 'Select your school'}</option>
            {schools.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {loadingSchools ? <LoaderCircle className="spin" size={17} /> : <ChevronDown size={17} />}
        </div>

        <label htmlFor="branch">Branch</label>
        <div className={`input-wrap select-wrap ${!school || loadingBranches ? 'is-disabled' : ''}`}>
          <MapPin size={18} />
          <select
            id="branch"
            value={branch}
            disabled={!school || loadingBranches}
            onChange={e => handleBranchChange(e.target.value)}
          >
            <option value="">
              {!school ? 'Select school first' : loadingBranches ? 'Loading branches...' : branches.length === 0 ? 'No active branches' : 'Select your branch'}
            </option>
            {branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {loadingBranches ? <LoaderCircle className="spin" size={17} /> : <ChevronDown size={17} />}
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
            autoComplete="username"
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
            onKeyDown={e => {
              if (e.key === 'Enter') void handleLogin()
            }}
            placeholder={branch ? 'Enter your password' : 'Select branch first'}
            autoComplete="current-password"
          />
          <button className="icon-button" type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility" disabled={!branch}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="login-error" role="alert">{error}</p>}

        <button className="primary-button" disabled={!canLogin} onClick={() => void handleLogin()}>
          {loggingIn ? <><LoaderCircle className="spin" size={18} /> SIGNING IN...</> : 'LOGIN'}
        </button>
        <button className="text-button" type="button">Forgot Password?</button>
        <button className="admin-link" type="button" onClick={() => setMode('admin')}>Admin Portal</button>
      </section>
    </main>
  )
}

function StorePlaceholder({ schoolName, branchName, studentId, onLogout }: { schoolName: string; branchName: string; studentId: string; onLogout: () => void | Promise<void> }) {
  return (
    <div className="app-shell">
      <header>
        <div>
          <strong>{schoolName}</strong>
          <span className="header-branch">{branchName}</span>
        </div>
        <button onClick={() => void onLogout()}>Logout</button>
      </header>
      <div className="content">
        <p className="eyebrow">STUDENT / PARENT PORTAL</p>
        <h1>Welcome, {studentId}</h1>
        <p>Your school and branch-specific uniform store will appear here. Access is restricted by the authenticated account and database RLS.</p>
      </div>
    </div>
  )
}

function AdminPlaceholder({ onBack }: { onBack: () => void }) {
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [admin,setAdmin]=useState(false)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [schools,setSchools]=useState<SchoolOption[]>([])
  const [branches,setBranches]=useState<BranchOption[]>([])
  const [school,setSchool]=useState('')
  const [branch,setBranch]=useState('')

  async function login() {
    if(!supabase||!email.trim()||!password||loading)return
    setLoading(true);setError('')
    const {data,error:e}=await supabase.auth.signInWithPassword({email:email.trim(),password})
    if(e||!data.user){setError('Invalid admin email or password.');setLoading(false);return}
    const {data:p,error:pe}=await supabase.from('profiles').select('role').eq('id',data.user.id).single()
    if(pe||!p||!['admin','super_admin'].includes(p.role)){await supabase.auth.signOut({scope:'local'});setError('This account is not authorized for the Admin Portal.');setLoading(false);return}
    setAdmin(true);setLoading(false)
  }

  useEffect(()=>{if(!admin)return;async function load(){if(!supabase)return;const {data}=await supabase.from('schools').select('id,name').eq('status','active').order('name');setSchools(data??[])}void load()},[admin])

  async function selectSchool(value:string){setSchool(value);setBranch('');if(!value||!supabase){setBranches([]);return}const {data}=await supabase.from('branches').select('id,name').eq('school_id',value).eq('status','active').order('name');setBranches(data??[])}

  if(admin&&school&&branch)return <StudentImport schoolId={school} branchId={branch} onBack={()=>setBranch('')}/>

  if(admin)return <div className="app-shell"><header><strong>School Uniform Admin</strong><button onClick={()=>{void supabase?.auth.signOut({scope:'local'});setAdmin(false)}}>Logout</button></header><div className="content admin-panel"><p className="eyebrow">ADMIN PORTAL</p><h1>Student Management</h1><p>Choose the school and branch, then import students and parent accounts from Excel or CSV.</p><div className="admin-selector-grid"><label>School<select value={school} onChange={e=>void selectSchool(e.target.value)}><option value="">Select school</option>{schools.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Branch<select value={branch} disabled={!school} onChange={e=>setBranch(e.target.value)}><option value="">Select branch</option>{branches.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div></div></div>

  return <div className="app-shell"><header><strong>School Uniform Admin</strong><button onClick={onBack}>Back</button></header><div className="content admin-login"><p className="eyebrow">ADMIN PORTAL</p><h1>Administrator Sign In</h1><p>Use an authorized administrator account.</p><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="admin@example.com"/><label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" onKeyDown={e=>{if(e.key==='Enter')void login()}} autoComplete="current-password"/>{error&&<p className="login-error">{error}</p>}<button className="primary-button" disabled={!email.trim()||!password||loading} onClick={()=>void login()}>{loading?'SIGNING IN...':'ADMIN LOGIN'}</button></div></div>
}

export default App
