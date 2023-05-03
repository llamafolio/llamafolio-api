import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

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
      calls: pools.map((pool) => ({
        target: pool.address,
        params: [ctx.address],
      })),
      abi: {
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
    }),

    multicall({
      ctx,
      calls: pools.map((pool) => ({
        target: pool.address,
        params: [Spool.address, ctx.address],
      })),
      abi: {
        inputs: [
          { internalType: 'contract IERC20', name: 'token', type: 'address' },
          { internalType: 'address', name: 'account', type: 'address' },
        ],
        name: 'earned',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const deposits = getDeposit.filter((res) => res.success).map((res) => BigNumber.from(res.output.instantDeposit))
  const earneds = getEarned.filter((res) => res.success).map((res) => BigNumber.from(res.output))

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const deposit = deposits[i]
    const earned = earneds[i]
    const underlying = pool.underlyings?.[0]
    if (!underlying) {
      continue
    }

    balances.push({
      chain: ctx.chain,
      name: pool.name,
      address: pool.address,
      symbol: underlying.symbol,
      decimals: underlying.decimals,
      amount: deposit,
      underlyings: [{ ...underlying, amount: deposit }],
      rewards: [{ ...Spool, amount: earned }],
      category: 'farm',
    })
  }

  return balances
}
