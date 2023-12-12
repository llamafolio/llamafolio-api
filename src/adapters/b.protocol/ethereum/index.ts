import { getBprotocolFarmBalance } from '@adapters/b.protocol/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmer: Contract = {
  chain: 'ethereum',
  address: '0x00ff66ab8699aafa050ee5ef5041d1503aa0849a',
  token: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
  stabilityPool: '0x66017D22b0f8556afDd19FC67041899Eb65a21bb',
}

export const getContracts = () => {
  return {
    contracts: { farmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmer: getBprotocolFarmBalance,
  })

  return {
    groups: [{ balances }],
  }
}
