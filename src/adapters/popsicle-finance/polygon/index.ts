import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

import { getPopsicleFarmBalances, getPopsicleFarmContracts } from '../common/farm'
import { getPopsicleYieldBalances } from '../common/yield'

const farmer: Contract = {
  chain: 'polygon',
  address: '0xbf513ace2abdc69d38ee847effdaa1901808c31c',
  rewards: ['0x4e1581f01046efdd7a1a2cdb0f82cdd7f71f2e59'],
}

const yieldsPools: Contract[] = [
  {
    chain: 'polygon',
    address: '0x5C08A6762CAF9ec8a42F249eBC23aAE66097218D',
    pool: '0x88f3C15523544835fF6c738DDb30995339AD57d6',
  },
  {
    chain: 'polygon',
    address: '0xaE7b92C8B14E7bdB523408aE0A6fFbf3f589adD9',
    pool: '0x781067Ef296E5C4A4203F81C593274824b7C185d',
  },
  {
    chain: 'polygon',
    address: '0xa0273C10b8A4BF0bDC57cb0bC974E3A9d89527b8',
    pool: '0x86f1d8390222A3691C28938eC7404A1661E618e0',
  },
  {
    chain: 'polygon',
    address: '0x949FDF28F437258E7564a35596b1A99b24F81e4e',
    pool: '0x167384319B41F7094e62f7506409Eb38079AbfF8',
  },
  {
    chain: 'polygon',
    address: '0x9683D433621A83aA7dd290106e1da85251317F55',
    pool: '0x3F5228d0e7D75467366be7De2c31D0d098bA2C23',
  },
  {
    chain: 'polygon',
    address: '0xd2C5A739ebfE3E00CFa88A51749d367d7c496CCf',
    pool: '0x0e44cEb592AcFC5D3F09D996302eB4C499ff8c10',
  },
  {
    chain: 'polygon',
    address: '0xa7053782dC3523D2C82B439Acf3f9344Fb47b97f',
    pool: '0x45dDa9cb7c25131DF268515131f647d726f50608',
  },
]

export const getContracts = async (ctx: BaseContext) => {
  const [pairs, contracts] = await Promise.all([
    getPairsDetails(ctx, yieldsPools),
    getPopsicleFarmContracts(ctx, farmer),
  ])

  return {
    contracts: { pairs, contracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPopsicleYieldBalances,
    contracts: getPopsicleFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
