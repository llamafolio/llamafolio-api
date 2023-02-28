import { Balance, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getERC20BalanceOf } from '@lib/erc20'
import { Token } from '@lib/token'

import { getBendDaoLocker } from './locker'
import { getNftBalances, getNftContracts } from './nft'

const veBend: Contract = {
  chain: 'ethereum',
  address: '0xd7e97172c2419566839bf80deea46d22b1b2e06e',
  decimals: 18,
  symbol: 'veBEND',
  underlyings: ['0x0d02755a5700414B26FF040e1dE35D337DF56218'],
}

const bendWeth: Contract = {
  chain: 'ethereum',
  address: '0xeD1840223484483C0cb050E6fC344d1eBF0778a9',
  symbol: 'bendWETH',
  decimals: 18,
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
}

const registry: Contract = {
  chain: 'ethereum',
  address: '0x79d922DD382E42A156bC0A354861cDBC4F09110d',
}

export const getContracts = async (ctx: BaseContext) => {
  const nfts = await getNftContracts(ctx, registry)

  return {
    contracts: { bendWeth, veBend, registry, nfts },
  }
}

async function getBendBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  return (await getERC20BalanceOf(ctx, [contract] as Token[])).map((res) => ({ ...res, category: 'farm' }))
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    bendWeth: getBendBalances,
    veBend: getBendDaoLocker,
    nfts: getNftBalances,
  })

  return {
    balances,
  }
}
