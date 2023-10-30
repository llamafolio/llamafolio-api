import type { Balance, BalancesContext, Contract, RewardBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getMarketsBalances } from '@lib/compound/v2/market'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  getOutstandingRewardsForUser: {
    inputs: [
      { internalType: 'contract MToken', name: '_mToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getOutstandingRewardsForUser',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'emissionToken', type: 'address' },
          { internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'supplySide', type: 'uint256' },
          { internalType: 'uint256', name: 'borrowSide', type: 'uint256' },
        ],
        internalType: 'struct MultiRewardDistributorCommon.RewardInfo[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewardAccrued: {
    constant: true,
    inputs: [
      { internalType: 'uint8', name: '', type: 'uint8' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'rewardAccrued',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WELL: Token = {
  chain: 'moonbeam',
  address: '0x511aB53F793683763E5a8829738301368a2411E3',
  decimals: 18,
  symbol: 'WELL',
}

const GLMR: Token = {
  chain: 'moonbeam',
  address: '0xacc15dc74880c9944775448304b263d191c6077f',
  decimals: 18,
  symbol: 'GLMR',
}

export async function getMoonwellMarketsBalances(
  ctx: BalancesContext,
  markets: Contract[],
  comptroller: Contract,
  rewardDistributor?: Contract,
): Promise<Balance[] | undefined> {
  const marketsBalances = (await getMarketsBalances(ctx, markets)).flat()

  const rewardsFunctionMap: { [key: string]: () => Promise<Balance[] | undefined> } = {
    base: () => getMoonwellBaseRewards(ctx, marketsBalances, rewardDistributor),
    moonbeam: () => getMoonwellMBRewards(ctx, marketsBalances, [WELL, GLMR], comptroller),
  }

  const rewardsFunction = rewardsFunctionMap[ctx.chain]

  if (rewardsFunction) {
    return rewardsFunction()
  }

  return undefined
}

async function getMoonwellBaseRewards(
  ctx: BalancesContext,
  markets: Balance[],
  rewardDistributor?: Contract,
): Promise<Balance[] | undefined> {
  if (!rewardDistributor) return

  const lendMarkets = markets.filter((market) => market.category === 'lend')
  const borrowMarkets = markets.filter((market) => market.category === 'borrow')

  const rewardLendMarketsRes = await multicall({
    ctx,
    calls: lendMarkets.map(
      (market) => ({ target: rewardDistributor.address, params: [market.address, ctx.address] }) as const,
    ),
    abi: abi.getOutstandingRewardsForUser,
  })

  const lendRewards = mapSuccessFilter(rewardLendMarketsRes, (res, idx) => {
    const reward = lendMarkets[idx].rewards?.[0] as Contract
    const { supplySide } = res.output[0]

    if (!reward) return null

    return {
      ...lendMarkets[idx],
      rewards: [{ ...reward, amount: supplySide }],
    }
  }).filter(isNotNullish)

  return [...lendRewards, ...borrowMarkets]
}

async function getMoonwellMBRewards(
  ctx: BalancesContext,
  markets: Balance[],
  rewards: Token[],
  comptroller: Contract,
): Promise<Balance[]> {
  const userRewardsRes = await multicall({
    ctx,
    calls: rewards.map((_, idx) => ({ target: comptroller.address, params: [idx, ctx.address] }) as const),
    abi: abi.rewardAccrued,
  })

  const rewardBalances: RewardBalance[] = mapSuccessFilter(userRewardsRes, (res, idx) => ({
    ...rewards[idx],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }))

  return [...markets, ...rewardBalances]
}
