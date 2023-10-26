import { getAssetsContracts } from '@adapters/compound-v3/common/asset'
import { getCompLendBalances, getCompRewardBalances } from '@adapters/compound-v3/common/balance'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'
import type { Token } from '@lib/token'

const USDC: Token = {
  chain: 'arbitrum',
  address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  decimals: 6,
  symbol: 'USDC',
}

const cUSDCv3: Contract = {
  chain: 'arbitrum',
  address: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA',
  underlyings: [USDC],
}

const rewarder: Contract = {
  chain: 'arbitrum',
  address: '0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae',
}

export const getContracts = async (ctx: BaseContext) => {
  const assets = await getAssetsContracts(ctx, [cUSDCv3])

  return {
    contracts: { compounders: [cUSDCv3], assets, rewarder },
    revalidate: 60 * 60,
  }
}

const compoundBalances = async (ctx: BalancesContext, compounders: Contract[], rewarder: Contract) => {
  return Promise.all([getSingleStakeBalances(ctx, compounders), getCompRewardBalances(ctx, rewarder, compounders)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    assets: (...args) => getCompLendBalances(...args, [cUSDCv3]),
    compounders: (...args) => compoundBalances(...args, rewarder),
  })

  return {
    groups: [{ balances }],
  }
}
