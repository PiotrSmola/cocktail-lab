import type { H3Event } from 'h3'

interface RateLimitEntry {
  hits: number[]
  expiresAt: number
}

const store = new Map<string, RateLimitEntry>()

function prune(now: number): void {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key)
    }
  }
}

export function assertRateLimit(event: H3Event, bucket: string, max: number, windowMs: number): void {
  const now = Date.now()
  prune(now)

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'local'
  const key = `${bucket}:${ip}`
  const windowStart = now - windowMs
  const hits = (store.get(key)?.hits ?? []).filter(timestamp => timestamp > windowStart)

  if (hits.length >= max) {
    store.set(key, { hits, expiresAt: (hits[0] ?? now) + windowMs })
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }

  hits.push(now)
  store.set(key, { hits, expiresAt: now + windowMs })
}
