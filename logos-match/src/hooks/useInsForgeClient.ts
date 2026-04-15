import { useMemo } from 'react'

import { insforgeConfig } from '@/lib/insforge'
import {
  createInsForgeClient,
  isInsForgeConfigured,
  type InsForgeClient,
} from '@/lib/insforgeClient'

export function useInsForgeClient(): InsForgeClient | null {
  return useMemo(() => {
    if (!isInsForgeConfigured(insforgeConfig)) return null
    return createInsForgeClient(insforgeConfig)
  }, [])
}
