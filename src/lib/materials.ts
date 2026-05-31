import type { Material } from './types'
import type { CreateMaterialData, UpdateMaterialData } from './server-materials'

export type ExportMaterialFormat = 'bundle' | 'text'

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || 'Material request failed')
  }
  return response.json() as Promise<T>
}

export async function getAllMaterials(): Promise<Material[]> {
  const data = await parseJsonResponse<{ materials: Material[] }>(
    await fetch('/api/materials', { cache: 'no-store' })
  )
  return data.materials
}

export async function getMaterial(id: string): Promise<Material | undefined> {
  const response = await fetch(`/api/materials/${id}`, { cache: 'no-store' })
  if (response.status === 404) return undefined

  const data = await parseJsonResponse<{ material: Material }>(response)
  return data.material
}

export async function createMaterial(data: CreateMaterialData): Promise<Material> {
  const response = await fetch('/api/materials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const body = await parseJsonResponse<{ material: Material }>(response)
  return body.material
}

export async function updateMaterial(id: string, data: UpdateMaterialData): Promise<Material> {
  const response = await fetch(`/api/materials/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const body = await parseJsonResponse<{ material: Material }>(response)
  return body.material
}

export async function duplicateMaterial(id: string): Promise<Material> {
  const response = await fetch(`/api/materials/${id}/duplicate`, {
    method: 'POST',
  })
  const body = await parseJsonResponse<{ material: Material }>(response)
  return body.material
}

export async function exportMaterialFile(
  id: string,
  fallbackTitle: string,
  format: ExportMaterialFormat = 'bundle'
): Promise<void> {
  const response = await fetch(`/api/materials/${id}/export${format === 'text' ? '?format=text' : ''}`)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || 'Material export failed')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getDownloadFilename(response.headers.get('content-disposition')) ||
    `${slugifyFilename(fallbackTitle)}.${format === 'text' ? 'txt' : 'shadow-reading.json'}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function deleteMaterial(id: string): Promise<void> {
  await parseJsonResponse<{ ok: true }>(
    await fetch(`/api/materials/${id}`, { method: 'DELETE' })
  )
}

export async function updateMaterialPractice(id: string): Promise<void> {
  await parseJsonResponse<{ material: Material | undefined }>(
    await fetch(`/api/materials/${id}`, { method: 'PATCH' })
  )
}

function getDownloadFilename(disposition: string | null): string | null {
  if (!disposition) return null
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])

  const asciiMatch = disposition.match(/filename="([^"]+)"/i)
  return asciiMatch?.[1] || null
}

function slugifyFilename(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return slug || 'material'
}
