import { NextRequest, NextResponse } from 'next/server'
import { localMaterialsStore } from '@/lib/server-materials'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const format = request.nextUrl.searchParams.get('format')

    if (format === 'text' || format === 'plain-text') {
      const exportedText = await localMaterialsStore.exportMaterialText(id)

      if (!exportedText) {
        return NextResponse.json({ error: 'Material not found' }, { status: 404 })
      }

      const filename = `${slugify(exportedText.title || 'material')}.txt`

      return new NextResponse(`${exportedText.text}\n`, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': contentDisposition(filename),
        },
      })
    }

    const bundle = await localMaterialsStore.exportMaterial(id)

    if (!bundle) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    const filename = `${slugify(bundle.material.title || 'material')}.shadow-reading.json`

    return new NextResponse(`${JSON.stringify(bundle, null, 2)}\n`, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': contentDisposition(filename),
      },
    })
  } catch (error) {
    console.error('Export material error:', error)
    return NextResponse.json({ error: 'Failed to export material' }, { status: 500 })
  }
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return slug || 'material'
}

function contentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_')
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}
