import { getAuraFarmBalances } from '@adapters/aura/common/balance'
import { getAuraPools } from '@adapters/aura/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const booster: Contract = {
  chain: 'optimism',
  address: '0x98ef32edd24e2c92525e59afc4475c1242a30184',
}

const vaultBAL: Contract = {
  chain: 'optimism',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getAuraPools(ctx, booster, vaultBAL)

  return {
    contracts: { booster, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getAuraFarmBalances(...args, vaultBAL),
  })

  return {
    groups: [{ balances }],
  }
}
