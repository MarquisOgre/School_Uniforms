import { useEffect, useState } from 'react'
import { GlobalHeader } from './components/GlobalChrome'
import { supabase } from './lib/supabase'

export default function CmsPage({ kind = 'page', slug }: { kind?: 'page' | 'post'; slug: string }) {
  const [record, setRecord] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const table = kind === 'post' ? 'site_posts' : 'site_pages'
      const r = await (supabase as any)
        ?.from(table)
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (cancelled) return
      if (r?.error) setError(r.error.message)
      else setRecord(r?.data || null)
      setLoading(false)
    })().catch((e) => {
      if (!cancelled) {
        setError(String(e))
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [kind, slug])
  if (loading)
    return (
      <div className="session-loading">
        <span>Loading page...</span>
      </div>
    )
  if (error || !record)
    return (
      <div className="workspace-empty">
        <h2>Page not found</h2>
        <p>{error || 'This page is not published.'}</p>
      </div>
    )
  const blocks = Array.isArray(record.content?.blocks) ? record.content.blocks : []
  return (
    <>
      <GlobalHeader portal="customer" title="" />
      {menuItems.length ? (
        <nav className="cms-public-nav">
          {menuItems.map((item: any) => (
            <a key={item.id} href={item.url}>
              {item.label}
            </a>
          ))}
        </nav>
      ) : null}
      <main className="cms-public-page">
        <div className="cms-public-inner">
          <p className="eyebrow">{kind === 'post' ? 'BLOG' : 'PAGE'}</p>
          <h1>{record.title}</h1>
          {record.excerpt ? <p className="cms-public-excerpt">{record.excerpt}</p> : null}
          <div className="cms-public-content">
            {blocks.length ? (
              blocks.map((b: any, i: number) => (
                <section key={i}>
                  {b.heading ? <h2>{b.heading}</h2> : null}
                  {b.text ? <p>{b.text}</p> : null}
                  {b.image ? <img src={b.image} alt={b.alt || ''} /> : null}
                </section>
              ))
            ) : (
              <p>
                This page is ready for content. Use the Admin Commerce & CMS editor to populate
                structured blocks.
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
