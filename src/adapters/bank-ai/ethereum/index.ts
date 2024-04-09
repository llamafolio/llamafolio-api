import { getBankAiLockBalance } from '@adapters/bank-ai/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const locker: Contract = {
  chain: 'ethereum',
  address: '0x140fae0a43190a3d0cbf8dbdb347200eb84e81d1',
  token: '0xf19693068120185664E211F619c4F0530cE07088',
}

export const getContracts = () => {
  return {
    contracts: { locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: getBankAiLockBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1711152000,
}
