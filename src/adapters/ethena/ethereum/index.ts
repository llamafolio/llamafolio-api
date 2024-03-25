import { getEthenaFarmBalance, getEthenaStakeBalance } from '@adapters/ethena/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'ethereum',
  address: '0x9d39a5de30e57443bff2a8307a4256c8797a3497',
  underlyings: ['0x4c9edd5852cd905f086c759e8383e09bff1e68b3'],
}

const farmer: Contract = {
  chain: 'ethereum',
  address: '0x8707f238936c12c309bfc2b9959c35828acfc512',
  token: '0x4c9edd5852cd905f086c759e8383e09bff1e68b3',
}

export const getContracts = () => {
  return {
    contracts: { staker, farmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getEthenaStakeBalance,
    farmer: getEthenaFarmBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: undefined,
}
