import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getPoolStakingBalances, getStakerBalances } from './balance'

const USDC: Token = {
  chain: 'arbitrum',
  address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  decimals: 6,
  symbol: 'USDC',
}

const sGLP: Token = {
  chain: 'arbitrum',
  address: '0x2f546ad4edd93b956c8999be404cdcafde3e89ae',
  decimals: 18,
  symbol: 'sGLP',
}

const dnGmxSeniorVault: Contract = {
  chain: 'arbitrum',
  address: '0xf9305009fba7e381b3337b5fa157936d73c2cf36',
  decimals: 6,
  symbol: 'DN_GMX_SENIOR',
  underlyings: [USDC],
}

const dnGmxJuniorVault: Contract = {
  chain: 'arbitrum',
  address: '0x8478ab5064ebac770ddce77e7d31d969205f041e',
  decimals: 6,
  symbol: 'DN_GMX_JUNIOR',
  underlyings: [sGLP],
}

const tricrypto: Contract = {
  chain: 'arbitrum',
  address: '0x1d42783E7eeacae12EbC315D1D2D0E3C6230a068',
  pool: '0x960ea3e3C7FB317332d990873d354E18d7645590',
  registry: '0x445FE580eF8d70FF569aB36e80c647af338db351',
  lpToken: '0x8e0b8c8bb9db49a46697f3a5bb8a308e744821d2',
  decimals: 18,
  symbol: 'TCS',
  underlyings: [
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  ],
}

export const getContracts = async () => {
  return {
    contracts: { stakers: [dnGmxSeniorVault, dnGmxJuniorVault], tricrypto },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getStakerBalances,
    tricrypto: getPoolStakingBalances,
  })

  return {
    balances,
  }
}
