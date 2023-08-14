import { getReflexerFarmBalancesWithProxies } from '@adapters/reflexer/ethereum/farm'
import { getReflexerStakeBalances } from '@adapters/reflexer/ethereum/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const RAI: Contract = {
  chain: 'ethereum',
  address: '0x03ab458634910aad20ef5f1c8ee96f1d6ac54919',
  decimals: 18,
  symbol: 'RAI',
}

const FLX_ETH: Contract = {
  chain: 'ethereum',
  address: '0x69c6c08b91010c88c95775b6fd768e5b04efc106',
  token: '0xd6F3768E62Ef92a9798E5A8cEdD2b78907cEceF9',
  underlyings: ['0x6243d8CEA23066d098a15582d81a598b4e8391F4', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { FLX_ETH, RAI },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    FLX_ETH: getReflexerStakeBalances,
    RAI: getReflexerFarmBalancesWithProxies,
  })

  return {
    groups: [{ balances }],
  }
}
