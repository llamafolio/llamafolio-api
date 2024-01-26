import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { get_xLP_UnderlyingsBalances } from '@lib/gmx/underlying'
import { getVaultTokens } from '@lib/gmx/vault'
import { multicall } from '@lib/multicall'

const abi = {
  sharesToken: {
    inputs: [],
    name: 'sharesToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakedAmounts: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stakedAmounts',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimable: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const vault: Contract = {
  chain: 'arbitrum',
  address: '0x489ee077994b6658eafa855c308275ead8097c4a',
}

export async function getJPools(ctx: BaseContext, jPoolsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [stakeTokens, rewardTokens] = await Promise.all([
    multicall({ ctx, calls: jPoolsAddresses.map((pool) => ({ target: pool }) as const), abi: abi.sharesToken }),
    multicall({ ctx, calls: jPoolsAddresses.map((pool) => ({ target: pool }) as const), abi: abi.sharesToken }),
  ])

  const pools = mapMultiSuccessFilter(
    stakeTokens.map((_, i) => [stakeTokens[i], rewardTokens[i]]),

    (res, index) => {
      const jPool = jPoolsAddresses[index]
      const [{ output: token }, { output: reward }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address: jPool,
        token,
        rewards: [reward],
      }
    },
  )

  return [
    { ...pools[0], underlyings: ['0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'] },
    { ...pools[1], asset: '0x5402b5f40310bded796c7d0f3ff6683f5c0cffdf', underlyings: await getVaultTokens(ctx, vault) },
  ]
}

export async function getJPoolsBalances(ctx: BalancesContext, jPools: Contract[]): Promise<Balance[]> {
  const [balances, pendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: jPools.map((jpool) => ({ target: jpool.address, params: [ctx.address] }) as const),
      abi: abi.stakedAmounts,
    }),
    multicall({
      ctx,
      calls: jPools.map((jpool) => ({ target: jpool.address, params: [ctx.address] }) as const),
      abi: abi.claimable,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    balances.map((_, i) => [balances[i], pendingRewards[i]]),

    (res, index) => {
      const pool = jPools[index]
      const underlyings = pool.underlyings as Contract[]
      const reward = pool.rewards![0] as Contract
      const [{ output: amount }, { output: rewardBalance }] = res.inputOutputPairs

      return {
        ...pool,
        amount,
        underlyings,
        rewards: [{ ...reward, amount: rewardBalance }],
        category: 'farm',
      }
    },
  )

  return processUnderlyings(ctx, poolBalances)
}

async function processUnderlyings(ctx: BalancesContext, rawPoolBalances: Balance[]): Promise<Balance[]> {
  const balance: Balance[] = []

  for (const rawPoolBalance of rawPoolBalances) {
    if (rawPoolBalance.underlyings && rawPoolBalance.underlyings.length > 2) {
      balance.push(
        ...(await get_xLP_UnderlyingsBalances(ctx, [rawPoolBalance], vault, {
          getAddress: (contract) => contract.asset!,
        })),
      )
    } else {
      balance.push(rawPoolBalance)
    }
  }
  return balance
}
