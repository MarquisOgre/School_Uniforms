import { useEffect, useState } from 'react'
import type React from 'react'
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  ChevronLeft,
  LockKeyhole,
  MapPin,
  Menu,
  Package,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { applySiteFavicon, DEFAULT_LOGO_URL, loadSiteBranding } from './lib/branding'

export type SchoolOption = { id: string; name: string }
export type BranchOption = { id: string; name: string }

export const DEFAULT_HOME: any = {
  sections: {
    hero: true,
    trust: true,
    categories: true,
    featured: true,
    afterFold: true,
    benefits: true,
    cta: true,
    footer: true,
  },
  hero: {
    slides: [
      {
        eyebrow: 'PREMIUM SCHOOL UNIFORMS',
        title: ['Dress for', 'Brighter', 'Tomorrows.'],
        text: 'Quality uniforms for confident learners. Shop school-approved uniforms, packages and accessories — all in one place.',
        image: '/hero-slide-1.jpg',
        button: 'Shop Uniforms',
        secondary: 'View Packages',
        enabled: true,
      },
      {
        eyebrow: 'SCHOOL UNIFORMS',
        title: ['Confidence', 'Looks Good', 'On You'],
        text: 'Official school uniforms, curated packages and quality accessories — designed for every step of their journey.',
        image: '/hero-slide-2.jpg',
        button: 'Shop Uniforms',
        secondary: 'View Packages',
        enabled: true,
      },
      {
        eyebrow: 'UNIFORMS THAT INSPIRE',
        title: ['Quality Today', 'for Greater', 'Tomorrow'],
        text: 'Premium school uniforms crafted with care, comfort and confidence for every school day.',
        image: '/hero-slide-3.jpg',
        button: 'Shop Uniforms',
        secondary: 'View Packages',
        enabled: true,
      },
    ],
  },
  trust: [
    { title: 'School Approved', text: 'Official uniforms', enabled: true },
    { title: 'Premium Quality', text: 'Comfortable & Durable', enabled: true },
    { title: 'Easy Online Ordering', text: 'Hassle free shopping', enabled: true },
    { title: 'Fast & Reliable Delivery', text: 'To your doorstep', enabled: true },
  ],
  categories: [
    { title: 'Boys Uniforms', image: '/category-boys.jpg', target: 'uniforms', enabled: true },
    { title: 'Girls Uniforms', image: '/category-girls.jpg', target: 'uniforms', enabled: true },
    { title: 'Packages', image: '/category-packages.jpg', target: 'packages', enabled: true },
    {
      title: 'Accessories',
      image: '/category-accessories.jpg',
      target: 'accessories',
      enabled: true,
    },
  ],
  featured: [
    {
      title: 'Boys Uniforms',
      text: 'Premium quality & comfort for every school day.',
      image: '/category-boys.jpg',
      target: 'uniforms',
      enabled: true,
    },
    {
      title: 'Girls Uniforms',
      text: 'Premium quality & comfort for every school day.',
      image: '/category-girls.jpg',
      target: 'uniforms',
      enabled: true,
    },
    {
      title: 'Complete Packages',
      text: 'Everything your child needs in one set.',
      image: '/category-packages.jpg',
      target: 'packages',
      enabled: true,
    },
  ],
  afterFold: {
    eyebrow: 'MADE FOR EVERY SCHOOL DAY',
    title: ['Uniforms that look right.', 'Feel right too.'],
    text: 'From the first day of term to the final school bell, Artisan makes it easier to get the right uniform, the right size and the right school-approved products.',
    button: 'Explore the Store',
    image: '/hero-slide-3.jpg',
    enabled: true,
  },
  benefits: [
    { title: 'School Approved', text: 'Official products', enabled: true },
    { title: 'Comfortable Fit', text: 'Made for everyday wear', enabled: true },
    { title: 'Complete Packages', text: 'Save time & effort', enabled: true },
    { title: 'Trusted Shopping', text: 'Simple online ordering', enabled: true },
  ],
  cta: {
    eyebrow: 'READY FOR THE NEW TERM?',
    title: ['Everything your student needs.', 'One simple place.'],
    button: 'Enter Your School Store',
    enabled: true,
  },
  footer: {
    tagline: 'School uniforms, made simple.',
    shopTitle: 'Shop',
    helpTitle: 'Help',
    informationTitle: 'Information',
    copyright: '© 2026 Artisan. All rights reserved.',
    credit: 'Developed by Dexorzo Creations.',
    secondary: 'School-specific shopping • Secure access',
  },
}

function Landing({ onLogin }: { onLogin: () => void }) {
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL)
  useEffect(() => {
    const load = () => { void loadSiteBranding().then((branding) => { setLogoUrl(branding.logoUrl); applySiteFavicon(branding.faviconUrl) }) }
    load()
    const onUpdate = (event: Event) => { const detail = (event as CustomEvent<{logoUrl?: string; faviconUrl?: string}>).detail; if (detail?.logoUrl) setLogoUrl(detail.logoUrl); if (detail?.faviconUrl) applySiteFavicon(detail.faviconUrl) }
    window.addEventListener('site-branding:updated', onUpdate)
    return () => window.removeEventListener('site-branding:updated', onUpdate)
  }, [])
  const [publicPage, setPublicPage] = useState('home')
  const go = (p: string) => {
    setPublicPage(p)
    setMenu(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const [menu, setMenu] = useState(false),
    [slide, setSlide] = useState(0),
    [cartCount] = useState(0),
    [home, setHome] = useState<any>(DEFAULT_HOME),
    [searchOpen, setSearchOpen] = useState(false),
    [search, setSearch] = useState('')
  useEffect(() => {
    const client = supabase
    if (!client) return
    void (client as any)
      .from('homepage_content')
      .select('content')
      .eq('slug', 'default')
      .eq('is_published', true)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data?.content)
          setHome({
            ...DEFAULT_HOME,
            ...data.content,
            sections: { ...DEFAULT_HOME.sections, ...(data.content.sections || {}) },
          })
      })
  }, [])
  const slides = (home.hero?.slides ?? DEFAULT_HOME.hero.slides)
    .filter((item: any) => item.enabled !== false)
    .map((item: any, i: number) => ({
      ...item,
      className: i === 1 ? 'hero-navy' : i === 2 ? 'hero-cream' : 'hero-light',
    }))
  useEffect(() => {
    const count = slides.length
    if (!count) return
    const t = window.setInterval(() => setSlide((s) => (s + 1) % count), 6000)
    return () => window.clearInterval(t)
  }, [slides.length])
  if (publicPage !== 'home')
    return <PublicPage page={publicPage} onLogin={onLogin} onNavigate={go} />
  const current = slides[Math.min(slide, Math.max(0, slides.length - 1))]
  const next = () => setSlide((s) => (s + 1) % slides.length),
    prev = () => setSlide((s) => (s + slides.length - 1) % slides.length)
  return (
    <main className="landing exact-home">
      <header className="store-header exact-header">
        <div className="store-header-inner">
          <button className="brand-button" onClick={() => go('home')} aria-label="Go to home">
            <img className="brand-logo" src={logoUrl} alt="Artisan" />
          </button>
          <nav className={menu ? 'nav-open' : ''}>
            <a className="active" onClick={() => go('home')}>
              Home
            </a>
            <a onClick={() => go('how-it-works')}>How It Works</a>
            <a onClick={() => go('about')}>About</a>
            <a onClick={() => go('contact')}>Contact</a>
          </nav>
          <div className="exact-header-icons">
            <button className="header-login-button" onClick={onLogin}>
              Parent / Student Login <ArrowRight size={15} />
            </button>
          </div>
          <button className="mobile-menu" onClick={() => setMenu((v) => !v)}>
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <section className={`exact-hero ${current.className}`} hidden={home.sections?.hero === false}>
        <div className="exact-hero-copy">
          <p className="eyebrow">{current.eyebrow}</p>
          <h1 key={slide}>
            {current.title.map((x: string, i: number) => (
              <span key={i}>
                {x}
                {i < current.title.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p>{current.text}</p>
          <div className="exact-hero-actions">
            <button onClick={onLogin}>
              {current.button} <ArrowRight size={16} />
            </button>
            <a href="#packages">{current.secondary}</a>
          </div>
          <div className="exact-slider-controls">
            <button onClick={prev} aria-label="Previous">
              <ChevronLeft />
            </button>
            <div>
              {slides.map((_item: any, i: number) => (
                <button
                  key={i}
                  className={i === slide ? 'active' : ''}
                  onClick={() => setSlide(i)}
                  aria-label={'Slide ' + (i + 1)}
                />
              ))}
            </div>
            <button onClick={next} aria-label="Next">
              <ArrowRight />
            </button>
            <span>
              0{slide + 1} / 0{slides.length}
            </span>
          </div>
        </div>
        <div className="exact-hero-image">
          <img
            key={slide}
            src={current.image}
            alt="Students wearing school uniforms"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </section>

      <section className="exact-trust" hidden={home.sections?.trust === false}>
        {home.trust
          .filter((x: any) => x.enabled !== false)
          .map((x: any, i: number) => (
            <TrustExact
              key={i}
              icon={[<Building2 />, <Sparkles />, <ShoppingBag />, <Package />][i % 4]}
              title={x.title}
              text={x.text}
            />
          ))}
      </section>

      <section
        id="collections"
        className="exact-section"
        hidden={home.sections?.categories === false}
      >
        <div className="exact-section-title">
          <h2>Shop by Category</h2>
          <button onClick={() => go('uniforms')}>
            View All <ArrowRight />
          </button>
        </div>
        <div className="exact-category-grid">
          {home.categories
            .filter((x: any) => x.enabled !== false)
            .map((x: any, i: number) => (
              <ExactCategory
                key={i}
                image={x.image}
                title={x.title}
                onClick={() => go(x.target || 'uniforms')}
              />
            ))}
        </div>
      </section>

      <section
        id="packages"
        className="exact-section exact-featured"
        hidden={home.sections?.featured === false}
      >
        <div className="exact-section-title">
          <h2>Featured Collections</h2>
          <button onClick={() => go('uniforms')}>
            View All <ArrowRight />
          </button>
        </div>
        <div className="exact-feature-grid">
          {home.featured
            .filter((x: any) => x.enabled !== false)
            .map((x: any, i: number) => (
              <ExactFeature
                key={i}
                image={x.image}
                title={x.title}
                text={x.text}
                onClick={() => go(x.target || 'uniforms')}
              />
            ))}
        </div>
      </section>

      {home.sections?.afterFold !== false && home.afterFold?.enabled !== false && (
        <section className="exact-after-fold">
          <div>
            <p className="eyebrow">{home.afterFold.eyebrow}</p>
            <h2>
              {home.afterFold.title.map((x: string, i: number) => (
                <span key={i}>
                  {x}
                  {i < home.afterFold.title.length - 1 && <br />}
                </span>
              ))}
            </h2>
            <p>{home.afterFold.text}</p>
            <button onClick={onLogin}>
              {home.afterFold.button} <ArrowRight />
            </button>
          </div>
          <img
            src={home.afterFold.image}
            alt="Artisan school uniforms"
            loading="lazy"
            decoding="async"
          />
        </section>
      )}
      <section
        id="accessories"
        className="exact-benefits"
        hidden={home.sections?.benefits === false}
      >
        {home.benefits
          .filter((x: any) => x.enabled !== false)
          .map((x: any, i: number) => (
            <div key={i}>
              <strong>{x.title}</strong>
              <span>{x.text}</span>
            </div>
          ))}
      </section>
      {home.sections?.cta !== false && home.cta?.enabled !== false && (
        <section id="support" className="exact-cta">
          <div>
            <p className="eyebrow">{home.cta.eyebrow}</p>
            <h2>
              {home.cta.title.map((x: string, i: number) => (
                <span key={i}>
                  {x}
                  {i < home.cta.title.length - 1 && <br />}
                </span>
              ))}
            </h2>
          </div>
          <button onClick={onLogin}>
            {home.cta.button} <ArrowRight />
          </button>
        </section>
      )}
      {home.sections?.footer !== false && (
        <footer className="store-footer exact-footer">
          <div className="footer-brand">
            <img className="brand-logo" src="/logo.png" alt="Artisan" />
            <p>{home.footer.tagline}</p>
          </div>
          <div className="footer-nav">
            <div>
              <strong>Company</strong>
              <a onClick={() => go('about')}>About Artisan</a>
              <a onClick={() => go('how-it-works')}>How It Works</a>
              <a onClick={() => go('contact')}>Contact Us</a>
            </div>
            <div>
              <strong>Support</strong>
              <a onClick={onLogin}>Parent / Student Login</a>
              <a onClick={() => go('help')}>Help Center</a>
              <a onClick={() => go('contact')}>Contact Us</a>
            </div>
            <div>
              <strong>Legal</strong>
              <a onClick={() => go('terms')}>Terms & Conditions</a>
              <a onClick={() => go('privacy')}>Privacy Policy</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              {home.footer.copyright} • {home.footer.credit}
            </span>
            <span>{home.footer.secondary}</span>
          </div>
        </footer>
      )}
    </main>
  )
}

function PublicPage({
  page,
  onLogin,
  onNavigate,
}: {
  page: string
  onLogin: () => void
  onNavigate: (p: string) => void
}) {
  const info: { [key: string]: { eyebrow: string; title: string; text: string } } = {
    'how-it-works': {
      eyebrow: 'HOW IT WORKS',
      title: 'School uniforms, made simple.',
      text: 'Select your school, sign in with the credentials provided by your school, then shop the school-approved uniforms, packages and accessories available to you.',
    },
    uniforms: {
      eyebrow: 'SHOP UNIFORMS',
      title: 'School uniforms, selected for your school.',
      text: 'Browse boys and girls uniform collections after signing in. Your school controls the available products, sizes and pricing.',
    },
    packages: {
      eyebrow: 'COMPLETE SETS',
      title: 'Uniform packages made simple.',
      text: 'Choose a complete school-ready package assembled from approved individual products.',
    },
    accessories: {
      eyebrow: 'THE DETAILS MATTER',
      title: 'Accessories for every school day.',
      text: 'Find approved shoes, belts, ties, socks and other essentials alongside your uniform collection.',
    },
    'size-guide': {
      eyebrow: 'FIT & SIZING',
      title: 'Find the right fit.',
      text: 'Size requirements can differ by school and product. Your authenticated school catalogue shows the applicable sizes.',
    },
    orders: {
      eyebrow: 'YOUR ORDERS',
      title: 'Your orders, all in one place.',
      text: 'Sign in to view orders, delivery information and purchase history for your selected school and branch.',
    },
    help: {
      eyebrow: 'HELP CENTER',
      title: 'Need a hand?',
      text: 'Find answers about school access, ordering, sizes, delivery and account support.',
    },
    about: {
      eyebrow: 'ABOUT ARTISAN',
      title: 'School uniforms, made simple.',
      text: 'Artisan gives schools, parents and students one organized place for school-specific uniform shopping.',
    },
    terms: {
      eyebrow: 'LEGAL',
      title: 'Terms & Conditions',
      text: 'These terms describe general use of the Artisan school uniform storefront. School-specific ordering conditions may also apply.',
    },
    privacy: {
      eyebrow: 'LEGAL',
      title: 'Privacy Policy',
      text: 'Artisan uses authenticated access to provide school-specific catalogues, accounts and ordering services.',
    },
    contact: {
      eyebrow: 'CONTACT US',
      title: 'We are here to help.',
      text: 'Questions about your school store, an order, sizing or access? Send us a message and our support team can help.',
    },
  }
  const d = info[page] ?? info.help
  return (
    <main className="public-page">
      <header className="store-header exact-header">
        <div className="store-header-inner">
          <button className="brand-button" onClick={() => onNavigate('home')}>
            <img className="brand-logo" src="/logo.png" alt="Artisan" />
          </button>
          <nav>
            <a onClick={() => onNavigate('home')}>Home</a>
            <a onClick={() => onNavigate('how-it-works')}>How It Works</a>
            <a onClick={() => onNavigate('about')}>About</a>
            <a onClick={() => onNavigate('contact')}>Contact</a>
          </nav>
          <div className="exact-header-icons">
            <button className="header-login-button" onClick={onLogin}>
              Parent / Student Login <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>
      <section className="public-hero">
        <div>
          <p className="eyebrow">{d.eyebrow}</p>
          <h1>{d.title}</h1>
          <p>{d.text}</p>
          {['uniforms', 'packages', 'accessories', 'orders'].includes(page) && (
            <button onClick={onLogin}>
              Enter Your School Store <ArrowRight />
            </button>
          )}
        </div>
        {['uniforms', 'packages', 'accessories'].includes(page) && (
          <div className="public-card-grid">
            {(page === 'uniforms'
              ? [
                  ['/category-boys.jpg', 'Boys Uniforms'],
                  ['/category-girls.jpg', 'Girls Uniforms'],
                ]
              : page === 'packages'
                ? [['/category-packages.jpg', 'Complete Packages']]
                : [['/category-accessories.jpg', 'Accessories']]
            ).map(([img, title]) => (
              <button key={title} onClick={onLogin}>
                <img src={img} alt="" loading="lazy" decoding="async" />
                <strong>{title}</strong>
                <span>
                  Sign in to shop <ArrowRight />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      {page === 'contact' ? (
        <ContactContent />
      ) : page === 'help' ? (
        <HelpContent onNavigate={onNavigate} />
      ) : page === 'size-guide' ? (
        <SizeContent />
      ) : page === 'about' ? (
        <InfoContent title="About Artisan" text={d.text} />
      ) : page === 'terms' ? (
        <InfoContent title="Terms & Conditions" text={d.text} />
      ) : page === 'privacy' ? (
        <InfoContent title="Privacy Policy" text={d.text} />
      ) : (
        <div className="public-bottom-note">
          <p>
            {page === 'orders'
              ? 'Your order history is protected inside your school portal.'
              : 'Secure school-specific shopping'}
          </p>
          <button onClick={onLogin}>
            Parent / Student Login <ArrowRight />
          </button>
        </div>
      )}
      <footer className="store-footer exact-footer">
        <div className="footer-brand">
          <button className="brand-button" onClick={() => onNavigate('home')}>
            <img className="brand-logo" src="/logo.png" alt="Artisan" />
          </button>
          <p>School uniforms, made simple.</p>
        </div>
        <div className="footer-nav">
          <div>
            <strong>Company</strong>
            <a onClick={() => onNavigate('about')}>About Artisan</a>
            <a onClick={() => onNavigate('how-it-works')}>How It Works</a>
            <a onClick={() => onNavigate('contact')}>Contact Us</a>
          </div>
          <div>
            <strong>Support</strong>
            <a onClick={onLogin}>Parent / Student Login</a>
            <a onClick={() => onNavigate('help')}>Help Center</a>
          </div>
          <div>
            <strong>Legal</strong>
            <a onClick={() => onNavigate('terms')}>Terms & Conditions</a>
            <a onClick={() => onNavigate('privacy')}>Privacy Policy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Artisan. All rights reserved. • Developed by Dexorzo Creations.</span>
          <span>School-specific shopping • Secure access</span>
        </div>
      </footer>
    </main>
  )
}
function ContactContent() {
  const [sent, setSent] = useState(false)
  return (
    <section className="public-content contact-layout">
      <div>
        <p className="eyebrow">GET IN TOUCH</p>
        <h2>Contact Artisan</h2>
        <p>For school store access, orders, sizing or delivery questions, send us a message.</p>
        <div className="contact-details">
          <span>
            <Building2 /> School store support
          </span>
          <span>
            <ShoppingBag /> Order & product help
          </span>
          <span>
            <MapPin /> School and branch assistance
          </span>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSent(true)
        }}
      >
        <label>
          Name
          <input required />
        </label>
        <label>
          Email
          <input type="email" required />
        </label>
        <label>
          School / Branch
          <input />
        </label>
        <label>
          Message
          <textarea required rows={5} />
        </label>
        <button type="submit">
          {sent ? 'MESSAGE SENT' : 'SEND MESSAGE'} <ArrowRight />
        </button>
        {sent && (
          <p className="form-success">
            Thanks. Your message has been captured for support follow-up.
          </p>
        )}
      </form>
    </section>
  )
}
function HelpContent({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <section className="public-content faq-grid">
      <div>
        <p className="eyebrow">HELP CENTER</p>
        <h2>Common questions</h2>
      </div>
      <div>
        {[
          [
            'How do I shop for my school?',
            'Select Parent / Student Login and sign in with the credentials provided by your school.',
          ],
          [
            'Why can’t I see another school’s products?',
            'The storefront is school-specific and your authenticated account determines the catalogue.',
          ],
          [
            'Where can I get sizing help?',
            'Use the Size Guide and follow the measurements provided by your school catalogue.',
          ],
          [
            'Need more help?',
            'Use Contact Us and send the school or branch details with your question.',
          ],
        ].map(([q, a]) => (
          <article key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </article>
        ))}
        <button onClick={() => onNavigate('contact')}>
          Contact Us <ArrowRight />
        </button>
      </div>
    </section>
  )
}
function SizeContent() {
  return (
    <section className="public-content size-content">
      <div>
        <p className="eyebrow">SIZE GUIDE</p>
        <h2>Choose the right size with confidence.</h2>
        <p>Once you sign in, the store can show the sizes configured for your school and branch.</p>
      </div>
      <div className="size-table">
        {[
          ['Step 1', 'Open your school store'],
          ['Step 2', 'Select the product'],
          ['Step 3', 'Review available sizes'],
          ['Step 4', 'Choose and add to cart'],
        ].map(([a, b]) => (
          <div key={a}>
            <strong>{a}</strong>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
function InfoContent({ title, text }: { title: string; text: string }) {
  return (
    <section className="public-content legal-content">
      <p className="eyebrow">ARTISAN</p>
      <h2>{title}</h2>
      <p>{text}</p>
      <div>
        <h3>School-specific information</h3>
        <p>
          Where an order, catalogue, payment, delivery or account rule is specific to a school or
          branch, the applicable information shown inside the authenticated school store applies to
          that service.
        </p>
      </div>
    </section>
  )
}
function TrustExact({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="exact-trust-item">
      <div>{icon}</div>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </div>
  )
}
function ExactCategory({
  image,
  title,
  onClick,
}: {
  image: string
  title: string
  onClick: () => void
}) {
  return (
    <button className="exact-category" onClick={onClick}>
      <img src={image} alt="" loading="lazy" decoding="async" />
      <div>
        <strong>{title}</strong>
        <span>
          Shop Now <ArrowRight />
        </span>
      </div>
    </button>
  )
}
function ExactFeature({
  image,
  title,
  text,
  onClick,
}: {
  image: string
  title: string
  text: string
  onClick: () => void
}) {
  return (
    <button className="exact-feature" onClick={onClick}>
      <img src={image} alt="" loading="lazy" decoding="async" />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
        <em>
          Shop Collection <ArrowRight />
        </em>
      </div>
    </button>
  )
}
function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="feature">
      <div className="feature-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
}
function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="step">
      <span>{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

export default function HomePage({
  onLoginSuccess,
  onAdmin,
}: {
  onLoginSuccess: (
    school: string,
    branch: string,
    studentId: string,
    schoolName: string,
    branchName: string,
  ) => void
  onAdmin: () => void
}) {
  const [showLogin, setShowLogin] = useState(false),
    [schools, setSchools] = useState<SchoolOption[]>([]),
    [branches, setBranches] = useState<BranchOption[]>([])
  const [school, setSchool] = useState(''),
    [branch, setBranch] = useState(''),
    [studentId, setStudentId] = useState(''),
    [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false),
    [loadingSchools, setLoadingSchools] = useState(true),
    [loadingBranches, setLoadingBranches] = useState(false),
    [loggingIn, setLoggingIn] = useState(false),
    [error, setError] = useState('')

  useEffect(() => {
    const openLogin = () => setShowLogin(true)
    window.addEventListener('open-parent-login', openLogin)
    return () => window.removeEventListener('open-parent-login', openLogin)
  }, [])

  useEffect(() => {
    if (!showLogin || schools.length) return
    let cancelled = false
    async function load() {
      const client = supabase
      if (!client) {
        setError('Supabase is not configured.')
        setLoadingSchools(false)
        return
      }
      setLoadingSchools(true)
      const { data, error } = await client
        .from('schools')
        .select('id,name')
        .eq('status', 'active')
        .order('name')
      if (cancelled) return
      if (error) setError(`Unable to load schools (${error.code ?? 'unknown'}): ${error.message}`)
      else setSchools(data ?? [])
      setLoadingSchools(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [showLogin, schools.length])
  async function selectSchool(value: string) {
    setSchool(value)
    setBranch('')
    setBranches([])
    setStudentId('')
    setPassword('')
    setError('')
    const client = supabase
    if (!value || !client) return
    setLoadingBranches(true)
    const { data, error } = await client
      .from('branches')
      .select('id,name')
      .eq('school_id', value)
      .eq('status', 'active')
      .order('name')
    if (error) setError(`Unable to load branches (${error.code ?? 'unknown'}): ${error.message}`)
    else {
      const list = data ?? []
      setBranches(list)
      if (list.length === 1) setBranch(list[0].id)
    }
    setLoadingBranches(false)
  }
  async function login() {
    const client = supabase
    if (!client || !school || !branch || !studentId.trim() || !password || loggingIn) return
    setLoggingIn(true)
    setError('')
    const { data, error } = await client.functions.invoke('student-parent-login', {
      body: { school_id: school, branch_id: branch, login_id: studentId.trim(), password },
    })
    if (error || !data?.session) {
      setError(data?.error ?? 'Invalid school, branch, ID, or password.')
      setLoggingIn(false)
      return
    }
    const { error: se } = await client.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    if (se) {
      setError('Login succeeded, but the session could not be created.')
      setLoggingIn(false)
      return
    }
    const schoolName = schools.find((x) => x.id === school)?.name ?? 'Your School'
    const branchName = branches.find((x) => x.id === branch)?.name ?? 'Your Branch'
    localStorage.setItem(
      'school_uniform_portal_context',
      JSON.stringify({
        mode: 'store',
        school,
        branch,
        studentId: studentId.trim(),
        schoolName,
        branchName,
        customerPage: 'dashboard',
      }),
    )
    setShowLogin(false)
    setLoggingIn(false)
    onLoginSuccess(school, branch, studentId.trim(), schoolName, branchName)
  }
  return (
    <>
      <Landing onLogin={() => setShowLogin(true)} />
      {showLogin && (
        <div className="login-overlay">
          <section className="login-card login-card-large">
            <button className="modal-close" onClick={() => setShowLogin(false)} aria-label="Close">
              <X size={20} />
            </button>
            <div className="brand-mark">
              <img className="login-logo-image" src="/logo.png" alt="Artisan" />
            </div>
            <p className="eyebrow">SECURE SCHOOL PORTAL</p>
            <h1>Welcome back</h1>
            <p className="subtitle">
              Select your school and branch, then sign in with the credentials provided by your
              school.
            </p>
            <div className="login-fields-grid">
              <div className="login-field">
                <label>School</label>
                <div className="input-wrap select-wrap">
                  <Building2 size={18} />
                  <select
                    value={school}
                    disabled={loadingSchools}
                    onChange={(e) => void selectSchool(e.target.value)}
                  >
                    <option value="">
                      {loadingSchools ? 'Loading schools...' : 'Select your school'}
                    </option>
                    {schools.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={17} />
                </div>
              </div>
              <div className="login-field">
                <label>Branch</label>
                <div className="input-wrap select-wrap">
                  <MapPin size={18} />
                  <select
                    value={branch}
                    disabled={!school || loadingBranches}
                    onChange={(e) => setBranch(e.target.value)}
                  >
                    <option value="">
                      {!school
                        ? 'Select school first'
                        : loadingBranches
                          ? 'Loading branches...'
                          : branches.length
                            ? 'Select your branch'
                            : 'No active branches'}
                    </option>
                    {branches.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={17} />
                </div>
              </div>
              <div className="login-field">
                <label>Student / Parent ID</label>
                <div className="input-wrap">
                  <input
                    value={studentId}
                    disabled={!branch}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter your ID"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="login-field">
                <label>Password</label>
                <div className="input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    disabled={!branch}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void login()
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    className="icon-button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={!branch}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            {error && <p className="login-error">{error}</p>}
            <button
              className="primary-button"
              disabled={!school || !branch || !studentId.trim() || !password || loggingIn}
              onClick={() => void login()}
            >
              {loggingIn ? 'SIGNING IN...' : 'SIGN IN TO PORTAL'}
              <ArrowRight size={18} />
            </button>
            <div className="demo-credentials" aria-label="Demo user credentials">
              <div className="demo-credentials-title">DEMO USER</div>
              <div className="demo-credentials-grid">
                <div className="demo-credential-row">
                  <span>School</span>
                  <strong>Vignan Schools</strong>
                </div>
                <div className="demo-credential-row">
                  <span>Branch</span>
                  <strong>Vignan's Bo Tree School — Nizampet</strong>
                </div>
                <div className="demo-credential-row">
                  <span>Student / Parent ID</span>
                  <strong>BHUPESHKUMAR</strong>
                </div>
                <div className="demo-credential-row">
                  <span>Password</span>
                  <strong>01031984</strong>
                </div>
              </div>
            </div>
            <button className="text-button">Forgot Password?</button>
            <button
              className="admin-link"
              onClick={() => {
                setShowLogin(false)
                window.history.pushState({}, '', '/admin')
                onAdmin()
              }}
            >
              Administrator Portal
            </button>
          </section>
        </div>
      )}
    </>
  )
}
