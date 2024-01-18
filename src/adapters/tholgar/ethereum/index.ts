import { getWarlordVault } from '@adapters/tholgar/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const war: Token = {
  chain: 'ethereum',
  address: '0xa8258deE2a677874a48F5320670A869D74f0cbC1',
  decimals: 18,
  symbol: 'WAR',
}

const warlordVault: Contract = {
  chain: 'ethereum',
  address: '0x188cA46Aa2c7ae10C14A931512B62991D5901453',
  decimals: 18,
  symbol: 'tWAR',
  underlyings: [war],
}

export const getContracts = () => {
  return {
    contracts: { warlordVault },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    warlordVault: getWarlordVault,
  })

  return {
    groups: [{ balances }],
  }
}
