import { getThalesAMMv2Balance, getThalesAMMVaultBalances } from '@adapters/thales/common/market'
import { getThalesStakingBalance, getVeThalesBalance } from '@adapters/thales/common/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const thalesStaking: Contract = {
  chain: 'arbitrum',
  address: '0x160ca569999601bca06109d42d561d85d6bb4b57',
  token: '0xe85b662fe97e8562f4099d8a1d5a92d4b453bf30',
  rewards: ['0xe85b662fe97e8562f4099d8a1d5a92d4b453bf30'],
}

const veThales: Contract = {
  chain: 'arbitrum',
  address: '0x391a45f31c1837e3d837c23e05f42a098329d50d',
  token: '0xe85b662fe97e8562f4099d8a1d5a92d4b453bf30',
}

const thalesAMM_v2: Contract = {
  chain: 'arbitrum',
  address: '0xea4c2343fd3c239c23dd37dd3ee51aec84544735',
  token: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  decimals: 18,
}

const marketsAddresses: Contract[] = [
  {
    chain: 'arbitrum',
    address: '0x008a4e30a8b41781f5cb017b197aa9aa4cd53b46',
    token: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  },
]

export const getContracts = () => {
  return {
    contracts: { thalesStaking, veThales, thalesAMM_v2, marketsAddresses },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    thalesStaking: getThalesStakingBalance,
    veThales: getVeThalesBalance,
    thalesAMM_v2: getThalesAMMv2Balance,
    marketsAddresses: getThalesAMMVaultBalances,
  })

  return {
    groups: [{ balances }],
  }
}
