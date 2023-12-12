import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  vaultMap: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'vaultMap',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  lockedLiquidityOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'lockedLiquidityOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [],
    name: 'earned',
    outputs: [
      { internalType: 'address[]', name: 'token_addresses', type: 'address[]' },
      { internalType: 'uint256[]', name: 'total_earned', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  curveLpToken: {
    inputs: [],
    name: 'curveLpToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type CurveBalance = Balance & {
  token: `0x${string}`
  pool?: `0x${string}`
}

export async function getConvexFraxPoolsBalances(ctx: BalancesContext, vaults: Contract[]): Promise<Balance[]> {
  const userVaultsInfos = await getVaultInfos(ctx, vaults)
  return getCurveUnderlyingsBalances(ctx, userVaultsInfos)
}

async function getVaultInfos(ctx: BalancesContext, vaults: Contract[]): Promise<CurveBalance[]> {
  const [vaultBalances, pendingEarneds, curvePools] = await Promise.all([
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.staker, params: [vault.address] }) as const),
      abi: abi.lockedLiquidityOf,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address }) as const),
      abi: abi.earned,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address }) as const),
      abi: abi.curveLpToken,
    }),
  ])

  return mapMultiSuccessFilter(
    vaultBalances.map((_, i) => [vaultBalances[i], pendingEarneds[i]]),

    (res, index) => {
      const pool = vaults[index]
      const token = curvePools[index].success ? curvePools[index].output : pool.token!
      if (!token) return null

      const rawRewards = pool.rewards as Contract[]
      const [{ output: amount }, { output: pendingEarneds }] = res.inputOutputPairs
      const [tokens, balances] = pendingEarneds

      const rewards = rawRewards
        .map((reward) => {
          const tokenIdx = tokens.findIndex(
            (token: `0x${string}`) => token.toLowerCase() === reward.address.toLowerCase(),
          )
          return tokenIdx !== -1 ? { ...reward, amount: balances[tokenIdx] } : null
        })
        .filter(isNotNullish)

      return {
        ...pool,
        amount,
        token,
        underlyings: undefined,
        rewards,
        category: 'stake',
      }
    },
  )
}
