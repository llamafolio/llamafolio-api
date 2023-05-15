import { getStaderFarmBalances } from '@adapters/stader/polygon/farm'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const MaticX: Contract = {
  chain: 'polygon',
  address: '0xfa68fb4628dff1028cfec22b4162fccd0d45efb6',
  decimals: 18,
  symbol: 'MaticX',
}

const maticXFarm: Contract = {
  chain: 'polygon',
  address: '0xfd225c9e6601c9d38d8f98d8731bf59efcf8c0e3',
  token: '0xfa68fb4628dff1028cfec22b4162fccd0d45efb6',
}

export const getContracts = () => {
  return {
    contracts: { MaticX, maticXFarm },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    MaticX: getSingleStakeBalance,
    maticXFarm: getStaderFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
