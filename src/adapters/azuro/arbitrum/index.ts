import { getAzuroLpBalances } from '@adapters/azuro/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const managers: Contract[] = [
  {
    chain: 'arbitrum',
    address: '0x20513ba6a4717c67e14291331bc99dd2ace90038',
    token: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
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
