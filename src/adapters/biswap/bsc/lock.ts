import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getUserInfo: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserInfo',
    outputs: [
      {
        components: [
          { internalType: 'uint128', name: 'amount', type: 'uint128' },
          { internalType: 'uint128', name: 'lastDepositTimestamp', type: 'uint128' },
          { internalType: 'uint128', name: 'unlockTimestamp', type: 'uint128' },
        ],
        internalType: 'struct DivPool.UserInfo',
        name: '_userInfo',
        type: 'tuple',
      },
      { internalType: 'uint256', name: '_totalAmount', type: 'uint256' },
      { internalType: 'uint256', name: '_maxStakePerUser', type: 'uint256' },
      { internalType: 'uint256', name: '_earlyWithdrawalFee', type: 'uint256' },
      { internalType: 'bool', name: 'endLockPeriod', type: 'bool' },
      { internalType: 'uint256', name: 'bswBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BSW: Token = {
  chain: 'bsc',
  address: '0x965f527d9159dce6288a2219db51fc6eef120dd1',
  decimals: 18,
  symbol: 'BSW',
}

export async function getBiswapLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const userInfo = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getUserInfo })

  const now = Date.now() / 1000
  const unlockAt = Number(userInfo[0].unlockTimestamp)

  return {
    ...locker,
    amount: BigNumber.from(userInfo[0].amount),
    underlyings: [BSW],
    claimable: now > unlockAt ? BigNumber.from(userInfo[0].amount) : BN_ZERO,
    unlockAt,
    rewards: undefined,
    category: 'lock',
  }
}
