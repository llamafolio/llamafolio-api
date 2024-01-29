import { getBeltContracts } from '@adapters/belt-finance/bsc/contract'
import { getFarmBeltBalances } from '@adapters/belt-finance/bsc/farm'
import { getBeltLpBalances } from '@adapters/belt-finance/bsc/lp'
import { getBeltStakeBalance } from '@adapters/belt-finance/bsc/stake'
import type { AdapterConfig, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sBELT: Contract = {
  chain: 'bsc',
  address: '0x1794bb186c15fddbf4aac4a3b0e2f40659e9b841',
  token: '0xe0e514c71282b6f4e823703a39374cf58dc3ea4f',
}

const fourBelt: Contract = {
  chain: 'bsc',
  address: '0x86afa7ff694ab8c985b79733745662760e454169',
  pool: '0xF16D312d119c13dD27fD0dC814b0bCdcaAa62dfD',
  pid: 0,
  underlyings: [
    '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    '0x55d398326f99059fF775485246999027B3197955',
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  ],
  beltLP: true,
  provider: 'belt',
}

const fourBeltV2: Contract = {
  chain: 'bsc',
  address: '0x9cb73f20164e399958261c289eb5f9846f4d1404',
  pool: '0xAEA4f7dcd172997947809CE6F12018a6D5c1E8b6',
  pid: 3,
  underlyings: [
    '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    '0x55d398326f99059fF775485246999027B3197955',
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  ],
  beltLP: true,
  provider: 'belt',
}

const masterChef: Contract = {
  chain: 'bsc',
  address: '0xd4bbc80b9b102b77b21a06cb77e954049605e6c1',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBeltContracts(ctx, masterChef, [fourBelt, fourBeltV2])

  return {
    contracts: { sBELT, pools },
    revalidate: 60 * 60,
  }
}

const getBeltBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  return Promise.all([getBeltLpBalances(ctx, pools), getFarmBeltBalances(ctx, pools, masterChef)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sBELT: getBeltStakeBalance,
    pools: getBeltBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1652140800,
}
