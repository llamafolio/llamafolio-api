import { getsDaiBalance, getsDaiFarmBalance, getsDaiFarmv2Balance } from '@adapters/summer.fi/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sDAI: Contract = {
  chain: 'ethereum',
  address: '0x83f20f44975d03b1b09e64809b757c47f942beea',
  decimals: 18,
  symbol: 'sDAI',
  underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
}

const sDAIFarmer: Contract = {
  chain: 'ethereum',
  address: '0x197e90f9fad81970ba7976f33cbd77088e5d7cf7',
  token: '0x83f20f44975d03b1b09e64809b757c47f942beea',
  underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
}

const sDAIFarmerv2: Contract = {
  chain: 'ethereum',
  address: '0x373238337bfe1146fb49989fc222523f83081ddb',
  token: '0x83f20f44975d03b1b09e64809b757c47f942beea',
  underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
}

export const getContracts = () => {
  return {
    contracts: { sDAIFarmer, sDAIFarmerv2, sDAI },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sDAIFarmer: getsDaiFarmBalance,
    sDAIFarmerv2: getsDaiFarmv2Balance,
    sDAI: getsDaiBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1626048000,
}
