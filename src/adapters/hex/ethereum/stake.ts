import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { sumBN } from '@lib/math'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

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

  const stakeCountRes = await call({ ctx, target: contract.address, params: [ctx.address], abi: abi.stakeCount })

  const findStakesAndIndexesRes = await multicall({
    ctx,
    calls: range(0, Number(stakeCountRes)).map(
      (i) => ({ target: contract.address, params: [ctx.address, BigInt(i)] } as const),
    ),
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

  const amount = sumBN(stakesAndIndexes.map((balance) => BigNumber.from(balance.stake)))

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
