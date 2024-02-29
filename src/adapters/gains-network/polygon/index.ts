import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getGainsBalances } from '../common/farm'
import { getGainsLockerBalances } from '../common/locker'
import { getGainsNetworkStakeBalance, getsgGNSBalance } from '../common/stake'

const DAI: Token = {
  chain: 'polygon',
  address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
  decimals: 18,
  symbol: 'DAI',
}

const gDAI: Contract = {
  chain: 'polygon',
  address: '0x91993f2101cc758d0deb7279d41e880f7defe827',
  underlyings: [DAI],
  decimals: 18,
  symbol: 'gDAI',
}

const locker: Contract = {
  chain: 'polygon',
  address: '0xdd42aa3920c1d5b5fd95055d852135416369bcc1',
  token: '0x91993f2101cc758d0deb7279d41e880f7defe827',
  underlyings: [DAI],
  decimals: 18,
  symbol: 'gNFT-DAI',
}

const GNSStaking: Contract = {
  chain: 'polygon',
  address: '0xfb06a737f549eb2512eb6082a808fc7f16c0819d',
  token: '0xe5417af564e4bfda1c483642db72007871397896',
  rewards: [DAI],
}

const sGNS: Contract = {
  chain: 'polygon',
  address: '0x8c74b2256ffb6705f14ada8e86fbd654e0e2beca',
  token: '0xE5417Af564e4bFDA1c483642db72007871397896',
  rewards: [
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  ],
}

export const getContracts = () => {
  return {
    contracts: { gDAI, locker, GNSStaking, sGNS },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    gDAI: getGainsBalances,
    locker: getGainsLockerBalances,
    GNSStaking: getGainsNetworkStakeBalance,
    sGNS: getsgGNSBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1648598400,
}
