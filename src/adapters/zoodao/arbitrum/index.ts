import { getZooBalances } from '@adapters/zoodao/arbitrum/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const ZooLP: Contract = {
  chain: 'arbitrum',
  address: '0x96ebfd5dfabf5e94f55940fc1872f39031fb332c',
  token: '0x2517cd42eE966862e8EcaAc9Abd1CcD272d897b6',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPairsDetails(ctx, [ZooLP], { getAddress: (contract) => contract.token! })
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getZooBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1706140800,
}
