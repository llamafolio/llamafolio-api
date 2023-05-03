import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLlamaBalances } from './balance'

const uCRV1: Contract = {
  chain: 'ethereum',
  address: '0x83507cc8c8b67ed48badd1f59f684d5d02884c81',
  underlyings: ['0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7'],
  symbol: 'uCRV',
  decimals: 18,
  provider: 'convex',
}

const uCRV2: Contract = {
  chain: 'ethereum',
  address: '0x4ebad8dbd4edbd74db0278714fbd67ebc76b89b7',
  underlyings: ['0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7'],
  symbol: 'ucvxCRV',
  decimals: 18,
  provider: 'convex',
}

const uCRV3: Contract = {
  chain: 'ethereum',
  address: '0xde2bef0a01845257b4aef2a2eaa48f6eaeafa8b7',
  underlyings: ['0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7'],
  symbol: 'ucvxCRV',
  decimals: 18,
  provider: 'convex',
}

const uFXS1: Contract = {
  chain: 'ethereum',
  address: '0xf964b0e3ffdea659c44a5a52bc0b82a24b89ce0e',
  underlyings: ['0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0', '0xFEEf77d3f69374f66429C91d732A244f074bdf74'],
  pool: '0xd658A338613198204DCa1143Ac3F01A722b5d94A',
  lpToken: '0xF3A43307DcAFa93275993862Aae628fCB50dC768',
  symbol: 'ucvxFXSFXS-f',
  decimals: 18,
  provider: 'curve',
}

const uFXS2: Contract = {
  chain: 'ethereum',
  address: '0x3a886455e5b33300a31c5e77bac01e76c0c7b29c',
  underlyings: ['0xFEEf77d3f69374f66429C91d732A244f074bdf74'],
  symbol: 'ucvxFXS',
  decimals: 18,
  provider: 'convex',
}

const uCVX: Contract = {
  chain: 'ethereum',
  address: '0x8659fc767cad6005de79af65dafe4249c57927af',
  underlyings: ['0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'],
  symbol: 'uCVX',
  decimals: 18,
  provider: 'llama',
}

const uBAL: Contract = {
  chain: 'ethereum',
  address: '0x8c4eb0fc6805ee7337ac126f89a807271a88dd67',
  underlyings: ['0x616e8BfA43F920657B3497DBf40D6b1A02D4608d'],
  symbol: 'uauraBAL',
  decimals: 18,
  provider: 'convex',
}

export const getContracts = () => {
  return {
    contracts: { farmers: [uCRV1, uCRV2, uCRV3, uFXS1, uFXS2, uCVX, uBAL] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmers: getLlamaBalances,
  })

  return {
    groups: [{ balances }],
  }
}
