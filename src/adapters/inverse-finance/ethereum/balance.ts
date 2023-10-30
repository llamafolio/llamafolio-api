import type { Balance, BalancesContext, Contract, RewardBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { COMPOUND_ABI, getMarketsBalances } from '@lib/compound/v2/market'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  compAccrued: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'compAccrued',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const INV: Token = {
  chain: 'ethereum',
  address: '0x41d5d79431a913c4ae7d69a668ecdfe5ff9dfb68',
  decimals: 18,
  symbol: 'INV',
}

export async function getInverseLendingBalances(ctx: BalancesContext, markets: Contract[], comptroller: Contract) {
  const [marketsBalancesRes, xinvBalance, marketsRewardsRes] = await Promise.all([
    getMarketsBalances(ctx, markets),
    invLendBalance(
      ctx,
      markets.find((market) => market.address.toLowerCase() === '0x1637e4e9941d55703a7a5e7807d6ada3f7dcd61b'),
    ),
    call({ ctx, target: comptroller.address, params: [ctx.address], abi: abi.compAccrued }),
  ])

  const rewardBalance: RewardBalance = {
    ...INV,
    amount: marketsRewardsRes,
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }

  return [...marketsBalancesRes.flat(), ...(xinvBalance !== undefined ? [xinvBalance] : []), rewardBalance]
}

async function invLendBalance(ctx: BalancesContext, XINV?: Contract): Promise<Balance | undefined> {
  if (!XINV) return

  const [cTokensBalance, cTokensExchange] = await Promise.all([
    call({ ctx, target: XINV.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: XINV.address, abi: COMPOUND_ABI.exchangeRateCurrent }),
  ])

  const pricePerFullShare = cTokensExchange / 10n ** BigInt(8 + 2)

  return {
    ...XINV,
    amount: (cTokensBalance * pricePerFullShare) / 10n ** BigInt(8),
    underlyings: [{ ...INV, amount: (cTokensBalance * pricePerFullShare) / 10n ** BigInt(8) }],
    rewards: undefined,
    category: 'lend',
  }
}
