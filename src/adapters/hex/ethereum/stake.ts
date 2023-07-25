import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { sumBI } from '@lib/math'
import { multicall } from '@lib/multicall'

import { getRewardsBalances } from './reward'

const abi = {
  stakeCount: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'stakerAddr', type: 'address' }],
    name: 'stakeCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  stakeLists: {
    constant: true,
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'stakeLists',
    outputs: [
      { internalType: 'uint40', name: 'stakeId', type: 'uint40' },
      { internalType: 'uint72', name: 'stakedHearts', type: 'uint72' },
      { internalType: 'uint72', name: 'stakeShares', type: 'uint72' },
      { internalType: 'uint16', name: 'lockedDay', type: 'uint16' },
      { internalType: 'uint16', name: 'stakedDays', type: 'uint16' },
      { internalType: 'uint16', name: 'unlockedDay', type: 'uint16' },
      { internalType: 'bool', name: 'isAutoStake', type: 'bool' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const stakeCount = await call({ ctx, target: contract.address, params: [ctx.address], abi: abi.stakeCount })

  const findStakesAndIndexesRes = await multicall({
    ctx,
    calls: rangeBI(0n, stakeCount).map((i) => ({ target: contract.address, params: [ctx.address, i] }) as const),
    abi: abi.stakeLists,
  })

  const stakesAndIndexes = mapSuccessFilter(findStakesAndIndexesRes, (res, i) => {
    const [stakeId, stakedHearts, stakeShares, lockedDay, stakedDays, _unlockedDay, _isAutoStake] = res.output

    return {
      id: i,
      stakeId: stakeId,
      stake: stakedHearts,
      share: stakeShares,
      stakedDays: stakedDays,
      lockedDays: lockedDay,
    }
  })

  const amount = sumBI(stakesAndIndexes.map((balance) => balance.stake))

  const rewards = await getRewardsBalances(ctx, contract, stakesAndIndexes)
  const totalRewards = sumBI(rewards)

  balances.push({
    chain: ctx.chain,
    decimals: contract.decimals,
    symbol: contract.symbol,
    address: contract.address,
    amount,
    rewards: [
      {
        chain: ctx.chain,
        decimals: contract.decimals,
        symbol: contract.symbol,
        address: contract.address,
        amount: totalRewards,
      },
    ],
    category: 'stake',
  })

  return balances
}
