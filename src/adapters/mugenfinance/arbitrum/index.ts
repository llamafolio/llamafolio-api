import { getMugenAutoCompoundStakeBalances, getMugenStakeBalance } from '@adapters/mugenfinance/arbitrum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sMGN: Contract = {
  chain: 'arbitrum',
  address: '0x25b9f82d1f1549f97b86bd0873738e30f23d15ea',
  token: '0xFc77b86F3ADe71793E1EEc1E7944DB074922856e',
  rewards: ['0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'],
}

const autocompounderMGNs: Contract[] = [
  {
    chain: 'arbitrum',
    address: '0x44e4c3668552033419520be229cd9df0c35c4417',
    token: '0xFc77b86F3ADe71793E1EEc1E7944DB074922856e',
  },
  {
    chain: 'arbitrum',
    address: '0x5a45fa1eb7033b488f160fe8c852ef867547ff65',
    token: '0xFc77b86F3ADe71793E1EEc1E7944DB074922856e',
  },
]

export const getContracts = () => {
  return {
    contracts: { sMGN, autocompounderMGNs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sMGN: getMugenStakeBalance,
    autocompounderMGNs: getMugenAutoCompoundStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1677024000,
}
