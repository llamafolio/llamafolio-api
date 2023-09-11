import { getPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  claimable_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      {
        name: '_user',
        type: 'address',
      },
      {
        name: '_reward_token',
        type: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    gas: 26704,
  },
  getPoolTokenInfo: {
    inputs: [
      { internalType: 'bytes32', name: 'poolId', type: 'bytes32' },
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
    ],
    name: 'getPoolTokenInfo',
    outputs: [
      { internalType: 'uint256', name: 'cash', type: 'uint256' },
      { internalType: 'uint256', name: 'managed', type: 'uint256' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
      { internalType: 'address', name: 'assetManager', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getActualSupply: {
    inputs: [],
    name: 'getActualSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const metaRegistry: Contract = {
  name: 'Curve Metaregistry',
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

const vault: Contract = {
  chain: 'ethereum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

export async function getStakeDaoCurveBalances(
  ctx: BalancesContext,
  pools: Contract[],
): Promise<Balance[] | undefined> {
  const poolsBalances = await getPoolsBalances(
    ctx,
    pools.map((pool) => ({ ...pool, lpToken: pool.token })),
    metaRegistry,
  )

  if (!poolsBalances) {
    return
  }

  const pendingRewardsRes = await multicall({
    ctx,
    calls: poolsBalances.flatMap((pool) =>
      pool.rewards!.map((reward: any) => ({ target: pool.address, params: [ctx.address, reward.address] }) as const),
    ),
    abi: abi.claimable_reward,
  })

  let balanceOfIdx = 0
  for (let poolIdx = 0; poolIdx < poolsBalances.length; poolIdx++) {
    const poolsBalance = poolsBalances[poolIdx]
    const rewards = poolsBalance.rewards!

    poolsBalance.category = 'farm'

    rewards.forEach((reward) => {
      reward.amount = pendingRewardsRes[balanceOfIdx].success ? pendingRewardsRes[balanceOfIdx].output! : 0n
      balanceOfIdx++
    })
  }

  return poolsBalances
}

export async function getStakeDaoBalBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalances, totalSuppliesRes, poolTokensRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.token! }) as const),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: vault.address, params: [pool.infos.poolId] }) as const),
      abi: abi.getPoolTokens,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Balance[]
    const userBalance = userBalances[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const poolTokenRes = poolTokensRes[poolIdx]

    if (
      !underlyings ||
      !userBalance.success ||
      !totalSupplyRes.success ||
      !poolTokenRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const balance: Balance = {
      ...pool,
      amount: userBalance.output,
      underlyings,
      rewards,
      category: 'farm',
    }

    const detailedUnderlyings: Contract[] = []

    for (let idx = 0; idx < underlyings.length; idx++) {
      const underlying = underlyings[idx]

      if (underlying.address.toLowerCase() === balance.token?.toLowerCase()) {
        continue
      }

      const [_tokens, balances] = poolTokenRes.output
      const underlyingBalancesOf = balances[idx]

      underlying.amount = (balance.amount * underlyingBalancesOf) / totalSupplyRes.output

      if (!underlying.underlyings) {
        detailedUnderlyings.push(balance.underlyings![idx])
        continue
      }

      const unwrapUnderlyings = await unwrappedUnderlyings(ctx, underlying)
      detailedUnderlyings.push(...unwrapUnderlyings)
    }

    balance.underlyings = detailedUnderlyings?.filter((underlying) => underlying.address !== balance.address)
    balances.push(balance)
  }

  return balances
}

const unwrappedUnderlyings = async (ctx: BalancesContext, underlying: Contract) => {
  const unwrappedUnderlyings: Contract[] = []

  const [totalSuppliesRes, poolTokensRes] = await Promise.all([
    call({
      ctx,
      target: underlying.address,
      abi: erc20Abi.totalSupply,
    }),
    call({
      ctx,
      target: vault.address,
      params: [underlying.id],
      abi: abi.getPoolTokens,
    }),
  ])

  underlying.underlyings!.forEach((token: any, idx) => {
    const [_tokens, balances] = poolTokensRes
    const underlyingBalancesOf = balances[idx]

    token.amount = (underlying.amount * underlyingBalancesOf) / totalSuppliesRes
    unwrappedUnderlyings.push(token)
  })

  return unwrappedUnderlyings
}

export async function getStakeDaoOldBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const poolBalances: Balance[] = []

  const [balancesOfsRes, pendingsRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.flatMap((pool) =>
        pool.rewards!.map((reward: any) => ({ target: pool.address, params: [ctx.address, reward.address] }) as const),
      ),
      abi: abi.claimable_reward,
    }),
  ])

  let balanceOfIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Balance[]
    const balanceOfRes = balancesOfsRes[poolIdx]

    if (!underlyings || !rewards || !balanceOfRes.success) {
      continue
    }

    rewards.forEach((reward) => {
      reward.amount = pendingsRewardsRes[balanceOfIdx].success ? pendingsRewardsRes[balanceOfIdx].output! : 0n
      balanceOfIdx++
    })

    poolBalances.push({ ...pool, amount: balanceOfRes.output, underlyings, rewards, category: 'farm' })
  }

  return poolBalances
}
