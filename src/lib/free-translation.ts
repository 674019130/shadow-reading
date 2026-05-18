export type FreeTranslationProviderId = 'mymemory' | 'libretranslate'

export interface SentenceTranslation {
  provider: FreeTranslationProviderId | 'none'
  text: string
}

export interface FreeTranslationProvider {
  id: FreeTranslationProviderId
  translate: (text: string, signal: AbortSignal) => Promise<string | null>
}

const TRANSLATION_TIMEOUT_MS = 6500
const MAX_MYMEMORY_BYTES = 500

export async function raceEnglishToChinese(
  text: string,
  providers: FreeTranslationProvider[] = createDefaultProviders()
): Promise<SentenceTranslation> {
  const source = text.trim()
  if (!source) return { provider: 'none', text: '' }

  const attempts = providers.map(provider =>
    withTimeout(TRANSLATION_TIMEOUT_MS, signal => provider.translate(source, signal))
      .then(translated => {
        if (!isUsefulTranslation(source, translated)) {
          throw new Error(`${provider.id} returned no useful translation`)
        }

        return {
          provider: provider.id,
          text: normalizeTranslatedText(translated),
        }
      })
  )

  try {
    return await Promise.any(attempts)
  } catch {
    return { provider: 'none', text: '' }
  }
}

export async function translateSentencesToChinese(sentences: string[]): Promise<{
  translations: string[]
  providers: SentenceTranslation['provider'][]
}> {
  const translations = Array<string>(sentences.length).fill('')
  const providers = Array<SentenceTranslation['provider']>(sentences.length).fill('none')
  let cursor = 0

  async function worker() {
    while (cursor < sentences.length) {
      const index = cursor
      cursor += 1

      const result = await raceEnglishToChinese(sentences[index])
      translations[index] = result.text
      providers[index] = result.provider
    }
  }

  const workers = Array.from({ length: Math.min(3, sentences.length) }, () => worker())
  await Promise.all(workers)

  return { translations, providers }
}

function createDefaultProviders(): FreeTranslationProvider[] {
  return [
    createMyMemoryProvider(),
    ...getLibreTranslateUrls().map(createLibreTranslateProvider),
  ]
}

function createMyMemoryProvider(): FreeTranslationProvider {
  return {
    id: 'mymemory',
    async translate(text, signal) {
      if (new TextEncoder().encode(text).length > MAX_MYMEMORY_BYTES) return null

      const url = new URL('https://api.mymemory.translated.net/get')
      url.searchParams.set('q', text)
      url.searchParams.set('langpair', 'en|zh')

      const response = await fetch(url, { signal })
      if (!response.ok) return null

      const data = await response.json()
      return typeof data?.responseData?.translatedText === 'string'
        ? data.responseData.translatedText
        : null
    },
  }
}

function createLibreTranslateProvider(baseUrl: string): FreeTranslationProvider {
  return {
    id: 'libretranslate',
    async translate(text, signal) {
      const response = await fetch(new URL('/translate', baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: 'zh',
          format: 'text',
          ...(process.env.LIBRETRANSLATE_API_KEY
            ? { api_key: process.env.LIBRETRANSLATE_API_KEY }
            : {}),
        }),
      })

      if (!response.ok) return null

      const data = await response.json()
      return typeof data?.translatedText === 'string' ? data.translatedText : null
    },
  }
}

function getLibreTranslateUrls(): string[] {
  const configured = [
    process.env.LIBRETRANSLATE_URL,
    ...(process.env.LIBRETRANSLATE_URLS || '').split(','),
    'https://libretranslate.com',
  ]
    .map(url => url?.trim())
    .filter((url): url is string => Boolean(url))
    .map(url => url.replace(/\/+$/, ''))

  return [...new Set(configured)]
}

async function withTimeout<T>(
  timeoutMs: number,
  task: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await task(controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}

function isUsefulTranslation(source: string, translated: string | null): translated is string {
  if (!translated) return false
  const normalizedSource = source.trim().toLowerCase()
  const normalizedTranslation = translated.trim().toLowerCase()
  return normalizedTranslation.length > 0 && normalizedTranslation !== normalizedSource
}

function normalizeTranslatedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
