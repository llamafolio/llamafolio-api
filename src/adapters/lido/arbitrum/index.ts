import { getWStEthStakeBalances } from '@adapters/lido/common/stake'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const wstETH: Contract = {
  name: 'wstETH',
  displayName: 'Wrapped liquid staked Ether 2.0',
  chain: 'arbitrum',
  address: '0x5979D7b546E38E414F7E9822514be443A4800529',
  symbol: 'wstETH',
  decimals: 18,
  coingeckoId: 'wrapped-steth',
}

export const getContracts = () => {
  return {
    contracts: {
      wstETH,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    wstETH: getWStEthStakeBalances,
  })

  return {
    balances,
  }
}
