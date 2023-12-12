import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  token: {
    constant: true,
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  tokenPrice: {
    constant: true,
    inputs: [],
    name: 'tokenPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getGovTokens: {
    constant: true,
    inputs: [],
    name: 'getGovTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getGovTokensAmounts: {
    constant: true,
    inputs: [{ internalType: 'address', name: '_usr', type: 'address' }],
    name: 'getGovTokensAmounts',
    outputs: [{ internalType: 'uint256[]', name: '_amounts', type: 'uint256[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface OutputResponse {
  output: bigint
}

export async function getIdlePoolContracts(ctx: BaseContext, poolAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [tokens, rewards] = await Promise.all([
    multicall({
      ctx,
      calls: poolAddresses.map((pool) => ({ target: pool }) as const),
      abi: abi.token,
    }),
    multicall({
      ctx,
      calls: poolAddresses.map((pool) => ({ target: pool }) as const),
      abi: abi.getGovTokens,
    }),
  ])

  return mapMultiSuccessFilter(
    tokens.map((_, i) => [tokens[i], rewards[i]]),

    (res, index) => {
      const address = poolAddresses[index]
      const [{ output: token }, { output: rewards }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address,
        underlyings: [token],
        rewards,
      }
    },
  )
}

export async function getIdlePoolBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, pricePerFullShares, rewardBalances] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address }) as const), abi: abi.tokenPrice }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.getGovTokensAmounts,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], pricePerFullShares[i], rewardBalances[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlying = pool.underlyings![0] as Contract
      const rawRewards = pool.rewards as Contract[]
      const rawRewardBalances = rewardBalances[index].output
      const [{ output: userBalance }, { output: pricePerFullShare }] = res.inputOutputPairs as OutputResponse[]

      if (!underlying || !rawRewards) return null

      const underlyings = [{ ...underlying, amount: (userBalance * pricePerFullShare) / 10n ** BigInt(pool.decimals!) }]
      const rewards = rawRewards.map((reward, rewardIdx) => {
        return { ...reward, amount: rawRewardBalances![rewardIdx] }
      })

      return {
        ...pool,
        amount: userBalance,
        underlyings,
        rewards,
        category: 'farm' as Category,
      }
    },
  ).filter(isNotNullish)
}
