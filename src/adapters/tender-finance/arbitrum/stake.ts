import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  stakedAmounts: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stakedAmounts',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  depositBalances: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'depositBalances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimable: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const TND: Contract = {
  chain: 'arbitrum',
  address: '0xc47d9753f3b32aa9548a7c3f30b6aec3b2d2798c',
  decimals: 18,
  symbol: 'TND',
}

const esTND: Contract = {
  chain: 'arbitrum',
  address: '0xff9bd42211f12e2de6599725895f37b4ce654ab2',
  decimals: 18,
  symbol: 'esTND',
}

const WETH: Contract = {
  chain: 'arbitrum',
  address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  decimals: 18,
  symbol: 'WETH',
}

export async function getTenderStakerBalance(ctx: BalancesContext, staker: Contract): Promise<Balance | undefined> {
  const underlyings = staker.underlyings as Contract[]
  if (!underlyings) return

  const [userDepositBalancesRes, userLPStake, pendingTND, pendingWeth] = await Promise.all([
    multicall({
      ctx,
      calls: [TND, esTND].map((token) => ({ target: staker.address, params: [ctx.address, token.address] }) as const),
      abi: abi.depositBalances,
    }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.stakedAmounts }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: staker.extraRewarder, params: [ctx.address], abi: abi.claimable }),
  ])

  underlyings.forEach((underlying, index) => {
    const userDepositBalances = userDepositBalancesRes[index].success ? userDepositBalancesRes[index].output : 0n
    underlying.amount = userDepositBalances
  })

  return {
    ...staker,
    amount: userLPStake,
    underlyings,
    rewards: [
      { ...esTND, amount: pendingTND },
      { ...WETH, amount: pendingWeth },
    ],
    category: 'stake',
  }
}
