import { getBifrostBalances } from '@adapters/bifrost-liquid-staking/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vETH1: Contract = {
  chain: 'ethereum',
  address: '0xc3D088842DcF02C13699F936BB83DFBBc6f721Ab',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const vETH2: Contract = {
  chain: 'ethereum',
  address: '0x4Bc3263Eb5bb2Ef7Ad9aB6FB68be80E43b43801F',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const SLPCore: Contract = {
  chain: 'ethereum',
  address: '0x74bAA141B18D5D1eeF1591abf37167FbeCE23B72',
}

export const getContracts = () => {
  return {
    contracts: { stakers: [vETH1, vETH2] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: (...args) => getBifrostBalances(...args, SLPCore),
  })

  return {
    groups: [{ balances }],
  }
}
