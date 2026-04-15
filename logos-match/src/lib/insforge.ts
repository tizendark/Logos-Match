export type InsForgeConfig = {
  url: string
  anonKey: string
}

export const insforgeConfig: InsForgeConfig = {
  url: process.env.NEXT_PUBLIC_INSFORGE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? '',
}
