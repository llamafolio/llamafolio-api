import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { sumBN } from '@lib/math'
import { multicall } from '@lib/multicall'

import { getRewardsBalances } from './reward'

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const stakeCountRes = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: {
      constant: true,
      inputs: [{ internalType: 'address', name: 'stakerAddr', type: 'address' }],
      name: 'stakeCount',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  })

  const findStakesAndIndexesRes = await multicall({
    ctx,
    calls: range(0, stakeCountRes.output).map((i) => ({
      target: contract.address,
      params: [ctx.address, i],
    })),
    abi: {
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
  })

  const stakesAndIndexes = findStakesAndIndexesRes
    .filter((res) => res.success)
    .map((res, i) => ({
      id: i,
      stakeId: res.output.stakeId,
      stake: res.output.stakedHearts,
      share: res.output.stakeShares,
      stakedDays: res.output.stakedDays,
      lockedDays: res.output.lockedDay,
    }))

  const amount = sumBN(stakesAndIndexes.map((balance) => balance.stake))

  const rewards = await getRewardsBalances(ctx, contract, stakesAndIndexes)
  const totalRewards = sumBN(rewards)

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
