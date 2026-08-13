import { z } from 'zod'
import type { SessionUser } from '#shared/types/auth'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(72)
})

const dummyPasswordHash = hashPassword('cocktail-lab-timing-defense-placeholder')

dummyPasswordHash.catch(() => undefined)

export default defineEventHandler(async (event) => {
  assertRateLimit(event, 'auth:login', 10, 10 * 60 * 1000)

  const { email, password } = await readValidatedBody(event, bodySchema.parse)

  const account = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true }
  })

  const hashedPassword = account?.passwordHash ?? await dummyPasswordHash
  const passwordMatches = await verifyPassword(hashedPassword, password)

  if (!account || !passwordMatches) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  const user: SessionUser = { id: account.id, email: account.email, name: account.name }

  await setUserSession(event, { user })

  return { user }
})
