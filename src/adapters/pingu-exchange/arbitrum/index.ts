import { getPinguStakeBalance } from '@adapters/pingu-exchange/arbitrum/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { call } from '@lib/call'

const abi = {
  getAssetList: {
    inputs: [],
    name: 'getAssetList',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const poolStore: Contract = {
  chain: 'arbitrum',
  address: '0xe270E23dC782072DE5C75744E0dcFb75372f2791',
}

const assetStore: Contract = {
  chain: 'arbitrum',
  address: '0x275B398C3528bfb971505304bBd85850Be7C901A',
}

export const getContracts = async (ctx: BaseContext) => {
  poolStore.underlyings = (await call({ ctx, target: assetStore.address, abi: abi.getAssetList })) as any

  return {
    contracts: { poolStore },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    poolStore: getPinguStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1706572800,
}
