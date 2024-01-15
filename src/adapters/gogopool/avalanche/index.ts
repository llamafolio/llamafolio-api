import { getGGPFarmBalance, getGGPStakeBalance } from '@adapters/gogopool/avalanche/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sGGP: Contract = {
  chain: 'avalanche',
  address: '0xB6dDbf75e2F0C7FC363B47B84b5C03959526AecB',
  decimals: 18,
  underlyings: ['0x69260b9483f9871ca57f81a90d91e2f96c2cd11d', '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'],
}

const ggAVAX: Contract = {
  chain: 'avalanche',
  address: '0xA25EaF2906FA1a3a13EdAc9B9657108Af7B703e3',
  underlyings: ['0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'],
}

export const getContracts = () => {
  return {
    contracts: { sGGP, ggAVAX },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sGGP: getGGPStakeBalance,
    ggAVAX: getGGPFarmBalance,
  })

  return {
    groups: [{ balances }],
  }
}
