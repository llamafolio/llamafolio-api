import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  xTokenRewardsShare: {
    inputs: [],
    name: 'xTokenRewardsShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getStakingPosition: {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getStakingPosition',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'amountWithMultiplier', type: 'uint256' },
      { internalType: 'uint256', name: 'startLockTime', type: 'uint256' },
      { internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
      { internalType: 'uint256', name: 'lockMultiplier', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebtWETH', type: 'uint256' },
      { internalType: 'uint256', name: 'boostPoints', type: 'uint256' },
      { internalType: 'uint256', name: 'totalMultiplier', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingRewards: {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'pendingRewards',
    outputs: [
      { internalType: 'uint256', name: 'mainAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'wethAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BSX: Token = {
  chain: 'base',
  address: '0xd5046b976188eb40f6de40fb527f89c05b323385',
  name: 'BaseX',
  symbol: 'BSX',
  decimals: 18,
}

const xBSX: Token = {
  chain: 'base',
  address: '0xE4750593d1fC8E74b31549212899A72162f315Fa',
  symbol: 'xBSX',
  decimals: 18,
}

const BSWAP: Token = {
  chain: 'base',
  address: '0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9',
  symbol: 'BSWAP',
  decimals: 18,
}

const DECIMALS = 10000n

export async function getMasterChefPoolsNFTBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const userBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const tokenIdsRes = await multicall({
    ctx,
    calls: mapSuccessFilter(userBalances, (res) =>
      rangeBI(0n, res.output).map((idx) => ({ target: res.input.target, params: [ctx.address, idx] }) as const),
    ).flat(),
    abi: abi.tokenOfOwnerByIndex,
  })

  const groupedById = tokenIdsRes.reduce((acc: any, { input, output }) => {
    const address = input.target
    if (!acc[address]) acc[address] = []
    acc[address].push(output)
    return acc
  }, {})

  const tokenIdsById: any = Object.entries(groupedById).map(([address, tokensIds]) => ({ address, tokensIds }))

  const poolsWithTokens = pools
    .map((pool) => {
      const matchingToken = tokenIdsById.find(
        (token: any) => token.address.toLowerCase() === pool.address.toLowerCase(),
      )

      if (!matchingToken) return null
      return {
        ...pool,
        ...matchingToken,
      }
    })
    .filter(isNotNullish)

  const [userStakingBalanceOfsRes, userPendingRewardsRes, rewardsRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: poolsWithTokens.flatMap((pool: any) =>
        pool.tokensIds.map((id: bigint) => ({ target: pool.address, params: [id] }) as const),
      ),
      abi: abi.getStakingPosition,
    }),
    multicall({
      ctx,
      calls: poolsWithTokens.flatMap((pool: any) =>
        pool.tokensIds.map((id: bigint) => ({ target: pool.address, params: [id] }) as const),
      ),
      abi: abi.pendingRewards,
    }),
    multicall({
      ctx,
      calls: poolsWithTokens.flatMap((pool: any) => ({ target: pool.address }) as const),
      abi: abi.xTokenRewardsShare,
    }),
  ])

  for (let index = 0; index < poolsWithTokens.length; index++) {
    const poolsWithToken = poolsWithTokens[index]
    const userStakingBalanceOfRes = userStakingBalanceOfsRes[index]
    const userPendingRewardRes = userPendingRewardsRes[index]
    const rewardsRateRes = rewardsRatesRes[index]

    if (!userStakingBalanceOfRes.success || !userPendingRewardRes.success || !rewardsRateRes.success) {
      continue
    }

    const [amount] = userStakingBalanceOfRes.output
    const [bsxRewards, bswapRewards] = userPendingRewardRes.output

    balances.push({
      ...poolsWithToken,
      amount,
      rewards: [
        { ...xBSX, amount: (bsxRewards * rewardsRateRes.output) / DECIMALS },
        { ...BSX, amount: bsxRewards - (bsxRewards * rewardsRateRes.output) / DECIMALS },
        { ...BSWAP, amount: bswapRewards },
      ],
      category: 'farm',
    })
  }

  return getUnderlyingBalances(ctx, balances, { getAddress: (balance) => balance.lpToken! })
}
