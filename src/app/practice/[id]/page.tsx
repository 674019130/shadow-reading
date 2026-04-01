import PracticePage from '@/components/practice/PracticePage'

export default async function Practice({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PracticePage materialId={id} />
}
