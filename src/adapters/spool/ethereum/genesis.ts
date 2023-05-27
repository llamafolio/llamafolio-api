import type { Balance, BalancesContext, BaseBalance, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  earned: {
    inputs: [
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  users: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'users',
    outputs: [
      { internalType: 'uint128', name: 'instantDeposit', type: 'uint128' },
      { internalType: 'uint128', name: 'activeDeposit', type: 'uint128' },
      { internalType: 'uint128', name: 'owed', type: 'uint128' },
      { internalType: 'uint128', name: 'withdrawnDeposits', type: 'uint128' },
      { internalType: 'uint128', name: 'shares', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const Spool: Token = {
  chain: 'ethereum',
  address: '0x40803cEA2b2A32BdA1bE61d3604af6a814E70976',
  decimals: 18,
  symbol: 'SPOOL',
}

export async function getYieldBalances(ctx: BalancesContext, pools: Contract[]) {
  const balances: Balance[] = []

  const [getDeposit, getEarned] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
      abi: abi.users,
    }),

    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [Spool.address, ctx.address] } as const)),
      abi: abi.earned,
    }),
  ])

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const depositRes = getDeposit[i]
    const earnedRes = getEarned[i]
    const underlying = pool.underlyings?.[0] as BaseBalance
    if (!underlying || !depositRes.success || !earnedRes.success) {
      continue
    }

    const [instantDeposit] = depositRes.output

    balances.push({
      chain: ctx.chain,
      name: pool.name,
      address: pool.address,
      symbol: underlying.symbol,
      decimals: underlying.decimals,
      amount: BigNumber.from(instantDeposit),
      underlyings: [{ ...underlying, amount: BigNumber.from(instantDeposit) }],
      rewards: [{ ...Spool, amount: BigNumber.from(earnedRes.output) }],
      category: 'farm',
    })
  }

  return balances
}
