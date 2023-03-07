import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFraxBalances } from './balance'
import { getFraxContracts } from './contract'
import contractsLists from './contracts.json'
import { getFraxLockerBalances } from './locker'
import { getStakedFraxBalances } from './staker'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xac3e018457b222d93114458476f3e3416abbe38f',
  decimals: 18,
  symbol: 'sfrxETH',
  underlyings: ['0x5E8422345238F34275888049021821E8E08CAa1f'],
}

const veFXS: Contract = {
  chain: 'ethereum',
  address: '0xc8418af6358ffdda74e09ca9cc3fe03ca6adc5b0',
  decimals: 18,
  symbol: 'veFXS',
  underlyings: ['0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0'],
  rewarder: '0xc6764e58b36e26b08Fd1d2AeD4538c02171fA872',
}

const veFPIS: Contract = {
  chain: 'ethereum',
  address: '0x574c154c83432b0a45ba3ad2429c3fa242ed7359',
  decimals: 18,
  symbol: 'veFPIS',
  underlyings: ['0xc2544A32872A91F4A553b404C6950e89De901fdb'],
  rewarder: '0xE6D31C144BA99Af564bE7E81261f7bD951b802F6',
}

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getFraxContracts(ctx, contractsLists)

  return {
    contracts: { contracts, staker, lockers: [veFXS, veFPIS] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  console.log(contracts)

  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    contracts: getFraxBalances,
    staker: getStakedFraxBalances,
    lockers: getFraxLockerBalances,
  })

  return {
    balances,
  }
}
