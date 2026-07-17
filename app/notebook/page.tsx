'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'

export default function Notebook(){
  const {notes,activities,addNote}=useStore();const [open,setOpen]=useState(false),[saving,setSaving]=useState(false);const [title,setTitle]=useState(''),[topic,setTopic]=useState(''),[notesText,setNotesText]=useState(''),[related,setRelated]=useState('');const [files,setFiles]=useState<File[]>([])
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);try{await addNote({title,date:new Date().toISOString().slice(0,10),topic,notes:notesText,relatedActivityId:related||undefined,files});setOpen(false);setTitle('');setTopic('');setNotesText('');setRelated('');setFiles([])}finally{setSaving(false)}}
  return <div className="page"><header><div><h1>Cuaderno digital</h1><p>Fotos, apuntes y notas de clase compartidos.</p></div><button onClick={()=>setOpen(!open)}>+ Nueva entrada</button></header>
    {open&&<form className="panel form" onSubmit={submit}><label>Título<input value={title} onChange={e=>setTitle(e.target.value)} required/></label><label>Tema<input value={topic} onChange={e=>setTopic(e.target.value)}/></label><label>Notas<textarea value={notesText} onChange={e=>setNotesText(e.target.value)}/></label><label>Actividad relacionada<select value={related} onChange={e=>setRelated(e.target.value)}><option value="">Ninguna</option>{activities.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label>Fotos o archivos<input type="file" multiple accept="image/*,.pdf" onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label><button disabled={saving}>{saving?'Guardando…':'Guardar entrada'}</button></form>}
    <section className="notebook-list">{notes.map(n=><article key={n.id}><div className="photo">📷</div><div><h3>{n.title}</h3><p><b>Fecha:</b> {n.date}</p><p><b>Tema:</b> {n.topic}</p><p>{n.notes}</p><div className="stack-links">{n.attachments?.map(a=><a href={a.signedUrl} target="_blank" rel="noreferrer" key={a.id}>{a.fileName}</a>)}</div><small>Agregado por {n.createdBy.name}</small></div></article>)}</section>
  </div>
}
