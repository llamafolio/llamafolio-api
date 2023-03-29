import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

import { getPopsicleYieldBalances } from '../common/yield'

const yieldsPools: Contract[] = [
  {
    chain: 'arbitrum',
    address: '0xa7053782dC3523D2C82B439Acf3f9344Fb47b97f',
  },
  {
    chain: 'arbitrum',
    address: '0x7F65417dd8997596a46224285f6689A4ee7Ed06e',
  },
  {
    chain: 'arbitrum',
    address: '0x87324250330634b5bBdac11c123Ca371246d5478',
  },
  {
    chain: 'arbitrum',
    address: '0xaeA103feED85dDAE00f4CdE0ce364fE6233579f8',
  },
  {
    chain: 'arbitrum',
    address: '0x77b97777D2c4494B2c21F130cA4c091500847aF7',
  },
  {
    chain: 'arbitrum',
    address: '0xEf8518A4e164BEEcc59D6b8b880F3536AA65d187',
  },
  {
    chain: 'arbitrum',
    address: '0x9BBA438CF450374453Bd4DE3b1A6d56835Af5e85',
  },
  {
    chain: 'arbitrum',
    address: '0x051612bbDebfc200A20F6B11B3d4D02A2f28f9c5',
  },
]

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getPairsDetails(ctx, yieldsPools)

  return {
    contracts: { pairs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPopsicleYieldBalances,
  })

  return {
    groups: [{ balances }],
  }
}
