import type { AdapterConfig } from "@lib/adapter";import { getAssetsContracts } from '@adapters/compound-v3/common/asset'
import { getCompLendBalances } from '@adapters/compound-v3/common/balance'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'
import type { Token } from '@lib/token'

const USDC: Token = {
  chain: 'polygon',
  address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  decimals: 6,
  symbol: 'USDC',
}

const cUSDCv3: Contract = {
  chain: 'polygon',
  address: '0xF25212E676D1F7F89Cd72fFEe66158f541246445',
  underlyings: [USDC],
}

const rewarder: Contract = {
  chain: 'polygon',
  address: '0x45939657d1CA34A8FA39A924B71D28Fe8431e581',
}

export const getContracts = async (ctx: BaseContext) => {
  const compounders = await getAssetsContracts(ctx, [cUSDCv3])

  return {
    contracts: { compounders },
    revalidate: 60 * 60,
  }
}

const compoundBalances = async (ctx: BalancesContext, compounders: Contract[], rewarder: Contract) => {
  return Promise.all([getSingleStakeBalances(ctx, compounders), getCompLendBalances(ctx, compounders, rewarder)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    compounders: (...args) => compoundBalances(...args, rewarder),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1678147200,
                  }
                  