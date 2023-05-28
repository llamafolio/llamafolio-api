import { parseEther } from 'viem'

export const getCvxCliffRatio = (cvxTotalSupply: bigint, crvAmount: bigint) => {
  const CLIFFSIZE = 10n ** 5n * parseEther('1.0')
  const MAXSUPPLY = 10n ** 8n * parseEther('1.0')
  const CLIFFCOUNT = 10n ** 3n

  const currentCliff = cvxTotalSupply / CLIFFSIZE

  if (currentCliff < MAXSUPPLY) {
    const remainingCliff = CLIFFCOUNT - currentCliff

    return (crvAmount * remainingCliff) / CLIFFCOUNT
  }

  return 0n
}
