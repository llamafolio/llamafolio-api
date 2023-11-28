import { getAMKTBalance } from '@adapters/alongside/ethereum/balance'
import { getAMKTStaker } from '@adapters/alongside/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vault: Contract = {
  chain: 'ethereum',
  address: '0xf3bcedab2998933c6aad1cb31430d8bab329dd8c',
}

const AMKT: Contract = {
  chain: 'ethereum',
  address: '0xf17a3fe536f8f7847f1385ec1bc967b2ca9cae8d',
}

export const getContracts = async (ctx: BaseContext) => {
  const staker = await getAMKTStaker(ctx, vault, AMKT)

  return {
    contracts: { staker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: (...args) => getAMKTBalance(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}
