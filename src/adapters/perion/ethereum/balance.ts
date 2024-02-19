import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  getDepositsOf: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'getDepositsOf',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'shareAmount', type: 'uint256' },
          { internalType: 'uint64', name: 'start', type: 'uint64' },
          { internalType: 'uint64', name: 'end', type: 'uint64' },
        ],
        internalType: 'struct TimeLockPool.Deposit[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  withdrawableRewardsOf: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'withdrawableRewardsOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const PERC: Contract = {
  chain: 'ethereum',
  address: '0x60be1e1fe41c1370adaf5d8e66f07cf1c2df2268',
  decimals: 18,
  symbol: 'PERC',
}

export async function getsPERCBalances(ctx: BalancesContext, sPERC: Contract): Promise<Balance[]> {
  const [lockedOfs, pendingReward] = await Promise.all([
    call({ ctx, target: sPERC.address, params: [ctx.address], abi: abi.getDepositsOf }),
    call({ ctx, target: sPERC.address, params: [ctx.address], abi: abi.withdrawableRewardsOf }),
  ])
  return lockedOfs.map((lock) => {
    const now = Date.now() / 1000
    const { amount, end } = lock
    const unlockAt = Number(end)

    return {
      ...sPERC,
      amount,
      underlyings: sPERC.underlyings as Contract[],
      claimable: now > unlockAt ? amount : 0n,
      unlockAt,
      rewards: [{ ...PERC, amount: pendingReward }],
      category: 'lock',
    }
  })
}

export async function getsPERCLPBalances(ctx: BalancesContext, sPERC_LP: Contract): Promise<Balance[]> {
  const lpBalances = await getsPERCBalances(ctx, sPERC_LP)
  return getUnderlyingBalances(ctx, lpBalances, { getAddress: (contract) => contract.token! })
}
