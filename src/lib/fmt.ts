import { isNotFalsy } from '@lib/type'

export function boolean(val: any): boolean {
  switch (val) {
    case 0:
    case 'n':
    case 'N':
    case 'no':
      return false

    case 1:
    case 'y':
    case 'Y':
    case 'yes':
      return true

    default:
      return Boolean(val)
  }
}

export function millify(amount: number): string {
  const quantifiers = [
    [10 ** 9, 'B'],
    [10 ** 6, 'M'],
    [10 ** 3, 'k'],
  ] as [number, string][]

  for (const [denominator, letter] of quantifiers) {
    if (amount > denominator) {
      return `${+(amount / denominator).toFixed(2)} ${letter}`
    }
  }

  return amount.toFixed(2)
}

export function millifyBI(amount: bigint): string {
  return millify(Number(amount))
}

/**
 * parse stringified JSON, removing newlines and tabs
 * if it fails to parse, return the original string
 */
export function parseStringJSON(jsonString: string) {
  try {
    if (!isNotFalsy(jsonString)) return jsonString
    return JSON.parse(jsonString.replaceAll(/[\n\\\n\r\t\\\\]/g, ''))
  } catch (error) {
    console.error('Failed to parse JSON', { string: jsonString })
    return jsonString
  }
}
