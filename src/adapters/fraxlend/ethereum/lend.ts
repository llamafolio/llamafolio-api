import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getUserSnapshot: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getUserSnapshot',
    outputs: [
      { internalType: 'uint256', name: '_userAssetShares', type: 'uint256' },
      { internalType: 'uint256', name: '_userBorrowShares', type: 'uint256' },
      { internalType: 'uint256', name: '_userCollateralBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export const getLendBorrowBalances = async (ctx: BalancesContext, pairs: Contract[], FRAX: Contract) => {
  const balances: Balance[] = []

  const userSnapshotsRes = await multicall({
    chain: ctx.chain,
    calls: pairs.map((pair) => ({
      target: pair.address,
      params: [ctx.address],
    })),
    abi: abi.getUserSnapshot,
  })

  for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
    const pair = pairs[pairIdx]
    const userSnapshotRes = userSnapshotsRes[pairIdx]

    if (isSuccess(userSnapshotRes)) {
      const userAssetShares = BigNumber.from(userSnapshotRes.output._userAssetShares)
      const userBorrowShares = BigNumber.from(userSnapshotRes.output._userBorrowShares)
      const userCollateralBalance = BigNumber.from(userSnapshotRes.output._userCollateralBalance)

      const asset: Balance = {
        chain: ctx.chain,
        decimals: pair.decimals,
        symbol: pair.symbol,
        address: pair.address,
        amount: userAssetShares,
        category: 'lend',
        underlyings: [FRAX],
      }

      balances.push(asset)

      const collateral: Balance = {
        chain: ctx.chain,
        decimals: pair.decimals,
        symbol: pair.symbol,
        address: pair.address,
        amount: userCollateralBalance,
        category: 'lend',
        underlyings: pair.underlyings,
      }

      balances.push(collateral)

      const borrow: Balance = {
        chain: ctx.chain,
        decimals: pair.decimals,
        symbol: pair.symbol,
        address: pair.address,
        amount: userBorrowShares,
        category: 'borrow',
        underlyings: [FRAX],
      }

      balances.push(borrow)
    }
  }

  return balances
}
