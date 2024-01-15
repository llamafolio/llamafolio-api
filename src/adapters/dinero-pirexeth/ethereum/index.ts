import { getDineroStakeBalance } from '@adapters/dinero-pirexeth/ethereum/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const pxETH: Contract = {
  chain: 'ethereum',
  address: '0x04c154b66cb340f3ae24111cc767e0184ed00cc6',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const apxETH: Contract = {
  chain: 'ethereum',
  address: '0x9ba021b0a9b958b5e75ce9f6dff97c7ee52cb3e6',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

export const getContracts = () => {
  return {
    contracts: { pxETH, apxETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pxETH: getSingleStakeBalance,
    apxETH: getDineroStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
