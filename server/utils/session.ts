/// <reference path="../../auth.d.ts" />
import type { H3Event } from 'h3'
import type { SessionUser } from '#shared/types/auth'

export async function requireUser(event: H3Event): Promise<SessionUser> {
  const session = await requireUserSession(event)

  return session.user
}
