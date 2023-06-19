import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'

const abi = {
  deposits: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'deposits',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getDepositorGains: {
    inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
    name: 'getDepositorGains',
    outputs: [
      { internalType: 'address[]', name: '', type: 'address[]' },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const GRAI: Token = {
  chain: 'ethereum',
  address: '0x15f74458aE0bFdAA1a96CA1aa779D715Cc1Eefe4',
  decimals: 18,
  symbol: 'GRAI',
}

export async function getGravitaStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userDeposit, userPendingRewards] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.deposits }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getDepositorGains }),
  ])

  const fmtRewards = staker.rewards?.map((reward, idx) => {
    const [_address, amount] = userPendingRewards
    return {
      ...(reward as Balance),
      amount: amount[idx],
    }
  })

  return {
    ...staker,
    amount: userDeposit,
    underlyings: [GRAI],
    rewards: fmtRewards,
    category: 'stake',
  }
}
