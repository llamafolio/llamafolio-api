import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

import type { ILVContract } from './contract'

const abi = {
  pendingRewards: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'pendingRewards',
    outputs: [
      { internalType: 'uint256', name: 'pendingYield', type: 'uint256' },
      { internalType: 'uint256', name: 'pendingRevDis', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getStakesLength: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getStakesLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getStake: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'uint256', name: '_stakeId', type: 'uint256' },
    ],
    name: 'getStake',
    outputs: [
      {
        components: [
          { internalType: 'uint120', name: 'value', type: 'uint120' },
          { internalType: 'uint64', name: 'lockedFrom', type: 'uint64' },
          { internalType: 'uint64', name: 'lockedUntil', type: 'uint64' },
          { internalType: 'bool', name: 'isYield', type: 'bool' },
        ],
        internalType: 'struct Stake.Data',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ILV: Token = {
  chain: 'ethereum',
  address: '0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E',
  decimals: 18,
  symbol: 'ILV',
}

export async function getILVBalances(ctx: BalancesContext, pools: ILVContract[]): Promise<Balance[]> {
  const singleUnderlyingsBalances: Balance[] = []
  const multipleUnderlyingsBalances: Balance[] = []

  const calls: Call<typeof erc20Abi.balanceOf>[] = pools.map((pool) => ({
    target: pool.address,
    params: [ctx.address],
  }))
  const stakersCalls: Call<typeof erc20Abi.balanceOf>[] = pools.map((pool) => ({
    target: pool.staker,
    params: [ctx.address],
  }))

  const [balancesOfRes, stakerBalancesOfRes, pendingsRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: stakersCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.pendingRewards }),
  ])

  pools.forEach((pool, poolIdx) => {
    const balanceOfRes = balancesOfRes[poolIdx]
    const stakerBalanceOfRes = stakerBalancesOfRes[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const pendingRewardsRes = pendingsRewardsRes[poolIdx]

    const pendingRewards = pendingRewardsRes.success ? BigNumber.from(pendingRewardsRes.output[0]) : BN_ZERO

    if (!underlyings || !balanceOfRes.success || !stakerBalanceOfRes.success) {
      return
    }

    const balance: Balance = {
      ...pool,
      address: pool.token,
      amount: BigNumber.from(balanceOfRes.output).add(stakerBalanceOfRes.output),
      underlyings,
      rewards: [{ ...ILV, amount: pendingRewards }],
      category: 'farm',
    }

    balance.underlyings!.length > 1
      ? multipleUnderlyingsBalances.push(balance)
      : singleUnderlyingsBalances.push(balance)
  })

  return [...singleUnderlyingsBalances, ...(await getUnderlyingBalances(ctx, multipleUnderlyingsBalances))]
}
