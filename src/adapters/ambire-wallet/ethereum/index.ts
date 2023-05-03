import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getADXStakeBalances } from './stake'

const ADX: Token = {
  chain: 'ethereum',
  address: '0xADE00C28244d5CE17D72E40330B1c318cD12B7c3',
  decimals: 18,
  symbol: 'ADX',
}

const WALLET: Token = {
  chain: 'ethereum',
  address: '0x88800092fF476844f74dC2FC427974BBee2794Ae',
  decimals: 18,
  symbol: 'WALLET',
}

const adx_staking: Contract = {
  chain: 'ethereum',
  address: '0xb6456b57f03352be48bf101b46c1752a0813491a',
  underlyings: [ADX],
  symbol: 'ADX-STAKING',
  decimal: 18,
}

const xWALLET: Contract = {
  chain: 'ethereum',
  address: '0x47cd7e91c3cbaaf266369fe8518345fc4fc12935',
  underlyings: [WALLET],
  symbol: 'xWALLET ',
  decimal: 18,
}

export const getContracts = () => {
  return {
    contracts: { stakers: [adx_staking, xWALLET] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getADXStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
