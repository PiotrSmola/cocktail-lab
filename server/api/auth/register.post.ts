import { Prisma } from '@prisma/client'
import { z } from 'zod'
import type { SessionUser } from '#shared/types/auth'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(50)
})

export default defineEventHandler(async (event) => {
  assertRateLimit(event, 'auth:register', 10, 10 * 60 * 1000)

  const { email, password, name } = await readValidatedBody(event, bodySchema.parse)

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  })

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Email already registered' })
  }

  const passwordHash = await hashPassword(password)

  let user: SessionUser

  try {
    user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true }
    })
  }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Email already registered' })
    }

    throw error
  }

  await setUserSession(event, { user })

  return { user }
})
