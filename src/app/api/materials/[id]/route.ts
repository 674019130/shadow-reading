import { NextRequest, NextResponse } from 'next/server'
import { localMaterialsStore } from '@/lib/server-materials'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await localMaterialsStore.ensureBuiltinMaterial()
    const { id } = await params
    const material = await localMaterialsStore.get(id)
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json({ material })
  } catch (error) {
    console.error('Get material error:', error)
    return NextResponse.json({ error: 'Failed to get material' }, { status: 500 })
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await localMaterialsStore.incrementPracticeCount(id)
    const material = await localMaterialsStore.get(id)
    return NextResponse.json({ material })
  } catch (error) {
    console.error('Update material error:', error)
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await localMaterialsStore.remove(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete material error:', error)
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 })
  }
}
