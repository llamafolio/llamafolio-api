import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

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
  totalBorrow: {
    inputs: [],
    name: 'totalBorrow',
    outputs: [
      { internalType: 'uint128', name: 'amount', type: 'uint128' },
      { internalType: 'uint128', name: 'shares', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalAsset: {
    inputs: [],
    name: 'totalAsset',
    outputs: [
      { internalType: 'uint128', name: 'amount', type: 'uint128' },
      { internalType: 'uint128', name: 'shares', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const FRAX: Contract = {
  chain: 'ethereum',
  address: '0x853d955acef822db058eb8505911ed77f175b99e',
  decimals: 18,
  symbol: 'FRAX',
}

export const getLendBorrowBalances = async (ctx: BalancesContext, pairs: Contract[]) => {
  const [userSnapshotsRes, LTVs, totalBorrowRes, totalAssetRes] = await Promise.all([
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.address, params: [ctx.address] }) as const),
      abi: abi.getUserSnapshot,
    }),
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.address })),
      abi: abi.maxLTV,
    }),
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.address })),
      abi: abi.totalBorrow,
    }),
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.address })),
      abi: abi.totalAsset,
    }),
  ])

  return mapMultiSuccessFilter(
    userSnapshotsRes.map((_, i) => [userSnapshotsRes[i], LTVs[i], totalBorrowRes[i], totalAssetRes[i]]),

    (res, index) => {
      const pair = pairs[index]

      const [{ output: balances }, { output: LTV }, { output: borrowInfos }, { output: assetInfos }] =
        res.inputOutputPairs

      const [userAssetShares, userBorrowShares, userCollateralBalance] = balances

      const [amountBorrow, sharesBorrow] = borrowInfos
      const [amountAsset, sharesAsset] = assetInfos

      if (sharesBorrow === 0n || sharesAsset === 0n) return null

      const pricePerFullShareBorrow = Number(amountBorrow) / Number(sharesBorrow)
      const userBorrow = Number(userBorrowShares) * pricePerFullShareBorrow

      const pricePerFullShareAsset = Number(amountAsset) / Number(sharesAsset)
      const userAsset = Number(userAssetShares) * pricePerFullShareAsset

      const asset: Balance = {
        ...FRAX,
        amount: BigInt(userAsset),
        underlyings: undefined,
        rewards: undefined,
        collateralFactor: LTV != null ? LTV * 10n ** 13n : undefined,
        category: 'lend',
      }

      const collateral: Balance = {
        ...pair,
        amount: userCollateralBalance,
        underlyings: pair.underlyings as Contract[],
        rewards: undefined,
        collateralFactor: LTV != null ? LTV * 10n ** 13n : undefined,
        category: 'lend',
      }

      const borrow: Balance = {
        ...FRAX,
        amount: BigInt(userBorrow),
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return [asset, collateral, borrow]
    },
  ).filter(isNotNullish)
}
