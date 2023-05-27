import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'govRewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'tokenInfoDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'cowDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'historyReward', type: 'uint256' },
      { internalType: 'uint256', name: 'mdxProfit', type: 'uint256' },
      { internalType: 'uint256', name: 'cowProfit', type: 'uint256' },
      { internalType: 'uint256', name: 'mdxReward', type: 'uint256' },
      { internalType: 'uint256', name: 'cowReward', type: 'uint256' },
      { internalType: 'uint256', name: 'lastDepostBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCoinwindBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterchef: Contract,
): Promise<Balance[]> {
  const userInfosRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterchef.address, params: [pool.pid, ctx.address] } as const)),
    abi: abi.userInfo,
  })

  const balances: Balance[] = mapSuccessFilter(userInfosRes, (res, idx: number) => ({
    ...pools[idx],
    amount: BigNumber.from(res.output[0]),
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }))

  return balances
}
