import { getJAuraFarmBalance } from '@adapters/jones-dao/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const wjAURA: Contract = {
  chain: 'ethereum',
  address: '0x198d7387fa97a73f05b8578cdeff8f2a1f34cd1f',
  underlyings: ['0xC0c293ce456fF0ED870ADd98a0828Dd4d2903DBF'],
}

export const getContracts = () => {
  return {
    contracts: { wjAURA },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    wjAURA: getJAuraFarmBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1681603200,
}
