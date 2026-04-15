import type { InsForgeConfig } from '@/lib/insforge'

export type InsForgeClient = {
  url: string
  anonKey: string
  fetch: (path: string, init?: RequestInit) => Promise<Response>
  request: <T = unknown>(path: string, init?: RequestInit) => Promise<T>
}

export function isInsForgeConfigured(config: InsForgeConfig) {
  return Boolean(config.url && config.anonKey)
}

export function createInsForgeClient(config: InsForgeConfig): InsForgeClient {
  const url = config.url.replace(/\/+$/, '')
  const anonKey = config.anonKey

  async function insforgeFetch(path: string, init: RequestInit = {}) {
    if (!isInsForgeConfigured({ url, anonKey })) {
      throw new Error('InsForge is not configured (missing url or anon key).')
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const targetUrl = new URL(normalizedPath, url).toString()

    const headers = new Headers(init.headers)
    if (!headers.has('accept')) headers.set('accept', 'application/json')
    headers.set('apikey', anonKey)
    headers.set('authorization', `Bearer ${anonKey}`)

    return fetch(targetUrl, { ...init, headers })
  }

  async function request<T = unknown>(path: string, init: RequestInit = {}) {
    const response = await insforgeFetch(path, init)
    if (!response.ok) {
      let bodyText = ''
      try {
        bodyText = await response.text()
      } catch {
        bodyText = ''
      }
      const suffix = bodyText ? `: ${bodyText}` : ''
      throw new Error(`InsForge request failed (${response.status})${suffix}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return (await response.json()) as T
    }

    return (await response.text()) as T
  }

  return {
    url,
    anonKey,
    fetch: insforgeFetch,
    request,
  }
}

