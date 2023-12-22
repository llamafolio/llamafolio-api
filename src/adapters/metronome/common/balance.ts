import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'

const abi = {
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokensAccruedOf: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'tokensAccruedOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMetronomeBalances(
  ctx: BalancesContext,
  markets: Contract[],
  rewarder?: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, pricePerSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => (market.token ? { target: market.token } : null)),
      abi: abi.pricePerShare,
    }),
  ])

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    const market = markets[marketIdx]
    const underlying = market.underlyings?.[0] as Contract
    const balanceOfRes = balanceOfsRes[marketIdx]
    const pricePerShareRes = pricePerSharesRes[marketIdx]
    const pricePerShare = pricePerShareRes.success ? parseFloatBI(pricePerShareRes.output, underlying.decimals!) : 1

    if (!underlying || !balanceOfRes.success || !pricePerShare || balanceOfRes.output === 0n) {
      continue
    }

    balances.push({
      ...(market as Balance),
      amount: BigInt(Number(balanceOfRes.output) * pricePerShare),
      underlyings: [underlying],
      rewards: undefined,
    })
  }

  if (rewarder) {
    const incentiveRewardBalance = await getIncentivesRewards(ctx, rewarder)
    return [...balances, incentiveRewardBalance]
  }

  return balances
}

async function getIncentivesRewards(ctx: BalancesContext, rewarder: Contract): Promise<Balance> {
  const incentiveReward = await call({
    ctx,
    target: rewarder.address,
    params: [ctx.address],
    abi: abi.tokensAccruedOf,
  })

  return {
    ...(rewarder.underlyings?.[0] as Balance),
    amount: incentiveReward,
    category: 'reward',
  }
}
