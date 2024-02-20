import { getEqPoolBalances } from '@adapters/equilibria/common/balance'
import { getEqLockerBalance, getxEqbLockerBalances } from '@adapters/equilibria/common/lock'
import { getEqPoolsContracts } from '@adapters/equilibria/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const locker: Contract = {
  chain: 'bsc',
  address: '0x0140dE476f49B6B42f7b73612b6dc317aB91D3BC',
  token: '0x374Ca32fd7934c5d43240E1e73fa9B2283468609',
  rewards: ['0x5fec857958FBDe28e45F779DAf5aBa8FDd5bD6BC'],
}

const xEQB: Contract = {
  chain: 'bsc',
  address: '0xfE80D611c6403f70e5B1b9B722D2B3510B740B2B',
  underlyings: ['0x374Ca32fd7934c5d43240E1e73fa9B2283468609'],
}

const masterChef: Contract = {
  chain: 'bsc',
  address: '0x4d32c8ff2facc771ec7efc70d6a8468bc30c26bf',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getEqPoolsContracts(ctx, masterChef)

  return {
    contracts: { pools, locker, xEQB },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getEqPoolBalances,
    locker: getEqLockerBalance,
    xEQB: getxEqbLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1694390400,
}
