import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, BookOpen, Building2, CheckCircle2, ChevronDown, ClipboardList, CreditCard, Eye, EyeOff, FileSpreadsheet, Home, LockKeyhole, LogOut, MapPin, Menu, Package, Search, ShoppingBag, ShoppingCart, Sparkles, UserRound, X, Minus, Plus, Trash2, ChevronLeft
} from 'lucide-react'
import type { PortalMode } from './types'
import { supabase } from './lib/supabase'
import StudentImport from './components/StudentImport'
import ParentCreate from './components/ParentCreate'

type SchoolOption={id:string;name:string}
type BranchOption={id:string;name:string}
type CustomerPage='dashboard'|'packages'|'products'|'orders'|'profile'
type CartItem={id:string;title:string;type:'package'|'product';price:number;size?:string;quantity:number}
type CheckoutStep='cart'|'details'|'payment'|'success'

function App(){
  const [mode,setMode]=useState<PortalMode>('login')
  const [showLogin,setShowLogin]=useState(false)
  const [schools,setSchools]=useState<SchoolOption[]>([])
  const [branches,setBranches]=useState<BranchOption[]>([])
  const [school,setSchool]=useState('')
  const [branch,setBranch]=useState('')
  const [studentId,setStudentId]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [loadingSchools,setLoadingSchools]=useState(true)
  const [loadingBranches,setLoadingBranches]=useState(false)
  const [loggingIn,setLoggingIn]=useState(false)
  const [error,setError]=useState('')
  const [customerPage,setCustomerPage]=useState<CustomerPage>('dashboard')

  useEffect(()=>{let cancelled=false;async function load(){if(!supabase){setError('Supabase is not configured.');setLoadingSchools(false);return}const {data,error}=await supabase.from('schools').select('id,name').eq('status','active').order('name');if(cancelled)return;if(error){console.error('School loading error:',error);setError(`Unable to load schools (${error.code??'unknown'}): ${error.message}`)}else setSchools(data??[]);setLoadingSchools(false)}void load();return()=>{cancelled=true}},[])
  const selectedSchoolName=useMemo(()=>schools.find(x=>x.id===school)?.name??'Your School',[schools,school])
  const selectedBranchName=useMemo(()=>branches.find(x=>x.id===branch)?.name??'Your Branch',[branches,branch])

  async function selectSchool(value:string){setSchool(value);setBranch('');setBranches([]);setStudentId('');setPassword('');setError('');if(!value||!supabase)return;setLoadingBranches(true);const {data,error}=await supabase.from('branches').select('id,name').eq('school_id',value).eq('status','active').order('name');if(error){console.error('Branch loading error:',error);setError(`Unable to load branches (${error.code??'unknown'}): ${error.message}`)}else{const list=data??[];setBranches(list);if(list.length===1)setBranch(list[0].id)}setLoadingBranches(false)}
  function selectBranch(value:string){setBranch(value);setStudentId('');setPassword('');setError('')}
  async function login(){if(!supabase||!school||!branch||!studentId.trim()||!password||loggingIn)return;setLoggingIn(true);setError('');const {data,error}=await supabase.functions.invoke('student-parent-login',{body:{school_id:school,branch_id:branch,login_id:studentId.trim(),password}});if(error||!data?.session){setError(data?.error??'Invalid school, branch, ID, or password.');setLoggingIn(false);return}const {error:se}=await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});if(se){setError('Login succeeded, but the session could not be created.');setLoggingIn(false);return}setMode('store');setCustomerPage('dashboard');setShowLogin(false);setLoggingIn(false)}
  async function logout(){await supabase?.auth.signOut({scope:'local'});setMode('login');setStudentId('');setPassword('')}

  if(mode==='store')return <CustomerPortal schoolName={selectedSchoolName} branchName={selectedBranchName} studentId={studentId} page={customerPage} setPage={setCustomerPage} onLogout={()=>void logout()}/>
  if(mode==='admin')return <AdminPortal onBack={()=>setMode('login')}/>

  return <>
    <Landing onLogin={()=>setShowLogin(true)} />
    {showLogin&&<div className="login-overlay">
      <section className="login-card login-card-large">
        <button className="modal-close" onClick={()=>setShowLogin(false)} aria-label="Close"><X size={20}/></button>
        <div className="brand-mark"><img className="brand-mark-image" src="/favicon.png" alt="" /></div>
        <p className="eyebrow">SECURE SCHOOL PORTAL</p><h1>Welcome back</h1>
        <p className="subtitle">Select your school and branch, then sign in with the credentials provided by your school.</p>
        <label>School</label><div className="input-wrap select-wrap"><Building2 size={18}/><select value={school} disabled={loadingSchools} onChange={e=>void selectSchool(e.target.value)}><option value="">{loadingSchools?'Loading schools...':'Select your school'}</option>{schools.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><ChevronDown size={17}/></div>
        <label>Branch</label><div className="input-wrap select-wrap"><MapPin size={18}/><select value={branch} disabled={!school||loadingBranches} onChange={e=>selectBranch(e.target.value)}><option value="">{!school?'Select school first':loadingBranches?'Loading branches...':branches.length?'Select your branch':'No active branches'}</option>{branches.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><ChevronDown size={17}/></div>
        <label>Student / Parent ID</label><div className="input-wrap"><UserRound size={18}/><input value={studentId} disabled={!branch} onChange={e=>setStudentId(e.target.value)} placeholder="Enter your ID" autoComplete="username"/></div>
        <label>Password</label><div className="input-wrap"><LockKeyhole size={18}/><input type={showPassword?'text':'password'} value={password} disabled={!branch} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void login()}} placeholder="Enter your password" autoComplete="current-password"/><button className="icon-button" onClick={()=>setShowPassword(v=>!v)} disabled={!branch}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
        {error&&<p className="login-error">{error}</p>}
        <button className="primary-button" disabled={!school||!branch||!studentId.trim()||!password||loggingIn} onClick={()=>void login()}>{loggingIn?'SIGNING IN...':'SIGN IN TO PORTAL'}<ArrowRight size={18}/></button>
        <button className="text-button">Forgot Password?</button>
        <button className="admin-link" onClick={()=>{setShowLogin(false);setMode('admin')}}>Administrator Portal</button>
      </section>
    </div>}
  </>
}

function Landing({onLogin}:{onLogin:()=>void}){
  const [menu,setMenu]=useState(false)
  return <main className="landing">
    <header className="store-header">
      <div className="store-header-inner">
        <div className="site-brand"><img className="brand-logo" src="/logo.png" alt="Artisan" /></div>
        <nav className={menu?'nav-open':''}>
          <a className="active" href="#">Home</a><a href="#collections">Uniforms</a><a href="#packages">Packages</a><a href="#accessories">Accessories</a><a href="#size-guide">Size Guide</a><a href="#support">Help</a>
        </nav>
        <div className="store-actions"><button className="header-link" onClick={onLogin}>Orders</button><button className="login-top" onClick={onLogin}>Parent / Student Login <ArrowRight size={15}/></button></div>
        <button className="mobile-menu" onClick={()=>setMenu(v=>!v)}>{menu?<X/>:<Menu/>}</button>
      </div>
    </header>

    <section className="store-hero">
      <div className="hero-panel">
        <div className="hero-copy-store">
          <p className="eyebrow">PREMIUM SCHOOL UNIFORMS</p>
          <h1>Dress for<br/><em>Brighter</em><br/>Tomorrows.</h1>
          <p>Quality uniforms for confident learners. Shop school-approved uniforms, packages and accessories — all in one place.</p>
          <div className="hero-actions"><button className="hero-primary" onClick={onLogin}>Shop Uniforms <ArrowRight size={17}/></button><a className="hero-secondary" href="#packages">View Packages</a></div>
        </div>
        <div className="hero-student-stage">
          <div className="sun-disc"/><div className="stage-ring"/>
          <img src="/boys-uniform.svg" alt="Boys school uniform"/>
          <img className="stage-girls" src="/girls-uniform.svg" alt="Girls school uniform"/>
          <div className="approval-seal"><span>ARTISAN</span><strong>100%</strong><small>SCHOOL<br/>APPROVED</small></div>
        </div>
      </div>
    </section>

    <section className="trust-strip">
      <TrustItem icon={<Building2/>} title="School Approved" text="Official school catalogues"/>
      <TrustItem icon={<Sparkles/>} title="Premium Quality" text="Comfortable fabrics"/>
      <TrustItem icon={<ShoppingBag/>} title="Easy Online Ordering" text="Simple from start to finish"/>
      <TrustItem icon={<Package/>} title="Fast & Reliable Delivery" text="To your selected address"/>
    </section>

    <section id="collections" className="store-section category-section">
      <div className="store-section-head"><div><p className="eyebrow">SHOP YOUR SCHOOL STORE</p><h2>Shop by Category</h2></div><button onClick={onLogin}>View All <ArrowRight size={15}/></button></div>
      <div className="category-grid">
        <CategoryCard image="/boys-uniform.svg" title="Boys Uniforms" text="Shirts, trousers & essentials" onClick={onLogin}/>
        <CategoryCard image="/girls-uniform.svg" title="Girls Uniforms" text="Blouses, skirts & essentials" onClick={onLogin}/>
        <CategoryCard image="/accessories.svg" title="Packages" text="Complete school-ready sets" onClick={onLogin}/>
        <CategoryCard image="/accessories.svg" title="Accessories" text="Shoes, belts, ties & socks" onClick={onLogin}/>
      </div>
    </section>

    <section id="packages" className="store-section featured-section">
      <div className="store-section-head"><div><p className="eyebrow">CURATED FOR THE SCHOOL YEAR</p><h2>Featured Collections</h2></div><button onClick={onLogin}>View All <ArrowRight size={15}/></button></div>
      <div className="featured-grid">
        <CollectionCard image="/boys-uniform.svg" title="Boys Uniforms" text="The everyday essentials, ready to order." onClick={onLogin}/>
        <CollectionCard image="/girls-uniform.svg" title="Girls Uniforms" text="Comfort, fit and school-approved style." onClick={onLogin}/>
        <CollectionCard image="/accessories.svg" title="Complete Packages" text="Everything you need in one package." onClick={onLogin}/>
      </div>
    </section>

    <section id="size-guide" className="story-section">
      <div className="story-image"><img src="/girls-uniform.svg" alt="School uniform collection"/><div className="story-tag">QUALITY<br/><strong>YOU CAN SEE</strong></div></div>
      <div className="story-copy"><p className="eyebrow">MADE FOR EVERY SCHOOL DAY</p><h2>Uniforms that look right.<br/><em>Feel right too.</em></h2><p>From the first day of term to the final school bell, Artisan makes it easier to get the right uniform, the right size and the right school-approved products.</p><div className="story-points"><span><CheckCircle2/> School-approved collections</span><span><CheckCircle2/> Easy size selection</span><span><CheckCircle2/> Complete packages available</span></div><button className="hero-primary" onClick={onLogin}>Explore the Store <ArrowRight size={17}/></button></div>
    </section>

    <section id="accessories" className="lifestyle-section">
      <div className="lifestyle-heading"><p className="eyebrow">MORE THAN UNIFORMS</p><h2>Everything for<br/><em>their school journey.</em></h2><p>Uniforms, accessories and complete packages designed around the real school day.</p></div>
      <div className="lifestyle-cards"><LifeCard image="/boys-uniform.svg" title="In the Classroom" /><LifeCard image="/girls-uniform.svg" title="Ready for the Day" /><LifeCard image="/accessories.svg" title="Every Detail" /><LifeCard image="/boys-uniform.svg" title="Built to Belong" /></div>
    </section>

    <section className="benefit-band"><Benefit icon={<CheckCircle2/>} title="School Approved" text="Official products"/><Benefit icon={<Sparkles/>} title="Comfortable Fit" text="Made for everyday wear"/><Benefit icon={<Package/>} title="Complete Packages" text="Save time & effort"/><Benefit icon={<ShoppingBag/>} title="Trusted Shopping" text="Simple online ordering"/></section>

    <section id="support" className="store-cta"><div><p className="eyebrow">READY FOR THE NEW TERM?</p><h2>Everything your student needs.<br/><em>One simple place.</em></h2></div><button onClick={onLogin}>Enter Your School Store <ArrowRight size={17}/></button></section>

    <footer className="store-footer"><div className="footer-brand"><img className="brand-logo" src="/logo.png" alt="Artisan"/><p>School uniforms, made simple.</p></div><div className="footer-nav"><div><strong>Shop</strong><a href="#collections">Uniforms</a><a href="#packages">Packages</a><a href="#accessories">Accessories</a></div><div><strong>Help</strong><a href="#size-guide">Size Guide</a><a onClick={onLogin}>Parent / Student Login</a><a>Support</a></div><div><strong>Information</strong><a>About Artisan</a><a>Terms & Conditions</a><a>Privacy Policy</a></div></div><div className="footer-bottom"><span>© 2026 Artisan. All rights reserved.</span><span>School-specific shopping • Secure access</span></div></footer>
  </main>
}
function TrustItem({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="trust-item"><div>{icon}</div><span><strong>{title}</strong><small>{text}</small></span></div>}
function CategoryCard({image,title,text,onClick}:{image:string;title:string;text:string;onClick:()=>void}){return <button className="category-card" onClick={onClick}><img src={image} alt=""/><div><strong>{title}</strong><span>{text}</span></div><ArrowRight size={15}/></button>}
function CollectionCard({image,title,text,onClick}:{image:string;title:string;text:string;onClick:()=>void}){return <button className="collection-card" onClick={onClick}><img src={image} alt=""/><div><strong>{title}</strong><span>{text}</span><em>Shop Now <ArrowRight size={13}/></em></div></button>}
function LifeCard({image,title}:{image:string;title:string}){return <div className="life-card"><img src={image} alt=""/><span>{title}</span></div>}
function Benefit({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="benefit-item"><div>{icon}</div><span><strong>{title}</strong><small>{text}</small></span></div>}
function Feature({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="feature"><div className="feature-icon">{icon}</div><div><strong>{title}</strong><p>{text}</p></div></div>}
function Step({n,title,text}:{n:string;title:string;text:string}){return <div className="step"><span>{n}</span><h3>{title}</h3><p>{text}</p></div>}

function CustomerPortal({schoolName,branchName,studentId,page,setPage,onLogout}:{schoolName:string;branchName:string;studentId:string;page:CustomerPage;setPage:(p:CustomerPage)=>void;onLogout:()=>void}){
  const [cart,setCart]=useState<CartItem[]>([]),[checkout,setCheckout]=useState<CheckoutStep|null>(null),[selected,setSelected]=useState<CartItem|null>(null)
  const add=(item:CartItem)=>setCart(items=>{const f=items.find(x=>x.id===item.id&&x.size===item.size);return f?items.map(x=>x.id===item.id&&x.size===item.size?{...x,quantity:x.quantity+item.quantity}:x):[...items,item]})
  const update=(id:string,d:number)=>setCart(items=>items.map(x=>x.id===id?{...x,quantity:Math.max(1,x.quantity+d)}:x))
  const remove=(id:string)=>setCart(items=>items.filter(x=>x.id!==id))
  const total=cart.reduce((s,x)=>s+x.price*x.quantity,0)
  if(checkout)return <CheckoutFlow cart={cart} total={total} step={checkout} setStep={setCheckout} update={update} remove={remove} onComplete={()=>{setCart([]);setCheckout('success')}}/>
  if(selected)return <ProductDetail item={selected} onBack={()=>setSelected(null)} onAdd={x=>{add(x);setSelected(null)}}/>
  const nav=[['dashboard','Dashboard',Home],['packages','Uniform Packages',Package],['products','Individual Products',ShoppingBag],['orders','My Orders',ClipboardList],['profile','Profile',UserRound]] as const
  return <div className="portal"><aside className="sidebar"><div className="portal-brand"><img className="brand-logo" src="/logo.png" alt="Artisan" /><div><span>Parent Portal</span></div></div><div className="school-scope"><Building2 size={16}/><div><strong>{schoolName}</strong><span>{branchName}</span></div></div><nav>{nav.map(([key,label,Icon])=><button className={page===key?'active':''} onClick={()=>setPage(key)} key={key}><Icon size={18}/>{label}</button>)}</nav><button className="sidebar-logout" onClick={onLogout}><LogOut size={17}/> Logout</button></aside><main className="portal-main"><header className="portal-header"><div><p className="eyebrow">{branchName}</p><h1>{page==='dashboard'?'Good morning':page==='packages'?'Uniform Packages':page==='products'?'Individual Products':page==='orders'?'My Orders':'My Profile'}{page==='dashboard'&&<span>, {studentId}</span>}</h1></div><div className="portal-header-actions"><button className="cart-button" onClick={()=>setCheckout('cart')}><ShoppingCart size={19}/><span>Cart</span>{cart.length>0&&<b>{cart.reduce((s,x)=>s+x.quantity,0)}</b>}</button><div className="header-user"><div className="avatar">{studentId.slice(0,1).toUpperCase()}</div><div><strong>{studentId}</strong><span>Parent / Student</span></div></div></div></header>{page==='dashboard'?<Dashboard setPage={setPage}/>:page==='packages'?<Packages onView={setSelected} onAdd={add}/>:page==='products'?<Products onView={setSelected} onAdd={add}/>:page==='orders'?<Orders/>:<Profile studentId={studentId}/>}</main></div>
}
function Dashboard({setPage}:{setPage:(p:CustomerPage)=>void}){return <div className="portal-content"><div className="welcome-banner"><div><p className="eyebrow">YOUR SCHOOL STORE</p><h2>Uniform shopping, organized for you.</h2><p>Choose a complete package for the term or replace individual items as needed.</p><button className="hero-primary" onClick={()=>setPage('packages')}>Explore Uniform Packages <ArrowRight size={17}/></button></div><div className="banner-icon"><ShoppingBag size={58}/></div></div><div className="portal-grid"><Stat title="Active orders" value="0" icon={<ClipboardList/>}/><Stat title="Saved items" value="0" icon={<Package/>}/><Stat title="School branch" value="Active" icon={<Building2/>}/></div><div className="section-row"><p className="eyebrow">SHOP</p><h2>Start with what you need</h2></div><div className="shop-cards"><ShopCard icon={<Package/>} title="Uniform Packages" text="Complete boys and girls packages assembled from approved school products." action="View packages" onClick={()=>setPage('packages')}/><ShopCard icon={<ShoppingBag/>} title="Individual Products" text="Buy or replace individual shirts, pants, shoes, socks, belts and more." action="Browse products" onClick={()=>setPage('products')}/></div></div>}
function Stat({title,value,icon}:{title:string;value:string;icon:React.ReactNode}){return <div className="stat"><div>{icon}</div><span>{title}</span><strong>{value}</strong></div>}
function ShopCard({icon,title,text,action,onClick}:{icon:React.ReactNode;title:string;text:string;action:string;onClick:()=>void}){return <div className="shop-card"><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p><button onClick={onClick}>{action}<ArrowRight size={16}/></button></div>}
function Packages({onView,onAdd}:{onView:(x:CartItem)=>void;onAdd:(x:CartItem)=>void}){const items=[{id:'boys-package',title:'Boys Uniform Package',type:'package' as const,price:4999,text:'Complete daily uniform essentials',badge:'BOYS'},{id:'girls-package',title:'Girls Uniform Package',type:'package' as const,price:4999,text:'Complete daily uniform essentials',badge:'GIRLS'},{id:'sports-package',title:'Sports Uniform Package',type:'package' as const,price:2499,text:'Sports and activity essentials',badge:'SPORTS'}];return <div className="portal-content"><CatalogHeading eyebrow="PACKAGES" title="Uniform Packages" text="Complete school-approved sets, built from the same individual products available in the store."/><div className="catalog-grid">{items.map(x=><ProductCard key={x.id} {...x} onView={()=>onView({...x,quantity:1})} onAdd={()=>onAdd({...x,quantity:1})}/>)}</div></div>}
function Products({onView,onAdd}:{onView:(x:CartItem)=>void;onAdd:(x:CartItem)=>void}){const items=[['shirt','School Shirt','Approved daily uniform shirt',799],['trousers','School Trousers','Approved daily uniform trousers',1099],['belt','School Belt','Approved uniform belt',299],['tie','School Tie','Approved school tie',249],['socks','School Socks','Approved uniform socks',199],['shoes','School Shoes','Approved black school shoes',1599]].map(([id,title,text,price])=>({id:id as string,title:title as string,text:text as string,price:price as number,type:'product' as const}));return <div className="portal-content"><CatalogHeading eyebrow="PRODUCTS" title="Individual Products" text="Find a single item, select the right size and add it to your order."/><div className="catalog-toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search products"/></div><select><option>All categories</option><option>Shirts</option><option>Pants</option><option>Shoes</option><option>Accessories</option></select></div><div className="catalog-grid">{items.map(x=><ProductCard key={x.id} {...x} onView={()=>onView({...x,quantity:1})} onAdd={()=>onAdd({...x,quantity:1})}/>)}</div></div>}
function ProductCard({badge,title,text,price,onView,onAdd,id,type}:{badge?:string;title:string;text:string;price:number;onView:()=>void;onAdd:()=>void;id:string;type:'package'|'product'}){const visual=id.includes('girls')||title.toLowerCase().includes('girls')?'/girls-uniform.svg':id.includes('boys')||title.toLowerCase().includes('boys')?'/boys-uniform.svg':'/accessories.svg';return <article className="product-card"><button className="product-image product-image-button" onClick={onView}><img src={visual} alt="" />{badge&&<span>{badge}</span>}<i className="quick-view">View</i></button><div className="product-copy"><p>{text}</p><h3>{title}</h3><div className="price-row"><strong>₹{price.toLocaleString('en-IN')}</strong><span>School approved</span></div><div className="product-actions"><button onClick={onView}>View details</button><button className="add-button" onClick={onAdd}>Add to cart <ArrowRight size={15}/></button></div></div></article>}
function CatalogHeading({eyebrow,title,text}:{eyebrow:string;title:string;text:string}){return <div className="section-heading portal-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></div>}
function ProductDetail({item,onBack,onAdd}:{item:CartItem;onBack:()=>void;onAdd:(x:CartItem)=>void}){const [size,setSize]=useState(''),[quantity,setQuantity]=useState(1);return <div className="checkout-page"><div className="checkout-top"><button onClick={onBack}><ChevronLeft size={18}/> Back to store</button><strong>Product Details</strong></div><div className="detail-card"><div className="detail-image"><img src={item.title.toLowerCase().includes('girls')?'/girls-uniform.svg':item.title.toLowerCase().includes('boys')?'/boys-uniform.svg':'/accessories.svg'} alt="" /></div><div className="detail-copy"><p className="eyebrow">{item.type==='package'?'UNIFORM PACKAGE':'INDIVIDUAL PRODUCT'}</p><h1>{item.title}</h1><p>School-approved product for your selected school and branch. Final availability and pricing are controlled by the school catalog.</p><strong className="detail-price">₹{item.price.toLocaleString('en-IN')}</strong><label>Size<select value={size} onChange={e=>setSize(e.target.value)}><option value="">Select size</option>{['XS','S','M','L','XL','XXL'].map(x=><option key={x}>{x}</option>)}</select></label><div className="quantity"><span>Quantity</span><button onClick={()=>setQuantity(Math.max(1,quantity-1))}><Minus/></button><b>{quantity}</b><button onClick={()=>setQuantity(quantity+1)}><Plus/></button></div><button className="primary-button" disabled={!size} onClick={()=>onAdd({...item,size,quantity})}>Add to Cart <ShoppingCart size={18}/></button></div></div></div>}
function CheckoutFlow({cart,total,step,setStep,update,remove,onComplete}:{cart:CartItem[];total:number;step:CheckoutStep;setStep:(x:CheckoutStep|null)=>void;update:(id:string,d:number)=>void;remove:(id:string)=>void;onComplete:()=>void}){const [address,setAddress]=useState({name:'',phone:'',line1:'',city:'',state:'Telangana',pincode:''});if(step==='success')return <div className="checkout-page"><div className="success-card"><div className="success-icon"><CheckCircle2 size={48}/></div><p className="eyebrow">ORDER CONFIRMED</p><h1>Thank you for your order.</h1><p>Your order has been recorded for the selected school branch.</p><strong>Order #SU-2026-0001</strong><button className="primary-button" onClick={()=>setStep(null)}>Back to Store</button></div></div>;if(step==='cart')return <div className="checkout-page"><div className="checkout-top"><button onClick={()=>setStep(null)}><ChevronLeft/> Continue shopping</button><strong>Your Cart</strong></div><div className="checkout-layout"><div className="cart-card"><h1>Review your items</h1>{cart.length===0?<div className="empty-state"><ShoppingCart size={40}/><h3>Your cart is empty</h3></div>:cart.map(x=><div className="cart-row" key={x.id}><div className="cart-thumb"><ShoppingBag/></div><div><strong>{x.title}</strong><span>{x.size?('Size '+x.size+' • '):''}₹{x.price.toLocaleString('en-IN')} each</span><div className="qty-controls"><button onClick={()=>update(x.id,-1)}><Minus/></button><b>{x.quantity}</b><button onClick={()=>update(x.id,1)}><Plus/></button></div></div><strong>₹{(x.price*x.quantity).toLocaleString('en-IN')}</strong><button className="remove-button" onClick={()=>remove(x.id)}><Trash2 size={17}/></button></div>)}</div><OrderSummary total={total} disabled={!cart.length} onNext={()=>setStep('details')}/></div></div>;if(step==='details')return <CheckoutDetails address={address} setAddress={setAddress} onBack={()=>setStep('cart')} onNext={()=>setStep('payment')}/>;return <PaymentStep total={total} onBack={()=>setStep('details')} onPay={onComplete}/>}
function OrderSummary({total,disabled,onNext}:{total:number;disabled:boolean;onNext:()=>void}){return <aside className="order-summary"><h3>Order Summary</h3><div><span>Subtotal</span><strong>₹{total.toLocaleString('en-IN')}</strong></div><div><span>Delivery</span><strong>Calculated at checkout</strong></div><div className="summary-total"><span>Total</span><strong>₹{total.toLocaleString('en-IN')}</strong></div><button className="primary-button" disabled={disabled} onClick={onNext}>Checkout <ArrowRight size={17}/></button></aside>}
function CheckoutDetails({address,setAddress,onBack,onNext}:{address:{name:string;phone:string;line1:string;city:string;state:string;pincode:string};setAddress:(x:any)=>void;onBack:()=>void;onNext:()=>void}){const ok=Object.values(address).every(Boolean);return <div className="checkout-page"><div className="checkout-top"><button onClick={onBack}><ChevronLeft/> Cart</button><strong>Delivery Details</strong></div><div className="checkout-form-card"><p className="eyebrow">STEP 1 OF 2</p><h1>Where should we deliver?</h1><div className="checkout-form-grid">{[['name','Full name'],['phone','Phone'],['line1','Address'],['city','City'],['state','State'],['pincode','PIN code']].map(([k,label])=><label key={k}>{label}<input value={(address as any)[k]} onChange={e=>setAddress({...address,[k]:e.target.value})}/></label>)}</div><button className="primary-button" disabled={!ok} onClick={onNext}>Continue to Payment <ArrowRight/></button></div></div>}
function PaymentStep({total,onBack,onPay}:{total:number;onBack:()=>void;onPay:()=>void}){const [method,setMethod]=useState('online');return <div className="checkout-page"><div className="checkout-top"><button onClick={onBack}><ChevronLeft/> Delivery</button><strong>Payment</strong></div><div className="payment-card"><p className="eyebrow">STEP 2 OF 2</p><h1>Choose payment method</h1><label className="payment-option"><input type="radio" checked={method==='online'} onChange={()=>setMethod('online')}/><CreditCard/><div><strong>Online Payment</strong><span>Secure payment gateway</span></div></label><label className="payment-option"><input type="radio" checked={method==='cod'} onChange={()=>setMethod('cod')}/><ShoppingBag/><div><strong>Pay at School</strong><span>Available if enabled by your school</span></div></label><div className="payment-total"><span>Payable</span><strong>₹{total.toLocaleString('en-IN')}</strong></div><button className="primary-button" onClick={onPay}>Place Order <CheckCircle2 size={18}/></button></div></div>}
function Orders(){return <div className="portal-content"><CatalogHeading eyebrow="ORDERS" title="My Orders" text="Track your school uniform orders and view previous purchases."/><div className="empty-state"><ClipboardList size={42}/><h3>No orders yet</h3><p>Your completed orders will appear here.</p></div></div>}
function Profile({studentId}:{studentId:string}){return <div className="portal-content"><CatalogHeading eyebrow="ACCOUNT" title="My Profile" text="Your school account information."/><div className="profile-card"><div className="profile-avatar">{studentId.slice(0,1).toUpperCase()}</div><div><span>Login ID</span><strong>{studentId}</strong></div><div><span>Account type</span><strong>Parent / Student</strong></div><div><span>Access</span><strong>School Store</strong></div></div></div>}

function AdminModule({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <button className="admin-module" disabled><div className="feature-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><span className="module-soon">Coming next</span></button>}

function AdminPortal({onBack}:{onBack:()=>void}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[admin,setAdmin]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('')
  const [schools,setSchools]=useState<SchoolOption[]>([]),[branches,setBranches]=useState<BranchOption[]>([]),[school,setSchool]=useState(''),[branch,setBranch]=useState(''),[tool,setTool]=useState<'menu'|'parent'|'import'>('menu')
  async function login(){if(!supabase||!email.trim()||!password)return;setLoading(true);setError('');const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error||!data.user){setError('Invalid admin email or password.');setLoading(false);return}const {data:p,error:pe}=await supabase.from('profiles').select('role').eq('id',data.user.id).single();if(pe||!p||!['admin','super_admin'].includes(p.role)){await supabase.auth.signOut({scope:'local'});setError('This account is not authorized for the Admin Portal.');setLoading(false);return}setAdmin(true);setLoading(false)}
  useEffect(()=>{if(!admin||!supabase)return;void supabase.from('schools').select('id,name').eq('status','active').order('name').then(({data})=>setSchools(data??[]))},[admin])
  async function chooseSchool(v:string){setSchool(v);setBranch('');setBranches([]);if(!v||!supabase)return;const {data}=await supabase.from('branches').select('id,name').eq('school_id',v).eq('status','active').order('name');setBranches(data??[])}
  if(!admin)return <div className="admin-login-page"><div className="admin-login-card"><button className="modal-close" onClick={onBack}><X size={20}/></button><div className="brand-mark"><LockKeyhole/></div><p className="eyebrow">ADMINISTRATION</p><h1>Administrator Sign In</h1><p>Manage schools, students, catalogs and orders from the secure admin portal.</p><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@gmail.com" autoComplete="username"/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void login()}} autoComplete="current-password"/>{error&&<p className="login-error">{error}</p>}<button className="primary-button" onClick={()=>void login()} disabled={loading||!email||!password}>{loading?'SIGNING IN...':'ADMIN LOGIN'}</button></div></div>
  if(tool==='parent'&&school&&branch)return <ParentCreate schoolId={school} branchId={branch} onBack={()=>setTool('menu')}/>
  if(tool==='import'&&school&&branch)return <StudentImport schoolId={school} branchId={branch} onBack={()=>setTool('menu')}/>
  return <div className="admin-shell"><header className="admin-topbar"><div className="site-brand"><img className="brand-logo admin-brand-logo" src="/logo.png" alt="Artisan" /><div><span>Administration</span></div></div><button onClick={()=>{void supabase?.auth.signOut({scope:'local'});setAdmin(false)}}><LogOut size={17}/> Logout</button></header><div className="admin-content"><div className="admin-title"><div><p className="eyebrow">ADMIN DASHBOARD</p><h1>Student & Parent Management</h1><p>Create test accounts individually or import your student register in bulk.</p></div></div><div className="admin-scope-card"><div><span>School</span><strong>{schools.find(x=>x.id===school)?.name??'Select school'}</strong></div><div><span>Branch</span><strong>{branches.find(x=>x.id===branch)?.name??'Select branch'}</strong></div></div><div className="admin-selector-grid"><label>School<select value={school} onChange={e=>void chooseSchool(e.target.value)}><option value="">Select school</option>{schools.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Branch<select value={branch} disabled={!school} onChange={e=>{setBranch(e.target.value);setTool('menu')}}><option value="">Select branch</option>{branches.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div><div className="admin-action-grid"><button disabled={!school||!branch} onClick={()=>setTool('parent')}><UserRound/><div><strong>Create Parent Login</strong><span>Create one parent + student account for testing.</span></div><ArrowRight/></button><button disabled={!school||!branch} onClick={()=>setTool('import')}><FileSpreadsheet/><div><strong>Bulk Student Import</strong><span>Upload Excel or CSV student records.</span></div><ArrowRight/></button></div><div className="admin-module-grid"><AdminModule icon={<Building2/>} title="Schools & Branches" text="Manage school campuses and branch details."/><AdminModule icon={<ShoppingBag/>} title="Products & Variants" text="Manage shirts, pants, shoes, sizes and SKUs."/><AdminModule icon={<Package/>} title="Uniform Packages" text="Build boys and girls packages from individual products."/><AdminModule icon={<ClipboardList/>} title="Orders" text="Review orders, statuses and customer details."/><AdminModule icon={<CreditCard/>} title="Payments" text="Track payment status and transaction references."/><AdminModule icon={<ClipboardList/>} title="Inventory" text="Monitor stock and inventory movements."/><AdminModule icon={<UserRound/>} title="Parents & Students" text="Manage student profiles and parent relationships."/><AdminModule icon={<FileSpreadsheet/>} title="Reports" text="Sales, inventory and school-level reporting."/><AdminModule icon={<BookOpen/>} title="Catalog Rules" text="Configure school-specific products and pricing."/><AdminModule icon={<Sparkles/>} title="Coupons" text="Manage branch-specific promotions and discounts."/></div></div></div>
}

export default App
