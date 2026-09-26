import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, Check, Filter, Star, X } from 'lucide-react'
import { supabase } from './lib/supabase'

type Review = {
  id: string
  reviewer_name: string
  rating: number
  title: string | null
  review: string | null
  verified_purchase: boolean
  created_at: string
}

export default function ProductReviews({ productId }: { productId?: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<number | null>(null)
  const [sort, setSort] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [openForm, setOpenForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    if (!supabase || !productId) {
      setReviews([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('product_reviews')
      .select('id,reviewer_name,rating,title,review,verified_purchase,created_at')
      .eq('product_id', productId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    setReviews(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
    if (!supabase || !productId) return
    const channel = (supabase as any)
      .channel('product-reviews-' + productId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_reviews',
          filter: 'product_id=eq.' + productId,
        },
        () => void load(),
      )
      .subscribe()
    return () => {
      void (supabase as any).removeChannel(channel)
    }
  }, [productId])

  const visible = useMemo(() => {
    const rows = filter ? reviews.filter((x) => x.rating === filter) : [...reviews]
    if (sort === 'highest') rows.sort((a, b) => b.rating - a.rating)
    if (sort === 'lowest') rows.sort((a, b) => a.rating - b.rating)
    return rows
  }, [reviews, filter, sort])

  const average = reviews.length
    ? reviews.reduce((sum, x) => sum + x.rating, 0) / reviews.length
    : 0

  const submit = async () => {
    if (!supabase || !productId) return
    setSaving(true)
    setMessage('')
    const { data: auth } = await (supabase as any).auth.getUser()
    const user = auth?.user
    if (!user) {
      setMessage('Please sign in to write a review.')
      setSaving(false)
      return
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const { error } = await (supabase as any).from('product_reviews').insert({
      product_id: productId,
      customer_user_id: user.id,
      reviewer_name:
        profile?.full_name?.trim() ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Customer',
      rating,
      title: title.trim() || null,
      review: body.trim() || null,
      status: 'published',
    })

    if (error) setMessage(error.message)
    else {
      setOpenForm(false)
      setRating(5)
      setTitle('')
      setBody('')
      await load()
    }
    setSaving(false)
  }

  if (!productId) return null

  return (
    <section className="product-reviews">
      <div className="product-reviews-header">
        <div>
          <h2>Customer Reviews</h2>
          <div className="product-review-summary">
            <strong>{reviews.length ? average.toFixed(1) : '0.0'}</strong>
            <span>{reviews.length} reviews</span>
          </div>
        </div>
        <div className="product-review-actions">
          <button className="review-write-button" onClick={() => setOpenForm(true)}>
            Write a review
          </button>
          <button
            className={filter ? 'review-icon-button active' : 'review-icon-button'}
            aria-label="Filter reviews"
            onClick={() => setFilter(filter ? null : 5)}
          >
            <Filter size={18} />
          </button>
          <button
            className="review-icon-button"
            aria-label="Sort reviews"
            onClick={() =>
              setSort((x) => (x === 'newest' ? 'highest' : x === 'highest' ? 'lowest' : 'newest'))
            }
          >
            <ArrowDownUp size={18} />
          </button>
        </div>
      </div>

      {filter ? (
        <div className="review-filter-bar">
          Showing {filter}-star reviews
          <button onClick={() => setFilter(null)}>
            Clear <X size={13} />
          </button>
        </div>
      ) : null}

      {message && !openForm ? <p className="review-message">{message}</p> : null}

      {loading ? (
        <div className="review-empty">Loading reviews...</div>
      ) : visible.length ? (
        <div className="review-list">
          {visible.map((item) => (
            <article className="review-item" key={item.id}>
              <div className="review-stars" aria-label={item.rating + ' out of 5 stars'}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={23} fill={index < item.rating ? 'currentColor' : 'none'} />
                ))}
              </div>
              <div className="review-author">
                <span className="review-avatar">
                  {(item.reviewer_name || 'C').slice(0, 1).toUpperCase()}
                </span>
                <strong>{item.reviewer_name}</strong>
                {item.verified_purchase ? (
                  <span className="review-verified">
                    <Check size={12} /> Verified
                  </span>
                ) : null}
              </div>
              <time>
                {new Date(item.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                })}
              </time>
              {item.title ? <h3>{item.title}</h3> : null}
              {item.review ? <p>{item.review}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="review-empty">
          <Star size={28} />
          <h3>No reviews yet</h3>
          <p>Be the first customer to review this product.</p>
        </div>
      )}

      {openForm ? (
        <div className="review-form-overlay" role="dialog" aria-modal="true">
          <div className="review-form">
            <button className="review-form-close" onClick={() => setOpenForm(false)} aria-label="Close">
              <X size={18} />
            </button>
            <h2>Write a review</h2>
            <p>Share your experience with this product.</p>
            <label>Rating</label>
            <div className="review-rating-picker">
              {Array.from({ length: 5 }).map((_, index) => (
                <button key={index} onClick={() => setRating(index + 1)} aria-label={index + 1 + ' stars'}>
                  <Star size={29} fill={index < rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Very good quality" />
            <label>Review</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell other parents about the product..."
              rows={5}
            />
            {message ? <p className="review-message">{message}</p> : null}
            <button className="review-submit-button" onClick={() => void submit()} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit review'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
