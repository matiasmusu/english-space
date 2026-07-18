import type { Attachment } from '@/lib/types'

const isImage = (name: string) => /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(name)

// Muestra los adjuntos: las fotos como miniaturas, el resto como enlaces con nombre.
export default function AttachmentList({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments?.length) return null
  const images = attachments.filter(a => isImage(a.fileName) && a.signedUrl)
  const files = attachments.filter(a => !images.includes(a))
  return (
    <>
      {images.length > 0 && (
        <div className="photo-grid">
          {images.map(a => (
            <a href={a.signedUrl} target="_blank" rel="noreferrer" key={a.id} title={a.fileName}>
              <img src={a.signedUrl} alt={a.fileName} />
            </a>
          ))}
        </div>
      )}
      {files.map(a => a.signedUrl ? (
        <a className="file-chip" href={a.signedUrl} target="_blank" rel="noreferrer" key={a.id}>
          📎 {a.fileName}
        </a>
      ) : (
        <span className="file-chip" key={a.id} title="No se pudo generar el enlace. Recargá la página.">
          📎 {a.fileName}
        </span>
      ))}
    </>
  )
}
