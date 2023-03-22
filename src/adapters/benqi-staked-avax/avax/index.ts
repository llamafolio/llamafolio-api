import { Balance, BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBenqiLockerBalances } from './locker'
import { getStakeBalances } from './stake'

const WAVAX: Contract = {
  name: 'Wrapped AVAX',
  chain: 'avax',
  address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  symbol: 'WAVAX ',
  decimals: 18,
}

const sAVAX: Contract = {
  name: 'Staked AVAX',
  chain: 'avax',
  address: '0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be',
  symbol: 'sAVAX ',
  decimals: 18,
  coingeckoId: 'benqi-liquid-staked-avax',
  category: 'stake',
  underlyings: [WAVAX],
}

export const getContracts = () => {
  return {
    contracts: { sAVAX },
  }
}

async function getBenqiBalances(ctx: BalancesContext, sAVAX: Contract): Promise<Balance[] | undefined> {
  const [stakeBalance, lockBalance] = await Promise.all([
    getStakeBalances(ctx, sAVAX),
    getBenqiLockerBalances(ctx, sAVAX),
  ])

  if (lockBalance) {
    return [stakeBalance, lockBalance]
  }

  return [stakeBalance]
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sAVAX: getBenqiBalances,
  })

  return {
    groups: [{ balances }],
  }
}
