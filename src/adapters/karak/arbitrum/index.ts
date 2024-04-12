import { getKarakStakeBalances } from '@adapters/karak/common/balance'
import { getKarakTokens } from '@adapters/karak/common/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const supervisor: Contract = {
  chain: 'arbitrum',
  address: '0x399f22ae52a18382a67542b3de9bed52b7b9a4ad',
}

export const getContracts = async (ctx: BaseContext) => {
  const staker = await getKarakTokens(ctx, supervisor)
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getKarakStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1712620800,
}
