import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getIzumiBalances } from '../common/balance'

const IZI: Token = {
  chain: 'polygon',
  address: '0x60d01ec2d5e98ac51c8b4cf84dfcce98d527c747',
  decimals: 18,
  symbol: 'IZI',
}

const factory: Contract = {
  chain: 'polygon',
  address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
}

const nonFungiblePositionManager: Contract = {
  chain: 'polygon',
  address: '0xc36442b4a4522e871399cd717abdd847ab11fe88',
}

const pools: Contract[] = [
  { chain: 'polygon', address: '0x01cc44fc1246d17681b325926865cdb6242277a5' },
  { chain: 'polygon', address: '0xc0840394978cbcde9fcccde2934636853a524965' },
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
