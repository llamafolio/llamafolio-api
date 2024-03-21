import { getBlackRockFundMasterChefPoolBalances } from '@adapters/blackrockfund/ethereum/masterChef'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x1fde0d2f44539789256d94d1784a86bf77d66dd0',
}

const masterChef2: Contract = {
  chain: 'ethereum',
  address: '0x1e4a10d18698e4450e13b4e8ef361a5841850611',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, pools2] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address }),
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef2.address }),
  ])

  return {
    contracts: { pools, pools2 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getBlackRockFundMasterChefPoolBalances(...args, masterChef),
    pools2: (...args) => getBlackRockFundMasterChefPoolBalances(...args, masterChef2),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1708560000,
}
