import { zip } from 'fflate'

/** Déclenche le téléchargement d'un blob sous le nom donné. */
export function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Révoquer trop tôt annule le téléchargement dans certains navigateurs.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Rassemble plusieurs classeurs dans une archive.
 *
 * Un lot de quatorze fichiers ferait quatorze téléchargements, que les navigateurs
 * finissent par bloquer. Les `.xlsx` étant déjà compressés, l'archive les stocke sans
 * les recompresser : c'est instantané et le gain serait nul.
 */
export async function zipBlobs(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {}
  for (const file of files) {
    entries[file.name] = [new Uint8Array(await file.blob.arrayBuffer()), { level: 0 }]
  }

  const archive = await new Promise<Uint8Array>((resolve, reject) => {
    zip(entries, (error, data) => (error ? reject(error) : resolve(data)))
  })
  return new Blob([archive as BlobPart], { type: 'application/zip' })
}
