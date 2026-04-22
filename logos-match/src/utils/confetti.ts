import confetti from 'canvas-confetti'

export function triggerConfetti() {
  const duration = 3 * 1000
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#4f46e5', '#fbbf24', '#10b981'], // Indigo, Amber, Emerald
    })
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#4f46e5', '#fbbf24', '#10b981'],
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}
