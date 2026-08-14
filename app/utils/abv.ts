export type DilutionMethod = 'shake' | 'stir' | 'build'

export const DILUTION_FACTOR: Record<DilutionMethod, number> = {
  shake: 0.25,
  stir: 0.2,
  build: 0.12
}

export interface AbvLineInput {
  amountMl: number | null
  ingredient: {
    abv: number | null
    abvEstimated: boolean
    isAlcoholic: boolean
  }
}

export interface AbvEstimate {
  abv: number | null
  estimated: boolean
  alcoholMl: number
  volumeMl: number
}

export function detectDilution(instructions: string): DilutionMethod {
  if (/shake/i.test(instructions)) {
    return 'shake'
  }
  if (/stir/i.test(instructions)) {
    return 'stir'
  }
  return 'build'
}

export function estimateAbv(lines: AbvLineInput[], method: DilutionMethod): AbvEstimate {
  let volumeMl = 0
  let alcoholMl = 0
  let hasEstimatedIngredient = false
  let hasIncompleteVolume = false
  let hasUnmeasuredAlcohol = false

  for (const line of lines) {
    if (line.amountMl === null) {
      hasIncompleteVolume = true
      if (line.ingredient.isAlcoholic) {
        hasUnmeasuredAlcohol = true
      }
      continue
    }
    volumeMl += line.amountMl
    if (line.ingredient.abv === null) {
      continue
    }
    alcoholMl += line.amountMl * line.ingredient.abv / 100
    if (line.ingredient.abvEstimated) {
      hasEstimatedIngredient = true
    }
  }

  const estimated = hasEstimatedIngredient || hasIncompleteVolume || hasUnmeasuredAlcohol

  if (volumeMl <= 0) {
    return { abv: null, estimated: true, alcoholMl, volumeMl }
  }

  if (hasUnmeasuredAlcohol && alcoholMl === 0) {
    return { abv: null, estimated: true, alcoholMl, volumeMl }
  }

  const dilutedVolumeMl = volumeMl * (1 + DILUTION_FACTOR[method])
  const abv = Math.round(100 * alcoholMl / dilutedVolumeMl * 10) / 10

  return { abv, estimated, alcoholMl, volumeMl }
}

export function scaleAmount(value: number | null, factor: number): number | null {
  if (value === null) {
    return null
  }
  return Math.round(value * factor * 1000) / 1000
}
