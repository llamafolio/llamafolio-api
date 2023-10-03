import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'

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
  maxLTV: {
    inputs: [],
    name: 'maxLTV',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const getLendBorrowBalances = async (ctx: BalancesContext, pairs: Contract[], FRAX: Contract) => {
  const balances: Balance[] = []

  const [userSnapshotsRes, LTVs] = await Promise.all([
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.address, params: [ctx.address] }) as const),
      abi: abi.getUserSnapshot,
    }),
    multicall({
      ctx,
      calls: pairs.map((pair) => ({
        target: pair.address,
      })),
      abi: abi.maxLTV,
    }),
  ])

  for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
    const pair = pairs[pairIdx]
    const userSnapshotRes = userSnapshotsRes[pairIdx]
    const LTV = LTVs[pairIdx]

    if (userSnapshotRes.success) {
      const [userAssetShares, userBorrowShares, userCollateralBalance] = userSnapshotRes.output

      const asset: Balance = {
        ...pair,
        amount: userAssetShares,
        underlyings: [FRAX],
        rewards: undefined,
        collateralFactor: LTV.output != null ? LTV.output * 10n ** 13n : undefined,
        category: 'lend',
      }

      balances.push(asset)

      const collateral: Balance = {
        ...pair,
        amount: userCollateralBalance,
        underlyings: pair.underlyings as Contract[],
        rewards: undefined,
        collateralFactor: LTV.output != null ? LTV.output * 10n ** 13n : undefined,
        category: 'lend',
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
