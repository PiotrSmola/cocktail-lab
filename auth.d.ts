import type { SessionUser } from './shared/types/auth'

declare module '#auth-utils' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging into #auth-utils requires an interface; a type alias cannot augment a module's existing interface
  interface User extends SessionUser {}
}

export {}
