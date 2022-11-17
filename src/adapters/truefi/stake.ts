import { Balance, BaseContext } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

import { PoolSupply } from './pools'

export async function getStakeBalances(ctx: BaseContext, chain: Chain, pools: PoolSupply[]) {
  const balances: Balance[] = []

  const calls = pools.map((pool) => ({
    target: pool.address,
    params: [ctx.address],
  }))

  const balanceOf = await multicall({
    chain,
    calls,
    abi: abi.balanceOf,
  })

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]

    if (!balanceOf[i].success) {
      continue
    }

    const amount = BigNumber.from(balanceOf[i].output).mul(pool.poolValue).div(pool.totalSupply)

    const balance: Balance = {
      category: 'stake',
      chain: pool.chain,
      address: pool.address,
      amount,
      underlyings: pool.underlyings && pool.underlyings[0] ? [{ ...pool.underlyings[0], amount }] : [],
    }

    balances.push(balance)
  }

  return balances
}
