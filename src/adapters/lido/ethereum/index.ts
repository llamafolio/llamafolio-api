import { getStEthStakeBalances, getWStEthStakeBalances } from '@adapters/lido/common/stake'
import { getStMaticBalances } from '@adapters/lido/common/stake'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const WETH: Contract = {
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  chain: 'ethereum',
  symbol: 'WETH',
  decimals: 18,
  coingeckoId: 'weth',
}

const stETH: Contract = {
  name: 'stETH',
  displayName: 'Liquid staked Ether 2.0',
  chain: 'ethereum',
  address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
  symbol: 'stETH',
  decimals: 18,
  coingeckoId: 'staked-ether',
  underlyings: [WETH],
}

const wstETH: Contract = {
  name: 'wstETH',
  displayName: 'Wrapped liquid staked Ether 2.0',
  chain: 'ethereum',
  address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
  symbol: 'wstETH',
  decimals: 18,
  coingeckoId: 'wrapped-steth',
  underlyings: [WETH],
}

const MATICEthereum: Contract = {
  chain: 'ethereum',
  address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
  name: 'MATIC',
  symbol: 'MATIC',
  decimals: 18,
  coingeckoId: 'matic-network',
}

const stMATICEthereum: Contract = {
  chain: 'ethereum',
  address: '0x9ee91f9f426fa633d227f7a9b000e28b9dfd8599',
  name: 'Staked MATIC',
  symbol: 'stMATIC',
  decimals: 18,
  coingeckoId: 'lido-staked-matic',
  underlyings: [MATICEthereum],
}

export const getContracts = () => {
  return {
    contracts: {
      stETH,
      wstETH,
      stMATICEthereum,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    stETH: getStEthStakeBalances,
    wstETH: getWStEthStakeBalances,
    stMATICEthereum: getStMaticBalances,
  })

  return {
    balances,
  }
}
