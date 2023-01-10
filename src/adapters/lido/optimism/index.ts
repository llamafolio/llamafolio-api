import { getWStEthStakeBalances } from '@adapters/lido/common/stake'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const wstETH: Contract = {
  name: 'wstETH',
  displayName: 'Wrapped liquid staked Ether 2.0',
  chain: 'optimism',
  address: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
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
