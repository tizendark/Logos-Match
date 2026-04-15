const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length = 6) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  let out = ''
  for (let i = 0; i < array.length; i++) {
    out += ALPHABET[array[i] % ALPHABET.length]
  }
  return out
}

export function generateHostToken() {
  return crypto.randomUUID()
}

