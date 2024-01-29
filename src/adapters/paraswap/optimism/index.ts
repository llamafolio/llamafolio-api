import { getParaspaceBPTStakeBalances, getParaSpaceStakeBalances } from '@adapters/paraswap/ethereum/stake'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const bptParaStake: Contract = {
  chain: 'optimism',
  address: '0x26ee65874f5dbefa629eb103e7bbb2deaf4fb2c8',
  token: '0x11f0b5CCA01B0F0A9Fe6265aD6E8ee3419c68440',
  underlyings: ['0x4200000000000000000000000000000000000006', '0xd3594E879B358F430E20F82bea61e83562d49D48'],
  poolId: '0x11f0b5cca01b0f0a9fe6265ad6e8ee3419c684400002000000000000000000d4',
  vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  provider: 'balancer',
}

const stakers: Contract[] = [
  {
    chain: 'optimism',
    address: '0x8c934b7dbc782568d14ceabbeaedf37cb6348615',
    token: '0xd3594e879b358f430e20f82bea61e83562d49d48',
  },
]

export const getContracts = () => {
  return {
    contracts: { bptParaStake, stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    bptParaStake: getParaspaceBPTStakeBalances,
    stakers: getParaSpaceStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1692230400,
}
