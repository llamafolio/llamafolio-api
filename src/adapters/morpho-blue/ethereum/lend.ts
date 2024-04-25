import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { groupBy, mapMultiSuccessFilter } from '@lib/array'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'

const abi = {
  position: {
    inputs: [
      { internalType: 'Id', name: '', type: 'bytes32' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'position',
    outputs: [
      { internalType: 'uint256', name: 'supplyShares', type: 'uint256' },
      { internalType: 'uint128', name: 'borrowShares', type: 'uint128' },
      { internalType: 'uint128', name: 'collateral', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  market: {
    inputs: [{ internalType: 'Id', name: '', type: 'bytes32' }],
    name: 'market',
    outputs: [
      { internalType: 'uint128', name: 'totalSupplyAssets', type: 'uint128' },
      { internalType: 'uint128', name: 'totalSupplyShares', type: 'uint128' },
      { internalType: 'uint128', name: 'totalBorrowAssets', type: 'uint128' },
      { internalType: 'uint128', name: 'totalBorrowShares', type: 'uint128' },
      { internalType: 'uint128', name: 'lastUpdate', type: 'uint128' },
      { internalType: 'uint128', name: 'fee', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMorphoLendBalances(ctx: BalancesContext, router?: Contract): Promise<Balance[] | undefined> {
  if (!router) return

  const comptroller = router.comptroller
  if (!comptroller) return

  const assets = groupBy(comptroller.assets, 'id')

  const [userPositions, positionsParams] = await Promise.all([
    multicall({
      ctx,
      calls: Object.keys(assets).map(
        (asset) => ({ target: comptroller.address, params: [asset, ctx.address] }) as const,
      ),
      abi: abi.position,
    }),
    multicall({
      ctx,
      calls: Object.keys(assets).map((asset) => ({ target: comptroller.address, params: [asset] }) as const),
      abi: abi.market,
    }),
  ])

  return mapMultiSuccessFilter(
    userPositions.map((_, i) => [userPositions[i], positionsParams[i]]),

    (res) => {
      const [positions, { output: params }] = res.inputOutputPairs
      const [coll, debt] = assets[positions.input.params![0]]
      const [_supplyShares, borrowShares, collateral] = positions.output

      const [_, __, totalBorrowAssets, totalBorrowShares] = params
      const nonZeroTotalBorrowShares = totalBorrowShares === 0n ? 1n : totalBorrowShares

      const lender: Contract = {
        ...coll,
        amount: collateral,
        MCR: 1 / parseFloatBI(coll.ltv, 18),
      }

      const borrower: Contract = {
        ...debt,
        amount: (borrowShares * totalBorrowAssets) / nonZeroTotalBorrowShares,
      }

      return { balances: [lender, borrower] }
    },
  )
}
