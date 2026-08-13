import type { SessionUser } from './shared/types/auth'

declare module '#auth-utils' {
  interface User extends SessionUser {}
}

export {}
