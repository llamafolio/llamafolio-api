import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getLendBorrowBalances } from '../common/lend'

const SNX: Token = {
  chain: 'ethereum',
  decimals: 18,
  address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
  symbol: 'SNX',
}

const sUSD: Token = {
  symbol: 'sUSD',
  address: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
  decimals: 18,
  chain: 'ethereum',
}

const synthetix: Contract = {
  name: 'Synthetix',
  chain: 'ethereum',
  symbol: 'SNX',
  decimals: 18,
  address: '0x08f30ecf2c15a783083ab9d5b9211c22388d0564',
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
        feePoolAddress: '0x3b2f389aee480238a49e3a9985cd6815370712eb',
        sUSD: sUSD,
      }),
  })

  return {
    balances,
  }
}
