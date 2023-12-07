import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xec2432a227440139ddf1044c3fea7ae03203933e',
  token: '0x5283D291DBCF85356A21bA090E6db59121208b44',
}

const blurPool: Contract = {
  chain: 'ethereum',
  address: '0x0000000000A39bb272e79075ade125fd351887Ac',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}

export const getContracts = () => {
  return {
    contracts: { blurPool, staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    blurPool: getSingleStakeBalance,
    staker: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
