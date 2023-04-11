import { Balance, BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalances } from '@lib/lock'
import { getSingleStakeBalance } from '@lib/stake'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

import { getShareStakeBalances } from './balance'

const SGT: Contract = {
  chain: 'ethereum',
  address: '0x24C19F7101c1731b85F1127EaA0407732E36EcDD',
  decimals: 18,
  symbol: 'SGT',
  pid: 0,
}

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

const vETH2: Contract = {
  chain: 'ethereum',
  address: '0x898bad2774eb97cf6b94605677f43b41871410b1',
  decimals: 18,
  symbol: 'vETH2',
  underlyings: [WETH],
  pid: 4,
}

const vETH2_WETH: Contract = {
  chain: 'ethereum',
  address: '0x62b2a3cfA8E579631D255aefD53fEcEfD946A638',
  decimals: 18,
  symbol: 'SLP',
  underlyings: [vETH2, WETH],
  provider: 'sushi',
  pid: 1,
}

const veSGT: Contract = {
  chain: 'ethereum',
  address: '0x21b555305e9d65c8b8ae232e60fd806edc9c5d78',
  token: '0x41bFBa56B9Ba48D0a83775d89c247180617266bc',
  decimals: 18,
  symbol: 'veSGT',
  underlyings: [SGT, WETH],
  pid: 2,
}

const SGT_WETH: Contract = {
  chain: 'ethereum',
  address: '0x41bFBa56B9Ba48D0a83775d89c247180617266bc',
  decimals: 18,
  symbol: 'SLP',
  underlyings: [SGT, WETH],
  provider: 'sushi',
  pid: 3,
}

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'ethereum',
  address: '0x84b7644095d9a8bfdd2e5bfd8e41740bc1f4f412',
}

export const getContracts = () => {
  return {
    contracts: { masterChef, pools: [SGT, vETH2_WETH, SGT_WETH, vETH2, veSGT] },
  }
}

async function getLockedBalances(ctx: BalancesContext, lockers: Contract[]): Promise<Balance[]> {
  const balances = await getSingleLockerBalances(ctx, lockers, 'locked')
  const updatedBalances = balances.map((balance) => ({ ...balance, address: balance.token }))

  return getUnderlyingBalances(ctx, updatedBalances as Balance[])
}

async function getSharedBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances = await getShareStakeBalances(ctx, pools, masterChef)

  if (pools.some((pool) => pool.address === '0x898bad2774eb97cf6b94605677f43b41871410b1')) {
    balances.push(await getSingleStakeBalance(ctx, vETH2))
  }

  if (pools.some((pool) => pool.address === '0x21b555305e9d65c8b8ae232e60fd806edc9c5d78')) {
    balances.push(...(await getLockedBalances(ctx, [veSGT])))
  }

  return balances
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getSharedBalances,
  })

  return {
    groups: [{ balances }],
  }
}
