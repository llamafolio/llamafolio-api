import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getStakeBalance } from '../common/stake'

const USV: Token = {
  chain: 'ethereum',
  address: '0x88536C9B2C4701b8dB824e6A16829D5B5Eb84440',
  symbol: 'USV',
  decimals: 9,
}

const sUSV: Contract = {
  name: 'Staked Universal Store of Value',
  chain: 'ethereum',
  address: '0x0Fef13242390F6bB115Df09D8b5FdC4Bc7D16693',
  symbol: 'sUSV',
  decimals: 9,
  underlyings: [USV],
}

export const getContracts = () => {
  return {
    contracts: { sUSV },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sUSV: getStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
