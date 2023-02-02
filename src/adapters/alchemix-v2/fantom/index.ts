import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getTransmutationBalances } from '../common/transmuter'

const DAI: Token = {
  chain: 'fantom',
  address: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
  decimals: 18,
  symbol: 'DAI',
}

const USDC: Token = {
  chain: 'fantom',
  address: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
  decimals: 6,
  symbol: 'USDC',
}

const USDT: Token = {
  chain: 'fantom',
  address: '0x049d68029688eabf473097a2fc38ef61633a3c7a',
  decimals: 6,
  symbol: 'USDT',
}

const daiTransmuter: Contract = {
  chain: 'fantom',
  address: '0x486FCC9385dCd16fE9ac21a959B072dcB58912e0',
  underlyings: [DAI],
}

const usdcTransmuter: Contract = {
  chain: 'fantom',
  address: '0xaE653176d1AF6A68B5ce57481427a065E1baC49f',
  underlyings: [USDC],
}

const usdtTransmuter: Contract = {
  chain: 'fantom',
  address: '0x53F05426D48E667c6a131F17db1b6f7AC535aBC6',
  underlyings: [USDT],
}

const ydaiTransmuter: Contract = {
  chain: 'fantom',
  address: '0x637ec617c86d24e421328e6caea1d92114892439',
  underlyings: [DAI],
}

const yusdcTransmuter: Contract = {
  chain: 'fantom',
  address: '0xef0210eb96c7eb36af8ed1c20306462764935607',
  underlyings: [USDC],
}

const yusdtTransmuter: Contract = {
  chain: 'fantom',
  address: '0x148c05caf1bb09b5670f00d511718f733c54bc4c',
  underlyings: [USDT],
}

const alUSD: Token = {
  chain: 'fantom',
  address: '0xb67fa6defce4042070eb1ae1511dcd6dcc6a532e',
  decimals: 18,
  symbol: 'alUSD',
}

const alUSDtransmuter: Contract = {
  chain: 'fantom',
  address: '0x76b2E3c5a183970AAAD2A48cF6Ae79E3e16D3A0E',
  underlyings: [alUSD],
}

const reactives = [daiTransmuter, usdcTransmuter, usdtTransmuter, ydaiTransmuter, yusdcTransmuter, yusdtTransmuter]

const transmuters = [alUSDtransmuter]

export const getContracts = () => {
  return {
    contracts: { transmuters, reactives },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    transmuters: (...args) => getTransmutationBalances(...args, reactives),
  })

  return {
    balances,
  }
}
