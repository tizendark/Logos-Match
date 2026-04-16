import { useEffect } from 'react'

export function usePlayerPresence(playerId: string | null) {
  useEffect(() => {
    if (!playerId) return

    let isUnloading = false

    // Enviar heartbeat cada 15 segundos
    const heartbeat = () => {
      if (isUnloading) return
      fetch(`/api/players/${playerId}/heartbeat`, { method: 'POST' }).catch(
        () => {},
      )
    }

    const intervalId = window.setInterval(heartbeat, 15000)
    // Primer heartbeat inmediato
    heartbeat()

    // Intentar marcar como desconectado cuando el usuario cierra la pestaña o navega
    const handleUnload = () => {
      isUnloading = true
      fetch(`/api/players/${playerId}/leave`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => {})
    }

    window.addEventListener('pagehide', handleUnload)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('pagehide', handleUnload)
      window.removeEventListener('beforeunload', handleUnload)
      // Si el componente se desmonta normalmente (no por recarga), también enviamos leave
      if (!isUnloading) {
        handleUnload()
      }
    }
  }, [playerId])
}
