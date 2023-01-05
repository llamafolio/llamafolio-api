import { BigNumber, utils } from 'ethers'

export const getCvxCliffRatio = (cvxTotalSupply: BigNumber, crvAmount: BigNumber) => {
  const CLIFFSIZE = BigNumber.from(1e5).mul(utils.parseEther('1.0'))
  const MAXSUPPLY = BigNumber.from(1e8).mul(utils.parseEther('1.0'))
  const CLIFFCOUNT = BigNumber.from(1e3)

  const currentCliff = cvxTotalSupply.div(CLIFFSIZE)

  if (currentCliff.lt(MAXSUPPLY)) {
    const remainingCliff = CLIFFCOUNT.sub(currentCliff)

    return crvAmount.mul(remainingCliff).div(CLIFFCOUNT)
  }

  return BigNumber.from(0)
}
