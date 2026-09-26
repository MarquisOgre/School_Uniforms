import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  UserRound,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  CreditCard,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from './lib/supabase'

export type CheckoutCartItem = {
  id: string
  title: string
  type: 'package' | 'product'
  price: number
  size?: string
  quantity: number
  sourceId?: string
  image?: string
  text?: string
  bundleItems?: string[]
  sizeOptions?: string[]
  variantOptions?: { id: string; label: string }[]
  bundleComponents?: {
    packageItemId: string
    productId: string
    title: string
    quantity: number
    requiresSize: boolean
    required: boolean
    variants: { id: string; label: string }[]
  }[]
  selectedVariants?: { packageItemId?: string; variantId: string; sizeLabel?: string }[]
}
type StudentOption = {
  id: string
  student_code: string
  full_name: string
  class_name: string | null
  section: string | null
  school_id?: string | null
  branch_id?: string | null
  status?: string | null
}
type Step = 'cart' | 'details' | 'payment' | 'success'
type Address = {
  name: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
}

export default function CheckoutFlow({
  schoolId,
  branchId,
  cart,
  total,
  step,
  setStep,
  update,
  remove,
  students,
  onComplete,
}: {
  schoolId: string
  branchId: string
  cart: CheckoutCartItem[]
  total: number
  step: Step
  setStep: (x: Step | null) => void
  update: (id: string, d: number) => void
  remove: (id: string) => void
  students: StudentOption[]
  onComplete: (result: any) => void
}) {
  const [address, setAddress] = useState<Address>({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: 'Telangana',
    pincode: '',
  })
  const [studentId, setStudentId] = useState('')
  const [checkoutStudents, setCheckoutStudents] = useState<StudentOption[]>(students)
  const [studentLoadError, setStudentLoadError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'pay_at_school'>('pay_at_school')
  const [paymentReference, setPaymentReference] = useState('')
  const [settings, setSettings] = useState<any>({
    pay_at_school_enabled: true,
    upi_enabled: false,
    upi_id: '',
    upi_payee_name: '',
    shipping_fee: 0,
    free_shipping_above: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successOrder, setSuccessOrder] = useState<any>(null)
  const [hydrating, setHydrating] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const client = supabase as any
      if (!client) {
        setHydrating(false)
        return
      }

      const [{ data: userData, error: authError }, { data: settingsData }] = await Promise.all([
        client.auth.getUser(),
        client.from('branch_payment_settings').select('*').eq('branch_id', branchId).maybeSingle(),
      ])

      if (authError) {
        if (!cancelled)
          setStudentLoadError('Your login session could not be verified. Please sign in again.')
      }

      const user = userData?.user
      if (!user?.id) {
        if (!cancelled) {
          setCheckoutStudents([])
          setStudentLoadError('Please sign in before continuing to checkout.')
          setHydrating(false)
        }
        return
      }

      const [{ data: profile }, { data: addressRow }] = await Promise.all([
        client.from('profiles').select('full_name,phone,login_id').eq('id', user.id).maybeSingle(),
        client
          .from('customer_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      // Start with the already-resolved students supplied by the parent portal.
      // AppPortal loads these from the authenticated parent/student relationship,
      // so checkout should not discard them just because a second relationship
      // query is temporarily unavailable or affected by RLS/session timing.
      let resolvedStudents: StudentOption[] = Array.isArray(students) ? students : []

      // Resolve the student's UUID from the actual parent/student relationship
      // as an additional validation/fresh-data path.
      const { data: links } = await client
        .from('parent_student_links')
        .select('student_id,is_primary')
        .eq('parent_user_id', user.id)
        .order('is_primary', { ascending: false })

      const linkedIds = (links ?? []).map((x: any) => x.student_id).filter(Boolean)

      if (linkedIds.length) {
        const { data: linkedStudents } = await client
          .from('students')
          .select('id,student_code,full_name,class_name,section,school_id,branch_id,status')
          .in('id', linkedIds)
          .eq('status', 'active')
          .order('full_name')
        // Prefer the relationship result only when it actually returned rows.
        // Otherwise keep the already-resolved parent portal students.
        if (linkedStudents?.length) resolvedStudents = linkedStudents as StudentOption[]
      }

      // Also support a student account whose students.user_id points directly
      // at the authenticated user.
      if (!resolvedStudents.length) {
        const { data: ownStudents } = await client
          .from('students')
          .select('id,student_code,full_name,class_name,section,school_id,branch_id,status')
          .eq('user_id', user.id)
          .eq('school_id', schoolId)
          .eq('branch_id', branchId)
          .eq('status', 'active')
          .order('full_name')
        resolvedStudents = ownStudents ?? []
      }

      // Legacy fallback: the profile login_id can be the student_code.
      if (!resolvedStudents.length && profile?.login_id) {
        const { data: byCode } = await client
          .from('students')
          .select('id,student_code,full_name,class_name,section,school_id,branch_id,status')
          .eq('student_code', profile.login_id)
          .eq('school_id', schoolId)
          .eq('branch_id', branchId)
          .eq('status', 'active')
          .maybeSingle()
        if (byCode) resolvedStudents = [byCode]
      }

      // Keep the parent portal's already-loaded students as the final fallback.
      if (!resolvedStudents.length && students.length) {
        resolvedStudents = students
      }

      if (cancelled) return

      if (settingsData) setSettings(settingsData)
      setCheckoutStudents(resolvedStudents)

      if (resolvedStudents.length === 1) {
        setStudentId(resolvedStudents[0].id)
        const onlyStudent = resolvedStudents[0]
        setStudentLoadError(
          onlyStudent.school_id &&
            onlyStudent.branch_id &&
            (onlyStudent.school_id !== schoolId || onlyStudent.branch_id !== branchId)
            ? 'Your linked student is active, but the student is assigned to a different school or branch. Please contact the school administrator to correct the student assignment.'
            : '',
        )
      } else if (resolvedStudents.length === 0) {
        setStudentId('')
        setStudentLoadError(
          'No active student link was found for this account. Please ask the school administrator to activate/link the student before placing an order.',
        )
      } else {
        setStudentId('')
        setStudentLoadError('')
      }

      const a = addressRow
      const addressPhone = String(a?.phone || '').replace(/\D/g, '')
      const profilePhone = String(profile?.phone || '').replace(/\D/g, '')
      const resolvedPhone =
        addressPhone.length === 10
          ? addressPhone
          : profilePhone.length === 10
            ? profilePhone
            : addressPhone || profilePhone
      setAddress({
        name: a?.recipient_name || profile?.full_name || '',
        phone: resolvedPhone.slice(0, 10),
        line1: a?.address_line1 || '',
        line2: a?.address_line2 || '',
        city: a?.city || '',
        state: a?.state || 'Telangana',
        pincode: String(a?.postal_code || '')
          .replace(/\D/g, '')
          .slice(0, 6),
      })

      setHydrating(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [branchId, schoolId, students])
  useEffect(() => {
    if (step === 'success') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [step])

  useEffect(() => {
    if (settings.upi_enabled && !settings.pay_at_school_enabled) setPaymentMethod('upi')
    else if (!settings.pay_at_school_enabled) setPaymentMethod('upi')
  }, [settings.upi_enabled, settings.pay_at_school_enabled])

  const effectiveShipping = useMemo(() => {
    const fee = Number(settings.shipping_fee || 0),
      freeAbove = Number(settings.free_shipping_above || 0)
    return fee > 0 && (!freeAbove || total < freeAbove) ? fee : 0
  }, [settings, total])
  const payable = total + effectiveShipping
  const upiUri = useMemo(() => {
    if (!settings.upi_enabled || !settings.upi_id) return ''
    return (
      'upi://pay?pa=' +
      encodeURIComponent(settings.upi_id) +
      '&pn=' +
      encodeURIComponent(settings.upi_payee_name || 'School Uniforms') +
      '&am=' +
      payable.toFixed(2) +
      '&cu=INR'
    )
  }, [settings, payable])
  const selectedStudent = checkoutStudents.find(
    (s) => s.id === (checkoutStudents.length === 1 ? checkoutStudents[0].id : studentId),
  )
  const selectedStudentId = selectedStudent?.id || ''
  const selectedStudentMatchesContext = Boolean(
    selectedStudent &&
      selectedStudent.school_id === schoolId &&
      selectedStudent.branch_id === branchId,
  )
  const fieldError = (key: string) => {
    const value = String((address as any)[key] || '').trim()
    if (key === 'name')
      return !value ? 'Full name is required.' : value.length < 2 ? 'Enter a valid full name.' : ''
    if (key === 'phone')
      return !value
        ? 'Phone number is required.'
        : !/^[6-9][0-9]{9}$/.test(value)
          ? 'Enter a valid 10-digit mobile number.'
          : ''
    if (key === 'line1')
      return !value
        ? 'Address line 1 is required.'
        : value.length < 5
          ? 'Enter a complete address.'
          : ''
    if (key === 'city')
      return !value ? 'City is required.' : value.length < 2 ? 'Enter a valid city.' : ''
    if (key === 'state') return !value ? 'State is required.' : ''
    if (key === 'pincode')
      return !value
        ? 'PIN code is required.'
        : !/^[0-9]{6}$/.test(value)
          ? 'Enter a valid 6-digit PIN code.'
          : ''
    return ''
  }

  const studentError = !checkoutStudents.length
    ? studentLoadError || 'No active student is linked to this account.'
    : !selectedStudent
      ? 'Please select a student.'
      : !selectedStudentMatchesContext
        ? 'This student is assigned to a different school or branch.'
        : ''
  const detailsValid = Boolean(
    selectedStudentId &&
      selectedStudentMatchesContext &&
      address.name.trim() &&
      /^[0-9]{10}$/.test(address.phone.trim()) &&
      address.line1.trim() &&
      address.city.trim() &&
      address.state.trim() &&
      /^[0-9]{6}$/.test(address.pincode.trim()),
  )
  const paymentValid = paymentMethod === 'pay_at_school' || paymentReference.trim().length >= 4

  const placeOrder = async () => {
    if (!detailsValid || !paymentValid || loading) return
    setLoading(true)
    setError('')
    try {
      const payloadItems = cart.map((item) => ({
        type: item.type,
        source_id: item.sourceId || item.id,
        quantity: item.quantity,
        selected_variants:
          item.type === 'package'
            ? (item.selectedVariants || []).map((selection) => ({
                package_item_id: selection.packageItemId,
                variant_id: selection.variantId,
                size_label: selection.sizeLabel,
              }))
            : [
                {
                  variant_id:
                    item.selectedVariants?.[0]?.variantId || item.variantOptions?.[0]?.id || '',
                  size_label: item.size,
                },
              ],
      }))
      const client = supabase as any
      const { data, error: rpcError } = await client.rpc('place_school_order', {
        p_school_id: schoolId,
        p_branch_id: branchId,
        p_student_id: selectedStudentId || null,
        p_items: payloadItems,
        p_shipping_address: {
          recipient_name: address.name.trim(),
          phone: address.phone.trim(),
          address_line1: address.line1.trim(),
          address_line2: address.line2.trim() || null,
          city: address.city.trim(),
          state: address.state.trim(),
          postal_code: address.pincode.trim(),
        },
        p_payment_method: paymentMethod,
        p_payment_reference: paymentMethod === 'upi' ? paymentReference.trim() : null,
        p_notes: null,
      })
      if (rpcError) throw rpcError
      if (!data?.order_number) throw new Error('The order was not created.')
      setSuccessOrder(data)
      onComplete(data)
    } catch (e: any) {
      setError(e?.message || 'Could not place the order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (hydrating)
    return (
      <div className="checkout-page">
        <div className="checkout-form-card">
          <Loader2 className="spin" />
          <p>Preparing your secure checkout...</p>
        </div>
      </div>
    )
  if (step === 'success')
    return (
      <div className="checkout-page">
        <div className="success-card">
          <div className="success-icon">
            <CheckCircle2 size={48} />
          </div>
          <p className="eyebrow">ORDER CONFIRMED</p>
          <h1>Thank you for your order.</h1>
          <p>Your order has been created successfully and your stock has been reserved.</p>
          <div className="success-order-number">
            <span>Order Number</span>
            <strong>{successOrder?.order_number || '—'}</strong>
            <span>Total</span>
            <strong>₹{Number(successOrder?.grand_total || payable).toLocaleString('en-IN')}</strong>
          </div>
          <button className="primary-button" onClick={() => setStep(null)}>
            Continue Shopping <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )

  if (step === 'cart')
    return (
      <div className="checkout-page school-checkout-unified">
        <div className="checkout-top">
          <button onClick={() => setStep(null)}>
            <ChevronLeft /> Continue shopping
          </button>
          <strong>Your Cart</strong>
        </div>

        <div className="school-checkout-grid">
          <section className="school-checkout-card school-order-card">
            <h2>Order Summary</h2>
            {!cart.length ? (
              <div className="empty-state">
                <ShoppingCart size={40} />
                <h3>Your cart is empty</h3>
              </div>
            ) : (
              <div className="school-order-items">
                {cart.map((x) => (
                  <article className="school-order-item" key={x.id}>
                    <div className="school-order-thumb">
                      {x.image ? <img src={x.image} alt={x.title} /> : <ShoppingBag size={22} />}
                    </div>
                    <div className="school-order-info">
                      <strong>{x.title}</strong>
                      {x.type === 'package' && x.selectedVariants?.length ? (
                        <small>
                          {x.selectedVariants.map((v) => v.sizeLabel || 'Selected').join(' • ')}
                        </small>
                      ) : x.size && x.size !== 'Multiple' ? (
                        <small>Size {x.size}</small>
                      ) : null}
                      <div className="school-order-controls">
                        <button type="button" onClick={() => update(x.id, -1)} aria-label="Decrease quantity">
                          <Minus size={13} />
                        </button>
                        <span>{x.quantity}</span>
                        <button type="button" onClick={() => update(x.id, 1)} aria-label="Increase quantity">
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          className="school-order-remove"
                          onClick={() => remove(x.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <strong className="school-order-price">
                      ₹{(x.price * x.quantity).toLocaleString('en-IN')}
                    </strong>
                  </article>
                ))}
              </div>
            )}
            <div className="school-order-total">
              <span>Total</span>
              <strong>₹{payable.toLocaleString('en-IN')}</strong>
            </div>
          </section>

          <section className="school-checkout-card school-details-card">
            <h2>Your Details</h2>
            <div className="school-details-form">
              {checkoutStudents.length > 1 && (
                <label className="school-field school-field-full">
                  Student *
                  <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                    <option value="">Select student</option>
                    {checkoutStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} — {s.student_code}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {checkoutStudents.length === 1 && (
                <div className="school-selected-student school-field-full">
                  <UserRound size={17} />
                  <div>
                    <span>Student</span>
                    <strong>{checkoutStudents[0].full_name}</strong>
                    <small>
                      {checkoutStudents[0].student_code}
                      {checkoutStudents[0].class_name ? ' • ' + checkoutStudents[0].class_name : ''}
                      {checkoutStudents[0].section ? '-' + checkoutStudents[0].section : ''}
                    </small>
                  </div>
                </div>
              )}

              {[
                ['name', 'Full name', true],
                ['phone', 'Phone', true],
                ['line1', 'Address line 1', true],
                ['line2', 'Address line 2', false],
                ['city', 'City', true],
                ['state', 'State', true],
                ['pincode', 'PIN code', true],
              ].map(([k, label, required]) => (
                <label
                  className={`school-field ${k === 'line1' || k === 'line2' ? 'school-field-full' : ''}`}
                  key={k as string}
                >
                  <span className="school-field-label">
                    {label as string}
                    {required ? <em>*</em> : null}
                  </span>
                  <input
                    className={fieldError(k as string) ? 'school-input-invalid' : ''}
                    value={(address as any)[k as string]}
                    type={k === 'phone' ? 'tel' : 'text'}
                    inputMode={k === 'phone' || k === 'pincode' ? 'numeric' : undefined}
                    maxLength={k === 'phone' ? 10 : k === 'pincode' ? 6 : undefined}
                    pattern={k === 'phone' ? '[0-9]{10}' : k === 'pincode' ? '[0-9]{6}' : undefined}
                    onChange={(e) => {
                      const value =
                        k === 'phone' || k === 'pincode'
                          ? e.target.value.replace(/\D/g, '').slice(0, k === 'phone' ? 10 : 6)
                          : e.target.value
                      setAddress({ ...address, [k as string]: value })
                    }}
                  />
                  {fieldError(k as string) && (
                    <small className="school-field-error">{fieldError(k as string)}</small>
                  )}
                </label>
              ))}
            </div>

            {studentLoadError && (
              <div className="workspace-error checkout-validation-error">{studentLoadError}</div>
            )}
            {!detailsValid && !studentLoadError && (
              <p className="school-checkout-hint">
                Correct the highlighted fields to continue with payment.
              </p>
            )}
          </section>

          <section className="school-checkout-card school-payment-card">
            <h2>Payment</h2>
            {!detailsValid ? (
              <div className="school-payment-locked">
                <p>Please fill in your details correctly to proceed with payment.</p>
              </div>
            ) : (
              <>
                {settings.pay_at_school_enabled && (
                  <label
                    className={`school-payment-option ${paymentMethod === 'pay_at_school' ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="school-payment"
                      checked={paymentMethod === 'pay_at_school'}
                      onChange={() => setPaymentMethod('pay_at_school')}
                    />
                    <ShoppingBag size={20} />
                    <div>
                      <strong>Pay at School</strong>
                      <span>Place the order now and pay through the school.</span>
                    </div>
                  </label>
                )}

                {settings.upi_enabled && settings.upi_id && (
                  <label
                    className={`school-payment-option ${paymentMethod === 'upi' ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="school-payment"
                      checked={paymentMethod === 'upi'}
                      onChange={() => setPaymentMethod('upi')}
                    />
                    <CreditCard size={20} />
                    <div>
                      <strong>UPI Payment</strong>
                      <span>Scan the QR, pay the exact amount and enter the transaction ID.</span>
                    </div>
                  </label>
                )}

                {paymentMethod === 'upi' && settings.upi_enabled && settings.upi_id && (
                  <div className="school-upi-panel">
                    <div className="school-upi-qr">
                      {upiUri ? (
                        <QRCodeSVG
                          value={upiUri}
                          size={190}
                          marginSize={4}
                          title="UPI payment QR code"
                        />
                      ) : null}
                    </div>
                    <strong>₹{payable.toLocaleString('en-IN')}</strong>
                    <p>UPI ID: {settings.upi_id}</p>
                    <p>{settings.upi_payee_name || 'School Uniforms'}</p>
                    <a className="upi-open-button" href={upiUri}>
                      Open UPI App
                    </a>
                    <label className="school-upi-reference">
                      Transaction / reference ID<span>*</span>
                      <input
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Enter UPI transaction ID"
                      />
                    </label>
                  </div>
                )}

                {error && <div className="workspace-error">{error}</div>}

                <div className="school-payment-total">
                  <span>Payable</span>
                  <strong>₹{payable.toLocaleString('en-IN')}</strong>
                </div>

                <button
                  className="primary-button school-place-order"
                  disabled={
                    loading ||
                    !paymentValid ||
                    (!settings.pay_at_school_enabled && !settings.upi_enabled)
                  }
                  onClick={() => void placeOrder()}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spin" /> Placing Order...
                    </>
                  ) : (
                    <>Place Order • ₹{payable.toLocaleString('en-IN')}</>
                  )}
                  <CheckCircle2 size={18} />
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    )

  if (step === 'details')
    return (
      <div className="checkout-page">
        <div className="checkout-top">
          <button onClick={() => setStep('cart')}>
            <ChevronLeft /> Cart
          </button>
          <strong>Delivery & Student</strong>
        </div>
        <div className="checkout-form-card">
          <p className="eyebrow">STEP 1 OF 2</p>
          <h1>Confirm student and delivery details</h1>
          <div className="checkout-form-grid">
            {checkoutStudents.length > 1 && (
              <label className="full-field">
                Student
                <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  <option value="">Select student</option>
                  {checkoutStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — {s.student_code}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {checkoutStudents.length === 1 && (
              <div className="selected-student full-field">
                <UserRound size={18} />
                <div>
                  <strong>{checkoutStudents[0].full_name}</strong>
                  <span>
                    {checkoutStudents[0].student_code}
                    {checkoutStudents[0].class_name ? ' • ' + checkoutStudents[0].class_name : ''}
                    {checkoutStudents[0].section ? '-' + checkoutStudents[0].section : ''}
                  </span>
                </div>
              </div>
            )}
            {[
              ['name', 'Full name'],
              ['phone', 'Phone'],
              ['line1', 'Address line 1'],
              ['line2', 'Address line 2'],
              ['city', 'City'],
              ['state', 'State'],
              ['pincode', 'PIN code'],
            ].map(([k, label]) => (
              <label key={k}>
                {label}
                {k !== 'line2' && <span>*</span>}
                <input
                  className={fieldError(k) ? 'school-input-invalid' : ''}
                  value={(address as any)[k]}
                  type={k === 'phone' ? 'tel' : k === 'pincode' ? 'text' : 'text'}
                  inputMode={k === 'phone' || k === 'pincode' ? 'numeric' : undefined}
                  maxLength={k === 'phone' ? 10 : k === 'pincode' ? 6 : undefined}
                  pattern={k === 'phone' ? '[0-9]{10}' : k === 'pincode' ? '[0-9]{6}' : undefined}
                  onChange={(e) => {
                    const value =
                      k === 'phone' || k === 'pincode'
                        ? e.target.value.replace(/\D/g, '').slice(0, k === 'phone' ? 10 : 6)
                        : e.target.value
                    setAddress({ ...address, [k]: value })
                  }}
                />
                {fieldError(k) && <small className="school-field-error">{fieldError(k)}</small>}
              </label>
            ))}
          </div>
          {studentError && (
            <div className="workspace-error checkout-validation-error">{studentError}</div>
          )}
          <div className="checkout-actions">
            <button className="secondary-button" onClick={() => setStep('cart')}>
              Back
            </button>
            <button
              className="primary-button"
              disabled={!detailsValid}
              onClick={() => {
                if (!detailsValid) {
                  setStudentLoadError(
                    studentError ||
                      Object.entries(address)
                        .map(([key]) => fieldError(key))
                        .find(Boolean) ||
                      'Please correct the highlighted fields before continuing.',
                  )
                  return
                }
                setStep('payment')
              }}
            >
              Continue to Payment <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )

  return (
    <div className="checkout-page">
      <div className="checkout-top">
        <button onClick={() => setStep('details')}>
          <ChevronLeft /> Details
        </button>
        <strong>Payment</strong>
      </div>
      <div className="payment-card">
        <p className="eyebrow">STEP 2 OF 2</p>
        <h1>Choose payment method</h1>
        {settings.pay_at_school_enabled && (
          <label className="payment-option">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'pay_at_school'}
              onChange={() => setPaymentMethod('pay_at_school')}
            />
            <ShoppingBag />
            <div>
              <strong>Pay at School</strong>
              <span>Place the order now and pay through the school.</span>
            </div>
          </label>
        )}
        {settings.upi_enabled && settings.upi_id && (
          <label className="payment-option">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'upi'}
              onChange={() => setPaymentMethod('upi')}
            />
            <CreditCard />
            <div>
              <strong>UPI Payment</strong>
              <span>Scan the QR, pay the exact amount and enter the transaction ID.</span>
            </div>
          </label>
        )}
        {paymentMethod === 'upi' && settings.upi_enabled && (
          <div className="upi-panel">
            <div className="upi-qr">
              {upiUri ? (
                <QRCodeSVG value={upiUri} size={220} marginSize={4} title="UPI payment QR code" />
              ) : null}
            </div>
            <div>
              <strong>₹{payable.toLocaleString('en-IN')}</strong>
              <p>UPI ID: {settings.upi_id}</p>
              <p>{settings.upi_payee_name || 'School Uniforms'}</p>
              <a className="upi-open-button" href={upiUri}>
                Open UPI App
              </a>
              <label>
                Transaction / reference ID<span>*</span>
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter UPI transaction ID"
                />
              </label>
            </div>
          </div>
        )}
        {!settings.pay_at_school_enabled && !settings.upi_enabled && (
          <div className="workspace-error">
            No payment method is currently enabled for this branch. Please contact the school.
          </div>
        )}
        {error && <div className="workspace-error">{error}</div>}
        <div className="payment-total">
          <span>Payable</span>
          <strong>₹{payable.toLocaleString('en-IN')}</strong>
        </div>
        <button
          className="primary-button"
          disabled={
            loading || !paymentValid || (!settings.pay_at_school_enabled && !settings.upi_enabled)
          }
          onClick={() => void placeOrder()}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spin" /> Placing Order...
            </>
          ) : (
            'Place Order • ₹' + payable.toLocaleString('en-IN')
          )}{' '}
          <CheckCircle2 size={18} />
        </button>
      </div>
    </div>
  )
}

function OrderSummary({
  total,
  subtotal,
  shipping,
  disabled,
  onNext,
}: {
  total: number
  subtotal: number
  shipping: number
  disabled: boolean
  onNext: () => void
}) {
  return (
    <aside className="checkout-summary">
      <h2>Order Summary</h2>
      <div>
        <span>Subtotal</span>
        <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
      </div>
      <div>
        <span>Delivery</span>
        <strong>{shipping ? '₹' + shipping.toLocaleString('en-IN') : 'FREE'}</strong>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <strong>₹{total.toLocaleString('en-IN')}</strong>
      </div>
      <button className="primary-button" disabled={disabled} onClick={onNext}>
        Continue <ArrowRight size={17} />
      </button>
    </aside>
  )
}
