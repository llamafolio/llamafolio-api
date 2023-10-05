import { getAuraFarmBalances } from '@adapters/aura/common/balance'
import { getAuraPools } from '@adapters/aura/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const auraStaker: Contract = {
  chain: 'gnosis',
  address: '0x4ea9317d90b61fc28c418c247ad0ca8939bbb0e9',
  token: '0x223738a747383d6F9f827d95964e4d8E8AC754cE',
}

const booster: Contract = {
  chain: 'gnosis',
  address: '0x98Ef32edd24e2c92525E59afc4475C1242a30184',
}

const vaultBAL: Contract = {
  chain: 'gnosis',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getAuraPools(ctx, booster, vaultBAL)

  return {
    contracts: { booster, pools, auraStaker },
    revalidate: 60 * 60,
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
