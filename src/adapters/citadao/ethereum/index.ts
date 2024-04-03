import { getCitaDaoStakeBalance } from '@adapters/citadao/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const xKNIGHT: Contract = {
  chain: 'ethereum',
  address: '0x20891b408c35e0b7ece14df59f259be3c763f120',
  decimals: 18,
  symbol: 'xKNIGHT',
  underlyings: ['0x3541A5C1b04AdABA0B83F161747815cd7B1516bC'],
}

export const getContracts = () => {
  return {
    contracts: { xKNIGHT },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xKNIGHT: getCitaDaoStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1675123200,
}
