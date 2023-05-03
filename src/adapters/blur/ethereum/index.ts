import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'

const weth: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const blurPool: Contract = {
  chain: 'ethereum',
  address: '0x0000000000A39bb272e79075ade125fd351887Ac',
  underlyings: [weth],
  decimals: 18,
}

export const getContracts = () => {
  return {
    contracts: { blurPool },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    blurPool: getSingleStakeBalance,
  })

  return {
    groups: [
      {
        balances: balances.map((balance) => ({ ...balance, symbol: weth.symbol, category: 'stake' })),
      },
    ],
  }
}
