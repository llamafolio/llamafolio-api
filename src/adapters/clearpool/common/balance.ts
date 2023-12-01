import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  withdrawableRewardOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'withdrawableRewardOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getCurrentExchangeRate: {
    inputs: [],
    name: 'getCurrentExchangeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lastStakeId: {
    inputs: [],
    name: 'lastStakeId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakeInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'stakeInfo',
    outputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint96', name: 'amount', type: 'uint96' },
      { internalType: 'uint96', name: 'withdrawnReward', type: 'uint96' },
      { internalType: 'uint32', name: 'nodeId', type: 'uint32' },
      { internalType: 'uint64', name: 'timestamp', type: 'uint64' },
      { internalType: 'uint32', name: 'firstDistributionId', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewardOf: {
    inputs: [{ internalType: 'uint256', name: 'stakeId', type: 'uint256' }],
    name: 'rewardOf',
    outputs: [{ internalType: 'uint96', name: '', type: 'uint96' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const CPOOL: { [key: string]: Contract } = {
  ethereum: { chain: 'ethereum', address: '0x66761fa41377003622aee3c7675fc7b5c1c2fac5', decimals: 18, symbol: 'CPOOL' },
  polygon: { chain: 'polygon', address: '0xb08b3603C5F2629eF83510E6049eDEeFdc3A2D91', decimals: 18, symbol: 'CPOOL' },
  optimism: { chain: 'optimism', address: '0xc3630b805F10E91c2de084Ac26C66bCD91F3D3fE', decimals: 18, symbol: 'CPOOL' },
}

export async function getClearPoolsBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, userPendingRewards, pricePerFullShares] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.withdrawableRewardOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.getCurrentExchangeRate,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userPendingRewards[i], pricePerFullShares[i]]),

    (res, index) => {
      const pool = pools[index]
      const [{ output: balance }, { output: pendingReward }, { output: pricePerFullShare }] = res.inputOutputPairs
      const amount = (BigInt(balance) * pricePerFullShare) / parseEther('1.0')

      return {
        ...pool,
        amount,
        underlyings: undefined,
        rewards: [{ ...CPOOL[ctx.chain], amount: pendingReward }],
        category: 'farm',
      }
    },
  )
}

export async function getClearNodeStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const lastStakeId = await call({ ctx, target: staker.address, abi: abi.lastStakeId })

  const userBalances = await multicall({
    ctx,
    calls: rangeBI(0n, lastStakeId).map((i) => ({ target: staker.address, params: [i] }) as const),
    abi: abi.stakeInfo,
  })

  const nodeInfos = mapSuccessFilter(userBalances, (res) => {
    const [owner, amount] = res.output

    if (owner.toLowerCase() === ctx.address.toLowerCase() && amount !== 0n) {
      return {
        ...staker,
        amount,
        stakeId: res.input.params[0],
        underlyings: undefined,
        rewards: [],
        category: 'stake',
      }
    }
  })

  const rewardsOf = await multicall({
    ctx,
    calls: nodeInfos.map(({ stakeId }: any) => ({ target: staker.address, params: [stakeId] }) as const),
    abi: abi.rewardOf,
  })

  return mapSuccessFilter(rewardsOf, (res, index) => ({
    ...(nodeInfos[index] as Balance),
    rewards: [{ ...CPOOL[ctx.chain], amount: res.output }],
  }))
}
