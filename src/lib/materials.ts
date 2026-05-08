import type { Material } from './types'
import type { CreateMaterialData } from './server-materials'

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
