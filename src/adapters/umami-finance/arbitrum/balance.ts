import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const mUMAMI: Contract = {
  chain: 'arbitrum',
  address: '0x2adabd6e8ce3e82f52d9998a7f64a90d294a92a4',
  decimals: 9,
  symbol: 'mUMAMI',
}

export async function getUmamiFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const fmtBalances = await multicall({
    ctx,
    calls: mapSuccessFilter(userBalancesRes, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(fmtBalances, (res, i) => ({
    ...pools[i],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }))
}

export async function getUmamiBoostedFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const fmtBalancesRes = await multicall({
    ctx,
    calls: mapSuccessFilter(userBalancesRes, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  const balances: Balance[] = mapSuccessFilter(fmtBalancesRes, (res, i) => ({
    ...pools[i],
    amount: res.output,
    underlyings: pools[i].underlyings as Contract[],
    rewards: undefined,
    category: 'farm',
  }))

  const fmtBoostedBalances = await multicall({
    ctx,
    calls: balances.map((balance) => ({ target: balance.token!, params: [balance.amount] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(fmtBoostedBalances, (res, i) => ({ ...balances[i], amount: res.output }))
}

export async function getcUmamiFarmBalance(ctx: BalancesContext, pool: Contract): Promise<Balance> {
  const [balance, totalSupply, tokenBalance] = await Promise.all([
    call({ ctx, target: pool.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: pool.address, abi: erc20Abi.totalSupply }),
    call({ ctx, target: mUMAMI.address, params: [pool.address], abi: erc20Abi.balanceOf }),
  ])

  const updateBalance = (balance * tokenBalance) / totalSupply

  return {
    ...pool,
    amount: balance,
    underlyings: [{ ...mUMAMI, amount: updateBalance }],
    rewards: undefined,
    category: 'farm',
  }
}
