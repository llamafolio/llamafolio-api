import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const sPRXY: Contract = {
  chain: 'polygon',
  address: '0x426ac20aa0ce165cccfb905fb917758731ffc20d',
  token: '0xab3D689C22a2Bb821f50A4Ff0F21A7980dCB8591',
}

export const getContracts = () => {
  return {
    contracts: { sPRXY },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sPRXY: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
