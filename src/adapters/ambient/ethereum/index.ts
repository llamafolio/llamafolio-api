import { getAmbienStakeBalances, getAmbientLpBalances } from '@adapters/ambient/ethereum/balance'
import { getAmbientPoolTokens } from '@adapters/ambient/ethereum/pool'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vault: Contract = {
  chain: 'ethereum',
  address: '0xaaaaaaaaa24eeeb8d57d431224f73832bc34f688',
}

const crocQuery: Contract = {
  chain: 'ethereum',
  address: '0xc2e1f740E11294C64adE66f69a1271C5B32004c8',
}

export const getContracts = async (ctx: BaseContext) => {
  vault.assets = await getAmbientPoolTokens(ctx)

  return {
    contracts: { vault, crocQuery },
  }
}

async function ambientBalances(ctx: BalancesContext, vault: Contract) {
  return Promise.all([getAmbienStakeBalances(ctx, vault, crocQuery), getAmbientLpBalances(ctx, vault, crocQuery)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vault: ambientBalances,
  })

  return {
    groups: [{ balances }],
  }
}
