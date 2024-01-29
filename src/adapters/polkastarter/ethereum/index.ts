import type { AdapterConfig } from "@lib/adapter";import { getPolkaLockedBalance } from '@adapters/polkastarter/common/lock'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const locker: Contract = {
  chain: 'ethereum',
  address: '0xc24a365a870821eb83fd216c9596edd89479d8d7',
  token: '0x83e6f1E41cdd28eAcEB20Cb649155049Fac3D5Aa',
}

export const getContracts = () => {
  return {
    contracts: { locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: getPolkaLockedBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1640131200,
                  }
                  