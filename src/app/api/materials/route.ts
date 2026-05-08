import { NextRequest, NextResponse } from 'next/server'
import { localMaterialsStore, type CreateMaterialData } from '@/lib/server-materials'

export async function GET() {
  try {
    await localMaterialsStore.ensureBuiltinMaterial()
    const materials = await localMaterialsStore.list()
    return NextResponse.json({ materials })
  } catch (error) {
    console.error('List materials error:', error)
    return NextResponse.json({ error: 'Failed to list materials' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as CreateMaterialData
    const material = await localMaterialsStore.create(data)
    return NextResponse.json({ material }, { status: 201 })
  } catch (error) {
    console.error('Create material error:', error)
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 })
  }
}
