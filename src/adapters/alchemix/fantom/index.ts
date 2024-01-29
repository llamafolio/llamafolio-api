import { getTransmutationBalances as getTransmutationBalancesV2 } from '@adapters/alchemix/common/transmuter-v2'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

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
  address: '0x486fcc9385dcd16fe9ac21a959b072dcb58912e0',
  underlyings: [DAI],
}

const usdcTransmuter: Contract = {
  chain: 'fantom',
  address: '0xae653176d1af6a68b5ce57481427a065e1bac49f',
  underlyings: [USDC],
}

const usdtTransmuter: Contract = {
  chain: 'fantom',
  address: '0x53f05426d48e667c6a131f17db1b6f7ac535abc6',
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
  address: '0x76b2e3c5a183970aaad2a48cf6ae79e3e16d3a0e',
  underlyings: [alUSD],
}

const reactivesV2 = [daiTransmuter, usdcTransmuter, usdtTransmuter, ydaiTransmuter, yusdcTransmuter, yusdtTransmuter]

const transmutersV2 = [alUSDtransmuter]

export const getContracts = () => {
  return {
    contracts: { transmutersV2 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    transmutersV2: (...args) => getTransmutationBalancesV2(...args, reactivesV2),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1637193600,
}
