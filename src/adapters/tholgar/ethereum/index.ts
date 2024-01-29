import { getWarlordVault } from '@adapters/tholgar/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
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

const warAuraLocker: Contract = {
  chain: 'ethereum',
  address: '0x7B90e043aaC79AdeA0Dbb0690E3c832757207a3B',
  token: '0xC0c293ce456fF0ED870ADd98a0828Dd4d2903DBF',
}
const warCvxLocker: Contract = {
  chain: 'ethereum',
  address: '0x700d6d24A55512c6AEC08820B49da4e4193105B3',
  token: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
}

export const getContracts = () => {
  return {
    contracts: { warlordVault },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    warlordVault: (...args) => getWarlordVault(...args, [warAuraLocker, warCvxLocker]),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1695427200,
}
