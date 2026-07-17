'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Activity, Contribution, Material, NotebookEntry, Person, ActivityStatus, EntryKind, Attachment } from './types'
import { createClient } from './supabase'

type NewActivity={title:string;instructions:string;actionType:string;status:ActivityStatus;dueDate?:string;bookReference?:string;materialId?:string;file?:File|null}
type NewMaterial={title:string;description:string;type:string;category:string;url?:string;pinned:boolean;file?:File|null}
type NewNote={title:string;date:string;topic:string;notes:string;relatedActivityId?:string;files?:File[]}
type Ctx={
 currentUser:Person|null;loading:boolean;error:string|null;activities:Activity[];contributions:Contribution[];materials:Material[];notes:NotebookEntry[];
 signIn:(email:string,password:string)=>Promise<void>;signOut:()=>Promise<void>;refresh:()=>Promise<void>;
 addActivity:(v:NewActivity)=>Promise<string>;updateStatus:(id:string,s:ActivityStatus)=>Promise<void>;addContribution:(activityId:string,kind:EntryKind,body:string,originalText?:string,file?:File|null)=>Promise<void>;
 addMaterial:(v:NewMaterial)=>Promise<void>;addNote:(v:NewNote)=>Promise<void>;updateProfileName:(name:string)=>Promise<void>
}
const Store=createContext<Ctx|null>(null)
const mapPerson=(p:any):Person=>({id:p.id,name:p.full_name,role:p.role})

export function StoreProvider({children}:{children:React.ReactNode}){
 const supabase=useMemo(()=>createClient(),[]); const router=useRouter(); const path=usePathname()
 const [currentUser,setCurrentUser]=useState<Person|null>(null); const [activities,setActivities]=useState<Activity[]>([]); const [contributions,setContributions]=useState<Contribution[]>([]); const [materials,setMaterials]=useState<Material[]>([]); const [notes,setNotes]=useState<NotebookEntry[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null)
 const uploadFiles=useCallback(async(entityType:Attachment['entityType'],entityId:string,files:File[])=>{if(!currentUser||!files.length)return;for(const file of files){const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${entityType}/${entityId}/${crypto.randomUUID()}-${safe}`;const {error:u}=await supabase.storage.from('english-space').upload(path,file);if(u)throw u;const {error:i}=await supabase.from('attachments').insert({entity_type:entityType,entity_id:entityId,file_path:path,file_name:file.name,uploaded_by:currentUser.id});if(i)throw i}},[currentUser,supabase])
 const refresh=useCallback(async()=>{setError(null);const {data:{user}}=await supabase.auth.getUser();if(!user){setCurrentUser(null);setActivities([]);setMaterials([]);setContributions([]);setNotes([]);setLoading(false);return}
  const [profilesR,materialsR,activitiesR,contribR,notesR,attachR]=await Promise.all([
   supabase.from('profiles').select('*'),supabase.from('materials').select('*').order('created_at',{ascending:false}),supabase.from('activities').select('*').order('created_at',{ascending:false}),supabase.from('contributions').select('*').order('created_at'),supabase.from('notebook_entries').select('*').order('entry_date',{ascending:false}),supabase.from('attachments').select('*').order('created_at')])
  const firstErr=[profilesR,materialsR,activitiesR,contribR,notesR,attachR].find(r=>r.error)?.error;if(firstErr){setError(firstErr.message);setLoading(false);return}
  const people = new Map<string, Person>((profilesR.data || []).map((p:any) => [p.id, mapPerson(p)] as [string, Person]));const me=people.get(user.id)||{id:user.id,name:user.email||'Usuario',role:'student' as const};setCurrentUser(me)
  const signed=new Map<string,Attachment[]>();for(const a of attachR.data||[]){let signedUrl:string|undefined;const {data}=await supabase.storage.from('english-space').createSignedUrl(a.file_path,3600);signedUrl=data?.signedUrl;const item:Attachment={id:a.id,entityType:a.entity_type,entityId:a.entity_id,filePath:a.file_path,fileName:a.file_name,signedUrl,uploadedBy:a.uploaded_by,createdAt:a.created_at};signed.set(a.entity_id,[...(signed.get(a.entity_id)||[]),item])}
  setMaterials((materialsR.data||[]).map((m:any)=>({id:m.id,title:m.title,description:m.description||'',type:m.type,category:m.category||'General',url:m.external_url||undefined,pinned:m.is_pinned,createdBy:people.get(m.created_by)||me,createdAt:m.created_at,attachments:signed.get(m.id)||[]})))
  const mats = new Map<string, string>((materialsR.data || []).map((m:any) => [m.id, m.title] as [string, string]));setActivities((activitiesR.data||[]).map((a:any)=>({id:a.id,title:a.title,instructions:a.instructions||'',actionType:a.action_type,status:a.status,dueDate:a.due_date||undefined,bookReference:a.book_reference||undefined,materialId:a.material_id||undefined,materialTitle:a.material_id?mats.get(a.material_id):undefined,createdBy:people.get(a.created_by)||me,createdAt:a.created_at,attachments:signed.get(a.id)||[]})))
  setContributions((contribR.data||[]).map((c:any)=>({id:c.id,activityId:c.activity_id,author:people.get(c.author_id)||me,kind:c.kind,body:c.body,originalText:c.original_text||undefined,createdAt:c.created_at})))
  setNotes((notesR.data||[]).map((n:any)=>({id:n.id,title:n.title,date:n.entry_date||'',topic:n.topic||'',notes:n.notes||'',relatedActivityId:n.related_activity_id||undefined,createdBy:people.get(n.created_by)||me,createdAt:n.created_at,attachments:signed.get(n.id)||[]})));setLoading(false)
 },[supabase])
 useEffect(()=>{
  void refresh()
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{
    // Supabase advierte que no se deben ejecutar otras llamadas del cliente
    // directamente dentro de este callback porque puede producir un bloqueo.
    window.setTimeout(()=>{ void refresh() },0)
  })
  return()=>subscription.unsubscribe()
 },[refresh,supabase])
 useEffect(()=>{if(!loading&&!currentUser&&path!='/login')router.replace('/login');if(!loading&&currentUser&&path==='/login')router.replace('/')},[loading,currentUser,path,router])
 const ensure=()=>{if(!currentUser)throw new Error('Debés iniciar sesión')}
 const value=useMemo<Ctx>(()=>({currentUser,loading,error,activities,contributions,materials,notes,refresh,
  signIn:async(email,password)=>{setLoading(true);const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setLoading(false);throw error}await refresh()},
  signOut:async()=>{await supabase.auth.signOut();setCurrentUser(null);router.replace('/login')},
  addActivity:async v=>{ensure();const {data,error}=await supabase.from('activities').insert({title:v.title,instructions:v.instructions,action_type:v.actionType,status:v.status,due_date:v.dueDate||null,book_reference:v.bookReference||null,material_id:v.materialId||null,created_by:currentUser!.id}).select('id').single();if(error)throw error;if(v.file)await uploadFiles('activity',data.id,[v.file]);await refresh();return data.id},
  updateStatus:async(id,s)=>{const {error}=await supabase.from('activities').update({status:s,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await refresh()},
  addContribution:async(activityId,kind,body,originalText,file)=>{ensure();const {data,error}=await supabase.from('contributions').insert({activity_id:activityId,author_id:currentUser!.id,kind,body,original_text:originalText||null}).select('id').single();if(error)throw error;if(file)await uploadFiles('contribution',data.id,[file]);await refresh()},
  addMaterial:async v=>{ensure();const {data,error}=await supabase.from('materials').insert({title:v.title,description:v.description,type:v.type,category:v.category,external_url:v.url||null,is_pinned:v.pinned,created_by:currentUser!.id}).select('id').single();if(error)throw error;if(v.file)await uploadFiles('material',data.id,[v.file]);await refresh()},
  addNote:async v=>{ensure();const {data,error}=await supabase.from('notebook_entries').insert({title:v.title,entry_date:v.date,topic:v.topic,notes:v.notes,related_activity_id:v.relatedActivityId||null,created_by:currentUser!.id}).select('id').single();if(error)throw error;if(v.files?.length)await uploadFiles('notebook',data.id,v.files);await refresh()},
  updateProfileName:async name=>{ensure();const {error}=await supabase.from('profiles').update({full_name:name}).eq('id',currentUser!.id);if(error)throw error;await refresh()}
 }),[currentUser,loading,error,activities,contributions,materials,notes,refresh,supabase,router,uploadFiles])
 return <Store.Provider value={value}>{children}</Store.Provider>
}
export function useStore(){const v=useContext(Store);if(!v)throw new Error('StoreProvider missing');return v}
