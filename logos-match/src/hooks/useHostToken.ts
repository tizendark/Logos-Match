import { useEffect, useState } from 'react'

const STORAGE_KEY = 'logosmatch_host_token'

export function useHostToken() {
  const [hostToken, setHostToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(STORAGE_KEY)
  })

  useEffect(() => {
    if (hostToken) return

    let cancelled = false
    fetch('/api/host/session', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        const token = typeof data?.hostToken === 'string' ? data.hostToken : null
        if (!token || cancelled) return
        window.localStorage.setItem(STORAGE_KEY, token)
        setHostToken(token)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [hostToken])

  return hostToken
}
