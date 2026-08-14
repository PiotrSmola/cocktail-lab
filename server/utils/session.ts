/* eslint-disable-next-line @typescript-eslint/triple-slash-reference -- auth.d.ts is an ambient module augmentation with no runtime export; an `import` would be elided and `session.user` would lose its SessionUser type */
/// <reference path="../../auth.d.ts" />
import type { H3Event } from 'h3'
import type { SessionUser } from '#shared/types/auth'

export async function requireUser(event: H3Event): Promise<SessionUser> {
  const session = await requireUserSession(event)

  return session.user
}
