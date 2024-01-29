import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const stDOT: Contract = {
  chain: 'moonbeam',
  address: '0xfa36fe1da08c89ec72ea1f0143a35bfd5daea108',
  name: 'Liquid staked DOT',
  symbol: 'stDOT',
  decimals: 10,
  underlyings: ['0xFfFFfFff1FcaCBd218EDc0EbA20Fc2308C778080'],
}

export const getContracts = () => {
  return {
    contracts: {
      stDOT,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stDOT: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1658361600,
}
