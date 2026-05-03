export type InsForgeDbAuth = {
  baseUrl: string
  apiKey: string
}

export type InsForgeDbResponse<T> = T | { data: T }

function unwrap<T>(value: InsForgeDbResponse<T>): T {
  if (typeof value === 'object' && value !== null && 'data' in value) {
    return (value as { data: T }).data
  }
  return value as T
}

export function getInsForgeServiceAuth(): InsForgeDbAuth {
  const baseUrl = process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL
  const apiKey =
    process.env.INSFORGE_SERVICE_KEY ??
    process.env.INSFORGE_API_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!baseUrl) throw new Error('Missing INSFORGE_URL (or NEXT_PUBLIC_INSFORGE_URL)')
  if (!apiKey) {
    throw new Error(
      'Missing INSFORGE_SERVICE_KEY (or INSFORGE_API_KEY / SUPABASE_SERVICE_ROLE_KEY)',
    )
  }
  return { baseUrl, apiKey }
}

export async function insforgeDbRequest<T>(
  auth: InsForgeDbAuth,
  table: string,
  init: RequestInit,
  query: Record<string, string> = {},
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()

  const makeUrl = (path: string) => {
    const url = new URL(path, auth.baseUrl)
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
    return url
  }

  const headers = new Headers(init.headers)
  if (!headers.has('accept')) headers.set('accept', 'application/json')
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json')
  }
  if (method !== 'GET' && !headers.has('prefer')) {
    headers.set('prefer', 'return=representation')
  }
  headers.set('authorization', `Bearer ${auth.apiKey}`)
  headers.set('apikey', auth.apiKey)
  headers.set('x-api-key', auth.apiKey)

  const primaryUrl = makeUrl(`/api/database/records/${table}`)
  let response = await fetch(primaryUrl, { ...init, headers })
  if (response.status === 404) {
    const fallbackUrl = makeUrl(`/rest/v1/${table}`)
    response = await fetch(fallbackUrl, { ...init, headers })
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const suffix = text ? `: ${text}` : ''
    throw new Error(`InsForge DB request failed (${response.status})${suffix}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Unexpected response content-type: ${contentType}`)
  }

  return unwrap((await response.json()) as InsForgeDbResponse<T>)
}

export async function dbSelect<T>(
  auth: InsForgeDbAuth,
  table: string,
  query: Record<string, string> = {},
): Promise<T[]> {
  return insforgeDbRequest<T[]>(auth, table, { method: 'GET' }, query)
}

export async function dbInsert<T>(
  auth: InsForgeDbAuth,
  table: string,
  payload: unknown,
  query: Record<string, string> = {},
): Promise<T> {
  return insforgeDbRequest<T>(
    auth,
    table,
    { method: 'POST', body: JSON.stringify(payload) },
    query,
  )
}

export async function dbUpdate<T>(
  auth: InsForgeDbAuth,
  table: string,
  payload: unknown,
  query: Record<string, string>,
): Promise<T> {
  return insforgeDbRequest<T>(
    auth,
    table,
    { method: 'PATCH', body: JSON.stringify(payload) },
    query,
  )
}

export async function dbDelete<T>(
  auth: InsForgeDbAuth,
  table: string,
  query: Record<string, string>,
): Promise<T> {
  return insforgeDbRequest<T>(
    auth,
    table,
    { method: 'DELETE' },
    query,
  )
}
