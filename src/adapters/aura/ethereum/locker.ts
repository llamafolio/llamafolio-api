import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  claimableRewards: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct AuraLocker.EarnedData[]',
        name: 'userRewards',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  lockedBalances: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'lockedBalances',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockable', type: 'uint256' },
      { internalType: 'uint256', name: 'locked', type: 'uint256' },
      {
        components: [
          { internalType: 'uint112', name: 'amount', type: 'uint112' },
          { internalType: 'uint32', name: 'unlockTime', type: 'uint32' },
        ],
        internalType: 'struct AuraLocker.LockedBalance[]',
        name: 'lockData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const auraBal: Token = {
  chain: 'ethereum',
  address: '0x616e8BfA43F920657B3497DBf40D6b1A02D4608d',
  decimals: 18,
  symbol: 'auraBAL',
}

const AURA: Token = {
  chain: 'ethereum',
  address: '0xc0c293ce456ff0ed870add98a0828dd4d2903dbf',
  decimals: 18,
  symbol: 'AURA',
}

export async function getAuraLockerBalances(ctx: BalancesContext, locker: Contract) {
  const balances: Balance[] = []

  const [lockedDatasRes, earnedRes] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.claimableRewards }),
  ])

  const lockedDatas = lockedDatasRes.output

  const totalLocked = BigNumber.from(lockedDatas.total)
  const earned = BigNumber.from(earnedRes.output[0].amount)

  for (const lockedData of lockedDatas.lockData) {
    balances.push({
      ...locker,
      amount: BigNumber.from(lockedData.amount),
      underlyings: [AURA],
      lock: { end: lockedData.unlockTime },
      rewards: [{ ...auraBal, amount: BigNumber.from(lockedData.amount).mul(earned).div(totalLocked) }],
      category: 'lock',
    })
  }

  return balances
}
