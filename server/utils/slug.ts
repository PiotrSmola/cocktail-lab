export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  let candidate = base
  let suffix = 2

  while (taken.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  taken.add(candidate)
  return candidate
}
