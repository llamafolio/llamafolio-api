import { getDefiplazaLpBalance } from '@adapters/defiplaza/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const underlyings: `0x${string}`[] = [
  '0x090185f2135308bad17527004364ebcc2d37e5f6',
  '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  '0x514910771af9ca656af840dff83e8264ecf986ca',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  '0xdac17f958d2ee523a2206206994597c13d831ec7',
  '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
  '0xc00e94cb662c3520282e6f5717214004a7f26888',
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  '0xd533a949740bb3306d119cc777fa900ba034cd52',
  '0x6468e79a80c0eab0f9a2b574c8d5bc374af59414',
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  '0x2f57430a6ceda85a67121757785877b4a71b8e6d',
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
  '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  '0x6b175474e89094c44da98b954eedeac495271d0f',
]

const XDP2: Contract = {
  chain: 'ethereum',
  address: '0xe68c1d72340aeefe5be76eda63ae2f4bc7514110',
  underlyings,
}

export const getContracts = () => {
  return {
    contracts: { XDP2 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    XDP2: getDefiplazaLpBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1635465600,
}
