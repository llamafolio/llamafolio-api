import { getHLPBalance, getHMXBalance, getsHLPBalance } from '@adapters/hmx/arbitrum/balance'
import { getHLPContract, getHMXContract, getsHLPContract } from '@adapters/hmx/arbitrum/contract'
import { getHMXVestBalances } from '@adapters/hmx/arbitrum/vest'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const controller: Contract = {
  chain: 'arbitrum',
  address: '0x92e586b8d4bf59f4001604209a292621c716539a',
  underlyings: ['0x83d6c8c06ac276465e4c92e7ac8c23740f435140', '0x8a011ef14a92aa37ce82a4c95004a70730b6ac38'],
}

const vault: Contract = {
  chain: 'arbitrum',
  address: '0x56CC5A9c0788e674f17F7555dC8D3e2F1C0313C0',
}

const HLP: Contract = {
  chain: 'arbitrum',
  address: '0x4307fbdcd9ec7aea5a1c2958decaa6f316952bab',
  decimals: 18,
  symbol: 'HLP',
}

const sHLP: Contract = {
  chain: 'arbitrum',
  address: '0xbe8f8af5953869222ea8d39f1be9d03766010b1c',
  token: '0x4307fbdcd9ec7aea5a1c2958decaa6f316952bab',
}

const vester: Contract = {
  chain: 'arbitrum',
  address: '0x316e992a96c1a6dafececea5ca4e6d37896b3cb9',
  token: '0x83d6c8c06ac276465e4c92e7ac8c23740f435140',
}

export const getContracts = async (ctx: BaseContext) => {
  const [hlpVault, sHLPVault, esHMX_HMXVault] = await Promise.all([
    getHLPContract(ctx, HLP),
    getsHLPContract(ctx, sHLP),
    getHMXContract(ctx, controller),
  ])

  return {
    contracts: { hlpVault, sHLPVault, esHMX_HMXVault, vester },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    hlpVault: (...args) => getHLPBalance(...args, vault),
    sHLPVault: (...args) => getsHLPBalance(...args, vault),
    esHMX_HMXVault: getHMXBalance,
    vester: getHMXVestBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1687824000,
}
