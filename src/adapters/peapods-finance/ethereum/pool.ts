import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  allIndexes: {
    inputs: [],
    name: 'allIndexes',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'index', type: 'address' },
          { internalType: 'bool', name: 'verified', type: 'bool' },
        ],
        internalType: 'struct IIndexManager.IIndexAndStatus[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  lpRewardsToken: {
    inputs: [],
    name: 'lpRewardsToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpStakingPool: {
    inputs: [],
    name: 'lpStakingPool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakingToken: {
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolRewards: {
    inputs: [],
    name: 'poolRewards',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUnpaid: {
    inputs: [{ internalType: 'address', name: '_wallet', type: 'address' }],
    name: 'getUnpaid',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const PEAS: Contract = {
  chain: 'ethereum',
  address: '0x02f92800f57bcd74066f5709f1daa1a4302df875',
  decimals: 18,
  symbol: 'PEAS',
}

export async function getPeaPodsPools(ctx: BaseContext, factory: Contract): Promise<Contract> {
  const vaultAddresses = await call({ ctx, target: factory.address, abi: abi.allIndexes } as const)

  const poolAddresses = await multicall({
    ctx,
    calls: vaultAddresses.map((pool) => ({ target: pool.index }) as const),
    abi: abi.lpStakingPool,
  })

  const [tokens, rewarders] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(poolAddresses, (res) => ({ target: res.output }) as const),
      abi: abi.stakingToken,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(poolAddresses, (res) => ({ target: res.output }) as const),
      abi: abi.poolRewards,
    }),
  ])

  const pools = mapMultiSuccessFilter(
    tokens.map((_, i) => [tokens[i], rewarders[i]]),

    (res) => {
      const [{ input, output: token }, { output: rewarder }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address: input.target,
        token,
        rewarder,
        rewards: ['0x02f92800f57bcd74066f5709f1daa1a4302df875'],
      }
    },
  )

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}

export async function getPeaPodsStakeBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [balances, pendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.rewarder, params: [ctx.address] }) as const),
      abi: abi.getUnpaid,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    balances.map((_, i) => [balances[i], pendingRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const [{ output: amount }, { output: earn }] = res.inputOutputPairs

      return {
        ...(pool as Balance),
        amount,
        rewards: [{ ...PEAS, amount: earn }],
        category: 'stake',
      }
    },
  )

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}
