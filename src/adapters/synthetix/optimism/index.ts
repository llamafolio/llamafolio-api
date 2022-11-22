import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getLendBorrowBalances } from '../common/lend'

const SNX: Token = {
  chain: 'optimism',
  decimals: 18,
  address: '0x8700daec35af8ff88c16bdf0418774cb3d7599b4',
  symbol: 'SNX',
}

const sUSD: Token = {
  symbol: 'sUSD',
  address: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
  decimals: 18,
  chain: 'optimism',
}

const synthetix: Contract = {
  name: 'Synthetix',
  chain: 'optimism',
  symbol: 'SNX',
  decimals: 18,
  address: '0xfe8e48bf36ccc3254081ec8c65965d1c8b2e744d',
  underlyings: [SNX],
}

export const getContracts = async () => {
  return {
    contracts: { synthetix },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    synthetix: (ctx, chain, synthetix) =>
      getLendBorrowBalances(ctx, chain, {
        synthetixContract: synthetix,
        feePoolAddress: '0xD3739A5F06747e148E716Dcb7147B9BA15b70fcc',
        sUSD: sUSD,
      }),
  })

  return {
    balances,
  }
}
