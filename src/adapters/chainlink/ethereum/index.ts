import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getChainlinkStakerBalances } from './balance'

const link: Token = {
  chain: 'ethereum',
  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  decimals: 18,
  symbol: 'LINK',
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0x3feb1e09b4bb0e7f0387cee092a52e85797ab889',
  underlyings: [link],
}

export const getContracts = async () => {
  return {
    contracts: { staker },
    // TODO: check contract interaction
    props: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, _contracts, props) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, props, {
    staker: getChainlinkStakerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
