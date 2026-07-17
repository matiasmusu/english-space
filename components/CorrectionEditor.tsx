'use client'
import { useState } from 'react'

export default function CorrectionEditor({initial='I have went to Córdoba.'}:{initial?:string}) {
 const [original,setOriginal]=useState(initial)
 const [corrected,setCorrected]=useState('I have gone to Córdoba.')
 const [feedback,setFeedback]=useState('Después de “have”, usamos el participio: gone.')
 return <div className="correction-grid">
   <label>Respuesta del alumno<textarea value={original} onChange={e=>setOriginal(e.target.value)} /></label>
   <label>Texto corregido<textarea className="red-ink" value={corrected} onChange={e=>setCorrected(e.target.value)} /></label>
   <label className="full">Comentario<textarea value={feedback} onChange={e=>setFeedback(e.target.value)} /></label>
   <div className="actions full"><button className="secondary">Pedir cambios</button><button>Guardar corrección</button><button className="success">Aprobar</button></div>
 </div>
}
