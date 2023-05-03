import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getERC20BalanceOf } from '@lib/erc20'
import type { Token } from '@lib/token'

const lockerGnosis: Contract = {
  chain: 'ethereum',
  address: '0x4f8ad938eba0cd19155a835f617317a6e788c868',
  decimals: 18,
  symbol: 'LGNO',
  underlyings: ['0x6810e776880C02933D47DB1b9fc05908e5386b96'],
}

export const getContracts = () => {
  return {
    contracts: { lockerGnosis },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lockerGnosis: (ctx, lockerGnosis) => getERC20BalanceOf(ctx, [lockerGnosis] as Token[]),
  })

  return {
    // Lock end is an universal timestamp for all users who have lock on gnosis-protocol-v1, and which corresponds to the deposit deadline (1644944444) + 1 year of lock duration (31536000)
    groups: [{ balances: balances.map((balance) => ({ ...balance, category: 'lock', unlockAt: 1676480444 })) }],
  }
}
