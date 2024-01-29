import type { AdapterConfig } from "@lib/adapter";import { getAzuroLpBalances } from '@adapters/azuro/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const managers: Contract[] = [
  {
    chain: 'gnosis',
    address: '0x204e7371ade792c5c006fb52711c50a7efc843ed',
    token: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
  },
  {
    chain: 'gnosis',
    address: '0xac004b512c33d029cf23abf04513f1f380b3fd0a',
    token: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
  },
]

export const getContracts = () => {
  return {
    contracts: { managers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    managers: getAzuroLpBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1657670400,
                  }
                  