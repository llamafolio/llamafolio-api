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
