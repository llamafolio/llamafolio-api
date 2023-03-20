import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getIzumiBalances } from '../common/balance'

const IZI: Token = {
  chain: 'arbitrum',
  address: '0x60d01ec2d5e98ac51c8b4cf84dfcce98d527c747',
  decimals: 18,
  symbol: 'IZI',
}

const factory: Contract = {
  chain: 'arbitrum',
  address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
}

const nonFungiblePositionManager: Contract = {
  chain: 'arbitrum',
  address: '0xc36442b4a4522e871399cd717abdd847ab11fe88',
}

const pools: Contract[] = [
  { chain: 'arbitrum', address: '0x0893eb041c20a34ce524050711492fa8377d838b' },
  { chain: 'arbitrum', address: '0xb2decea19d58ebe10ab215a04db2edbe52e37fa4' },
]

export const getContracts = () => {
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getIzumiBalances(...args, nonFungiblePositionManager, factory, IZI),
  })

  return {
    groups: [{ balances }],
  }
}
