import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}})

function syntheticEmail(loginId:string,branchId:string){
  const safe=loginId.toLowerCase().replace(/[^a-z0-9._-]/g,"")
  return safe+"."+branchId.slice(0,8)+"@schooluniform.local"
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors})
  try{
    const url=Deno.env.get("SUPABASE_URL")!
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey=Deno.env.get("SUPABASE_ANON_KEY")!
    const admin=createClient(url,service)
    const token=req.headers.get("Authorization")?.replace(/^Bearer\s+/i,"")
    if(!token) return json({error:"Authentication required."},401)
    const caller=createClient(url,anonKey)
    const {data:authData,error:authError}=await caller.auth.getUser(token)
    if(authError||!authData.user) return json({error:"Authentication required."},401)
    const {data:profile}=await admin.from("profiles").select("role").eq("id",authData.user.id).single()
    if(!profile||!["admin","super_admin"].includes(profile.role)) return json({error:"Admin access required."},403)
    const body=await req.json()
    const branchId=String(body.branch_id||"")
    const parentName=String(body.parent_name||"").trim()
    const loginId=String(body.login_id||"").trim().toUpperCase()
    const password=String(body.password||"")
    const phone=String(body.parent_phone||"").trim()
    const parentEmail=String(body.parent_email||"").trim().toLowerCase()
    const studentCode=String(body.student_code||"").trim()
    const studentName=String(body.student_name||"").trim()
    const dob=String(body.dob||"").trim()
    const className=String(body.class_name||"").trim()
    const section=String(body.section||"").trim()
    const genderRaw=String(body.gender||"").trim().toLowerCase()
    if(!branchId||!parentName||!loginId||!password||!parentEmail||!studentCode||!studentName||!dob)
      return json({error:"Branch, parent email, parent details, password and student details are required."},400)
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail))
      return json({error:"Please enter a valid parent email address."},400)
    if(password.length<6) return json({error:"Password must be at least 6 characters."},400)
    const {data:branch}=await admin.from("branches").select("id,status").eq("id",branchId).single()
    if(!branch||branch.status!=="active") return json({error:"Invalid branch."},400)
    const {data:existingProfile}=await admin.from("profiles").select("id").eq("branch_id",branchId).eq("login_id",loginId).maybeSingle()
    if(existingProfile) return json({error:"That Parent Login ID already exists for this branch."},409)
    const created=await admin.auth.admin.createUser({email:parentEmail,password,email_confirm:true,user_metadata:{branch_id:branchId,full_name:parentName}})
    if(created.error||!created.data.user) return json({error:created.error?.message||"Unable to create parent authentication account."},400)
    const parentId=created.data.user.id
    const {error:profileError}=await admin.from("profiles").upsert({id:parentId,full_name:parentName,role:"customer",branch_id:branchId,login_id:loginId,phone:phone||null,status:"active"})
    if(profileError){ await admin.auth.admin.deleteUser(parentId); return json({error:profileError.message},400) }
    const gender=["boys","girls","unisex"].includes(genderRaw)?genderRaw:null
    const {data:student,error:studentError}=await admin.from("students").upsert({branch_id:branchId,student_code:studentCode,full_name:studentName,class_name:className||null,section:section||null,gender,date_of_birth:dob,status:"active"},{onConflict:"branch_id,student_code"}).select("id,student_code,full_name").single()
    if(studentError||!student){ await admin.from("profiles").delete().eq("id",parentId); await admin.auth.admin.deleteUser(parentId); return json({error:studentError?.message||"Unable to create student."},400) }
    const {error:linkError}=await admin.from("parent_student_links").upsert({parent_user_id:parentId,student_id:student.id,relationship:"parent",is_primary:true},{onConflict:"parent_user_id,student_id"})
    if(linkError){ await admin.from("profiles").delete().eq("id",parentId); await admin.auth.admin.deleteUser(parentId); return json({error:linkError.message},400) }
    return json({success:true,parent_id:parentId,student_id:student.id,login_id:loginId})
  }catch(e){ return json({error:e instanceof Error?e.message:"Unexpected server error."},500) }
})