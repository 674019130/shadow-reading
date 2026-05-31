import { NextRequest, NextResponse } from 'next/server'
import { localMaterialsStore } from '@/lib/server-materials'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const material = await localMaterialsStore.duplicate(id)

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json({ material }, { status: 201 })
  } catch (error) {
    console.error('Duplicate material error:', error)
    return NextResponse.json({ error: 'Failed to duplicate material' }, { status: 500 })
  }
}
