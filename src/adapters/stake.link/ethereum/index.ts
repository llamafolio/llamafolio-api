import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

import { getLinkStakesBalances } from './stake'

const stLink: Contract = {
  chain: 'ethereum',
  address: '0xb8b295df2cd735b15be5eb419517aa626fc43cd5',
  underlyings: ['0x514910771AF9Ca656af840dff83E8264EcF986CA'],
}

const stSDL: Contract = {
  chain: 'ethereum',
  address: '0xaef186611ec96427d161107ffe14bba8aa1c2284',
  underlyings: ['0xA95C5ebB86E0dE73B4fB8c47A45B792CFeA28C23'],
}

export const getContracts = () => {
  return {
    contracts: { stLink, stSDL },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stLink: getSingleStakeBalance,
    stSDL: getLinkStakesBalances,
  })

  return {
    groups: [{ balances }],
  }
}
