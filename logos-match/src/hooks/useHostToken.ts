import { useEffect, useState } from 'react'

const STORAGE_KEY = 'logosmatch_host_token'

export function useHostToken() {
  const [hostToken, setHostToken] = useState<string | null>(null)

  useEffect(() => {
    // Read from localStorage only on client
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHostToken(stored)
      return
    }

    if (hostToken) return

    let cancelled = false
    console.log('Fetching /api/host/session...')
    fetch('/api/host/session', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        console.log('Got session data:', data)
        const token = typeof data?.hostToken === 'string' ? data.hostToken : null
        if (!token || cancelled) return
        window.localStorage.setItem(STORAGE_KEY, token)
        setHostToken(token)
      })
      .catch((err) => {
        console.error('Error fetching session:', err)
      })

    return () => {
      console.log('useHostToken useEffect cleanup')
      cancelled = true
    }
  }, [hostToken])

  return hostToken
}
