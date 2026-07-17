'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'

export default function Materials() {
  const { materials, addMaterial } = useStore()
  const [open,setOpen]=useState(false), [saving,setSaving]=useState(false), [pinned,setPinned]=useState(false)
  const [title,setTitle]=useState(''), [description,setDescription]=useState(''), [url,setUrl]=useState(''), [type,setType]=useState('Documento'), [category,setCategory]=useState('General')
  const [file,setFile]=useState<File|null>(null)
  async function submit(e:React.FormEvent){e.preventDefault();if(!title)return;setSaving(true);try{await addMaterial({title,description,type,category,url:url||undefined,pinned,file});setTitle('');setDescription('');setUrl('');setFile(null);setOpen(false)}finally{setSaving(false)}}
  return <div className="page">
    <header><div><h1>Materiales</h1><p>Libros, PDFs, audios, videos y links compartidos.</p></div><button onClick={()=>setOpen(!open)}>+ Agregar material</button></header>
    {open && <form className="panel form" onSubmit={submit}>
      <label>Título<input value={title} onChange={e=>setTitle(e.target.value)} required/></label>
      <label>Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label>
      <div className="form-grid"><label>Tipo<select value={type} onChange={e=>setType(e.target.value)}><option>Documento</option><option>Libro</option><option>PDF</option><option>Link</option><option>Video</option><option>Audio</option><option>Imagen</option></select></label><label>Categoría<input value={category} onChange={e=>setCategory(e.target.value)}/></label></div>
      <label>Link opcional<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></label>
      <label>Archivo opcional<input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
      <label className="checkbox"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/> Fijar como material principal</label>
      <button disabled={saving}>{saving?'Guardando…':'Guardar material'}</button>
    </form>}
    <h2>Fijados</h2><section className="cards">{materials.filter(x=>x.pinned).map(x=><article key={x.id}><div className="book">{x.type==='Link'?'🔗':'📘'}</div><h3>{x.title}</h3><p>{x.description}</p>{x.url&&<a href={x.url} target="_blank" rel="noreferrer">Abrir enlace</a>}{x.attachments?.map(a=><a href={a.signedUrl} target="_blank" rel="noreferrer" key={a.id}>Abrir {a.fileName}</a>)}<small>Cargado por {x.createdBy.name}</small></article>)}</section>
    <h2>Biblioteca</h2><section className="list">{materials.filter(x=>!x.pinned).map(x=><article key={x.id}><div><h3>{x.title}</h3><p>{x.type} · {x.category} · por {x.createdBy.name}</p>{x.description&&<p>{x.description}</p>}</div><div className="stack-links">{x.url&&<a href={x.url} target="_blank" rel="noreferrer">Abrir enlace</a>}{x.attachments?.map(a=><a href={a.signedUrl} target="_blank" rel="noreferrer" key={a.id}>{a.fileName}</a>)}</div></article>)}</section>
  </div>
}
