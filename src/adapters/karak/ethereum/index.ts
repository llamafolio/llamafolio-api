import { getKarakStakeBalances } from '@adapters/karak/common/balance'
import { getKarakTokens } from '@adapters/karak/common/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const supervisor: Contract = {
  chain: 'ethereum',
  address: '0x54e44dbb92dba848ace27f44c0cb4268981ef1cc',
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
