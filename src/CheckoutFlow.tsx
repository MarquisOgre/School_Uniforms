import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronLeft, Loader2, UserRound, ShoppingBag, ShoppingCart, Trash2, Minus, Plus, CreditCard } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from './lib/supabase'

export type CheckoutCartItem = {
  id:string; title:string; type:'package'|'product'; price:number; size?:string; quantity:number; sourceId?:string; image?:string; text?:string
  bundleItems?:string[]; sizeOptions?:string[]; variantOptions?:{id:string;label:string}[]
  bundleComponents?:{packageItemId:string;productId:string;title:string;quantity:number;requiresSize:boolean;required:boolean;variants:{id:string;label:string}[]}[]
  selectedVariants?:{packageItemId?:string;variantId:string;sizeLabel?:string}[]
}
type StudentOption={id:string;student_code:string;full_name:string;class_name:string|null;section:string|null}
type Step='cart'|'details'|'payment'|'success'
type Address={name:string;phone:string;line1:string;line2:string;city:string;state:string;pincode:string}

export default function CheckoutFlow({schoolId,branchId,cart,total,step,setStep,update,remove,students,onComplete}:{schoolId:string;branchId:string;cart:CheckoutCartItem[];total:number;step:Step;setStep:(x:Step|null)=>void;update:(id:string,d:number)=>void;remove:(id:string)=>void;students:StudentOption[];onComplete:(result:any)=>void}){
  const [address,setAddress]=useState<Address>({name:'',phone:'',line1:'',line2:'',city:'',state:'Telangana',pincode:''})
  const [studentId,setStudentId]=useState('')
  const [paymentMethod,setPaymentMethod]=useState<'upi'|'pay_at_school'>('pay_at_school')
  const [paymentReference,setPaymentReference]=useState('')
  const [settings,setSettings]=useState<any>({pay_at_school_enabled:true,upi_enabled:false,upi_id:'',upi_payee_name:'',shipping_fee:0,free_shipping_above:0})
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [hydrating,setHydrating]=useState(true)

  useEffect(()=>{
    let cancelled=false
    async function load(){
      const client=supabase as any
      if(!client){setHydrating(false);return}
      const [{data:userData},{data:settingsData}] = await Promise.all([
        client.auth.getUser(),
        client.from('branch_payment_settings').select('*').eq('branch_id',branchId).maybeSingle()
      ])
      const user=userData?.user
      const [profile,addressRows]=await Promise.all([
        user?.id?client.from('profiles').select('full_name,phone').eq('id',user.id).maybeSingle():Promise.resolve({data:null}),
        user?.id?client.from('customer_addresses').select('*').eq('user_id',user.id).order('is_default',{ascending:false}).order('created_at',{ascending:false}).limit(1).maybeSingle():Promise.resolve({data:null})
      ])
      if(cancelled)return
      if(settingsData)setSettings(settingsData)
      const a=addressRows.data
      setAddress({name:a?.recipient_name||profile.data?.full_name||'',phone:a?.phone||profile.data?.phone||'',line1:a?.address_line1||'',line2:a?.address_line2||'',city:a?.city||'',state:a?.state||'Telangana',pincode:a?.postal_code||''})
      if(students.length===1)setStudentId(students[0].id)
      setHydrating(false)
    }
    void load()
    return()=>{cancelled=true}
  },[branchId,students])

  useEffect(()=>{
    if(settings.upi_enabled&&!settings.pay_at_school_enabled)setPaymentMethod('upi')
    else if(!settings.pay_at_school_enabled)setPaymentMethod('upi')
  },[settings.upi_enabled,settings.pay_at_school_enabled])

  const effectiveShipping=useMemo(()=>{
    const fee=Number(settings.shipping_fee||0), freeAbove=Number(settings.free_shipping_above||0)
    return fee>0&&(!freeAbove||total<freeAbove)?fee:0
  },[settings,total])
  const payable=total+effectiveShipping
  const upiUri=useMemo(()=>{
    if(!settings.upi_enabled||!settings.upi_id)return ''
    return 'upi://pay?pa='+encodeURIComponent(settings.upi_id)+'&pn='+encodeURIComponent(settings.upi_payee_name||'School Uniforms')+'&am='+payable.toFixed(2)+'&cu=INR'
  },[settings,payable])
  const detailsValid=Boolean(studentId&&address.name.trim()&&address.phone.trim()&&address.line1.trim()&&address.city.trim()&&address.state.trim()&&/^[0-9]{6}$/.test(address.pincode.trim()))
  const paymentValid=paymentMethod==='pay_at_school'||paymentReference.trim().length>=4

  const placeOrder=async()=>{
    if(!detailsValid||!paymentValid||loading)return
    setLoading(true);setError('')
    try{
      const payloadItems=cart.map(item=>({type:item.type,source_id:item.sourceId||item.id,quantity:item.quantity,selected_variants:item.type==='package'?(item.selectedVariants||[]):[{variant_id:item.selectedVariants?.[0]?.variantId||item.variantOptions?.[0]?.id||'',sizeLabel:item.size}]}))
      const client=supabase as any
      const {data,error:rpcError}=await client.rpc('place_school_order',{p_school_id:schoolId,p_branch_id:branchId,p_student_id:studentId||null,p_items:payloadItems,p_shipping_address:{recipient_name:address.name.trim(),phone:address.phone.trim(),address_line1:address.line1.trim(),address_line2:address.line2.trim()||null,city:address.city.trim(),state:address.state.trim(),postal_code:address.pincode.trim()},p_payment_method:paymentMethod,p_payment_reference:paymentMethod==='upi'?paymentReference.trim():null,p_notes:null})
      if(rpcError)throw rpcError
      if(!data?.order_number)throw new Error('The order was not created.')
      onComplete(data)
    }catch(e:any){setError(e?.message||'Could not place the order. Please try again.')}
    finally{setLoading(false)}
  }

  if(hydrating)return <div className="checkout-page"><div className="checkout-form-card"><Loader2 className="spin"/><p>Preparing your secure checkout...</p></div></div>
  if(step==='success')return <div className="checkout-page"><div className="success-card"><div className="success-icon"><CheckCircle2 size={48}/></div><p className="eyebrow">ORDER CONFIRMED</p><h1>Thank you for your order.</h1><p>Your order has been created successfully and your stock has been reserved.</p><strong>Your order is confirmed</strong><button className="primary-button" onClick={()=>setStep(null)}>Continue Shopping <ArrowRight size={18}/></button></div></div>

  if(step==='cart')return <div className="checkout-page"><div className="checkout-top"><button onClick={()=>setStep(null)}><ChevronLeft/> Continue shopping</button><strong>Your Cart</strong></div><div className="checkout-layout"><div className="cart-card"><div className="checkout-section-head"><div><p className="eyebrow">ORDER REVIEW</p><h1>Review your items</h1></div><span>{cart.reduce((s,x)=>s+x.quantity,0)} items</span></div>{!cart.length?<div className="empty-state"><ShoppingCart size={40}/><h3>Your cart is empty</h3></div>:cart.map(x=><div className="cart-row" key={x.id}><div className="cart-thumb">{x.image?<img src={x.image} alt={x.title}/>:<ShoppingBag/>}</div><div><strong>{x.title}</strong><span>{x.type==='package'?'Package • ':''}{x.size&&x.size!=='Multiple'?'Size '+x.size+' • ':''}₹{x.price.toLocaleString('en-IN')} each</span>{x.bundleItems?.length?<small>{x.bundleItems.join(' • ')}</small>:null}<div className="qty-controls"><button onClick={()=>update(x.id,-1)}><Minus/></button><b>{x.quantity}</b><button onClick={()=>update(x.id,1)}><Plus/></button></div></div><strong>₹{(x.price*x.quantity).toLocaleString('en-IN')}</strong><button className="remove-button" onClick={()=>remove(x.id)}><Trash2 size={17}/></button></div>)}</div><OrderSummary total={payable} subtotal={total} shipping={effectiveShipping} disabled={!cart.length} onNext={()=>setStep('details')}/></div></div>

  if(step==='details')return <div className="checkout-page"><div className="checkout-top"><button onClick={()=>setStep('cart')}><ChevronLeft/> Cart</button><strong>Delivery & Student</strong></div><div className="checkout-form-card"><p className="eyebrow">STEP 1 OF 2</p><h1>Confirm student and delivery details</h1><div className="checkout-form-grid">{students.length>1&&<label className="full-field">Student<select value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Select student</option>{students.map(s=><option key={s.id} value={s.id}>{s.full_name} — {s.student_code}</option>)}</select></label>}{students.length===1&&<div className="selected-student full-field"><UserRound size={18}/><div><strong>{students[0].full_name}</strong><span>{students[0].student_code}{students[0].class_name?' • '+students[0].class_name:''}{students[0].section?'-'+students[0].section:''}</span></div></div>}{[['name','Full name'],['phone','Phone'],['line1','Address line 1'],['line2','Address line 2'],['city','City'],['state','State'],['pincode','PIN code']].map(([k,label])=><label key={k}>{label}{k!=='line2'&&<span>*</span>}<input value={(address as any)[k]} onChange={e=>setAddress({...address,[k]:e.target.value})}/></label>)}</div><div className="checkout-actions"><button className="secondary-button" onClick={()=>setStep('cart')}>Back</button><button className="primary-button" disabled={!detailsValid} onClick={()=>setStep('payment')}>Continue to Payment <ArrowRight size={18}/></button></div></div></div>

  return <div className="checkout-page"><div className="checkout-top"><button onClick={()=>setStep('details')}><ChevronLeft/> Details</button><strong>Payment</strong></div><div className="payment-card"><p className="eyebrow">STEP 2 OF 2</p><h1>Choose payment method</h1>{settings.pay_at_school_enabled&&<label className="payment-option"><input type="radio" name="payment" checked={paymentMethod==='pay_at_school'} onChange={()=>setPaymentMethod('pay_at_school')}/><ShoppingBag/><div><strong>Pay at School</strong><span>Place the order now and pay through the school.</span></div></label>}{settings.upi_enabled&&settings.upi_id&&<label className="payment-option"><input type="radio" name="payment" checked={paymentMethod==='upi'} onChange={()=>setPaymentMethod('upi')}/><CreditCard/><div><strong>UPI Payment</strong><span>Scan the QR, pay the exact amount and enter the transaction ID.</span></div></label>}{paymentMethod==='upi'&&settings.upi_enabled&&<div className="upi-panel"><div className="upi-qr">{upiUri?<QRCodeSVG value={upiUri} size={220} marginSize={4} title="UPI payment QR code"/>:null}</div><div><strong>₹{payable.toLocaleString('en-IN')}</strong><p>UPI ID: {settings.upi_id}</p><p>{settings.upi_payee_name||'School Uniforms'}</p><a className="upi-open-button" href={upiUri}>Open UPI App</a><label>Transaction / reference ID<span>*</span><input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Enter UPI transaction ID"/></label></div></div>}{!settings.pay_at_school_enabled&&!settings.upi_enabled&&<div className="workspace-error">No payment method is currently enabled for this branch. Please contact the school.</div>}{error&&<div className="workspace-error">{error}</div>}<div className="payment-total"><span>Payable</span><strong>₹{payable.toLocaleString('en-IN')}</strong></div><button className="primary-button" disabled={loading||!paymentValid||(!settings.pay_at_school_enabled&&!settings.upi_enabled)} onClick={()=>void placeOrder()}>{loading?<><Loader2 size={18} className="spin"/> Placing Order...</>: 'Place Order • ₹'+payable.toLocaleString('en-IN')} <CheckCircle2 size={18}/></button></div></div>
}

function OrderSummary({total,subtotal,shipping,disabled,onNext}:{total:number;subtotal:number;shipping:number;disabled:boolean;onNext:()=>void}){
  return <aside className="checkout-summary"><h2>Order Summary</h2><div><span>Subtotal</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div><div><span>Delivery</span><strong>{shipping?'₹'+shipping.toLocaleString('en-IN'):'FREE'}</strong></div><div className="summary-total"><span>Total</span><strong>₹{total.toLocaleString('en-IN')}</strong></div><button className="primary-button" disabled={disabled} onClick={onNext}>Continue <ArrowRight size={17}/></button></aside>
}
