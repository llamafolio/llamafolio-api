import type { AdapterConfig } from "@lib/adapter";import { getMorphoBalances } from '@adapters/morpho-blue/ethereum/balance'
import { getMorphoContracts } from '@adapters/morpho-blue/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const bbUSDC: Contract = {
  chain: 'ethereum',
  address: '0x186514400e52270cef3d80e1c6f8d10a75d47344',
}

const steakUSDC: Contract = {
  chain: 'ethereum',
  address: '0xbeef01735c132ada46aa9aa4c54623caa92a64cb',
}

const bbETH: Contract = {
  chain: 'ethereum',
  address: '0x38989bba00bdf8181f4082995b3deae96163ac5d',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getMorphoContracts(ctx, [bbUSDC, steakUSDC, bbETH])

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getMorphoBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1705190400,
                  }
                  