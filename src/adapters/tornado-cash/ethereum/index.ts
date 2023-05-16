import { getTornadoStakeBalances } from '@adapters/tornado-cash/ethereum/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'ethereum',
  address: '0x5efda50f22d34f262c29268506c5fa42cb56a1ce',
  token: '0x77777FeDdddFfC19Ff86DB637967013e6C6A116C',
  rewarder: '0x2FC93484614a34f26F7970CBB94615bA109BB4bf',
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getTornadoStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
